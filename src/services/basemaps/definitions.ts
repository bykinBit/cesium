let hasLoggedTiandituTerrainSkip = false;

import type { BasemapEnv, BasemapHook, BasemapHookContext, BasemapHookResult, BasemapOption } from './types';

const DEFAULT_PROXY_PREFIXES: Required<NonNullable<BasemapEnv['proxyPrefixes']>> = {
    tianditu: '/td',
    mapbox: '/mapbox',
    gaode: '/gaode',
    tencent: '/tencent',
    baidu: '/baidu',
};

const DEFAULT_ENV: Required<BasemapEnv> = {
    tiandituToken: '',
    enableTiandituTerrain: false,
    mapboxToken: '',
    gaodeKey: '',
    tencentKey: '',
    baiduAk: '',
    proxyPrefixes: DEFAULT_PROXY_PREFIXES,
};

export const normalizeBasemapEnv = (env?: BasemapEnv): Required<BasemapEnv> => ({
    ...DEFAULT_ENV,
    ...(env ?? {}),
    proxyPrefixes: { ...DEFAULT_PROXY_PREFIXES, ...(env?.proxyPrefixes ?? {}) },
});

const buildUrl = (base: string, path: string) => {
    if (!base) return path;
    if (base.endsWith('/')) {
        return `${base.replace(/\/$/, '')}${path}`;
    }
    return `${base}${path}`;
};

type ImageryCreator = {
    id: string;
    alpha?: number;
    show?: boolean;
    create: (ctx: BasemapHookContext) => Promise<import('cesium').ImageryProvider | null>;
};

const applyImageryCreators = async (ctx: BasemapHookContext, creators: ImageryCreator[]) => {
    const layers: import('cesium').ImageryLayer[] = [];
    const { viewer } = ctx;

    for (const creator of creators) {
        try {
            const provider = await creator.create(ctx);
            if (!provider) continue;
            const layer = viewer.imageryLayers.addImageryProvider(provider);
            if (creator.alpha !== undefined) layer.alpha = creator.alpha;
            if (creator.show !== undefined) layer.show = creator.show;
            layers.push(layer);
        } catch (error) {
            console.warn(`Failed to create imagery layer '${creator.id}'`, error);
        }
    }

    return {
        layers,
        release: () => {
            for (const layer of layers) {
                try {
                    viewer.imageryLayers.remove(layer, true);
                } catch (error) {
                    console.warn('Failed to remove imagery layer', error);
                }
            }
        },
    };
};

const setTerrainProvider = async (
    ctx: BasemapHookContext,
    factory: ((ctx: BasemapHookContext) => Promise<import('cesium').TerrainProvider | null>) | null,
) => {
    const { viewer, Cesium } = ctx;
    const previous = viewer.terrainProvider;

    if (!factory) {
        viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        return {
            release: () => {
                viewer.terrainProvider = previous;
            },
        };
    }

    try {
        const provider = await factory(ctx);
        if (provider) {
            viewer.terrainProvider = provider;
            return {
                release: () => {
                    viewer.terrainProvider = previous;
                },
            };
        }
    } catch (error) {
        console.warn('Failed to initialise terrain provider, falling back to ellipsoid.', error);
    }

    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    return {
        release: () => {
            viewer.terrainProvider = previous;
        },
    };
};

const createTiandituImagery = async (ctx: BasemapHookContext, layer: string, maximumLevel = 18) => {
    const { Cesium, env } = ctx;
    return new Cesium.UrlTemplateImageryProvider({
        url: buildUrl(env.proxyPrefixes.tianditu ?? '', `/DataServer?T=${layer}&x={x}&y={y}&l={z}&tk=${env.tiandituToken}`),
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel,
    });
};

const createTiandituTerrain = async (ctx: BasemapHookContext) => {
    const { Cesium, env } = ctx;

    const createFallback = async (reason?: string, error?: unknown, options?: { silent?: boolean }) => {
        if (!options?.silent && reason && !hasLoggedTiandituTerrainSkip) {
            console.info(reason, error ?? '');
            hasLoggedTiandituTerrainSkip = true;
        }
        if (typeof Cesium.createWorldTerrainAsync === 'function') {
            try {
                return await Cesium.createWorldTerrainAsync();
            } catch (worldTerrainError) {
                console.warn('Falling back to ellipsoid terrain because world terrain failed.', worldTerrainError);
            }
        }
        return new Cesium.EllipsoidTerrainProvider();
    };

    if (!env.enableTiandituTerrain) {
        return createFallback('Tianditu terrain disabled by configuration.', undefined, { silent: true });
    }

    return createFallback('Tianditu terrain is currently not supported due to CORS limitations.', undefined, { silent: true });
};

const createMapboxImagery = async (ctx: BasemapHookContext, styleId: string) => {
    const { Cesium, env } = ctx;
    if (!env.mapboxToken) {
        console.warn('Mapbox token is missing.');
        return null;
    }
    return new Cesium.UrlTemplateImageryProvider({
        url: buildUrl(env.proxyPrefixes.mapbox ?? '', `/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${env.mapboxToken}`),
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 19,
    });
};

const createGaodeImagery = async (ctx: BasemapHookContext, style: 'vector' | 'satellite' = 'vector') => {
    const { Cesium, env } = ctx;
    const tilingScheme = new Cesium.WebMercatorTilingScheme();

    const styleCode = style === 'satellite' ? '6' : '6';
    const queryParts = [`style=${styleCode}`, 'x={x}', 'y={y}', 'z={z}'];

    if (env.gaodeKey) {
        queryParts.push(`key=${env.gaodeKey}`);
    }

    const query = queryParts.join('&');

    const templateUrl = env.proxyPrefixes.gaode
        ? buildUrl(env.proxyPrefixes.gaode ?? '', `/appmaptile?${query}`)
        : `https://webst0{s}.is.autonavi.com/appmaptile?${query}`;

    return new Cesium.UrlTemplateImageryProvider({
        url: templateUrl,
        subdomains: ["1", "2", "3", "4"],
        tilingScheme,
        maximumLevel: 18,
    });
};

const createGaodeRoadOverlay = async (ctx: BasemapHookContext) => {
    const { Cesium, env } = ctx;
    const tilingScheme = new Cesium.WebMercatorTilingScheme();

    const queryParts = ['style=8','x={x}', 'y={y}', 'z={z}', 'lang=zh_cn', 'size=1'];

    if (env.gaodeKey) {
        queryParts.push(`key=${env.gaodeKey}`);
    }

    const query = queryParts.join('&');

    const templateUrl = env.proxyPrefixes.gaode
        ? buildUrl(env.proxyPrefixes.gaode ?? '', `/appmaptile?${query}`)
        : `https://webst02.is.autonavi.com/appmaptile?${query}`;

    return new Cesium.UrlTemplateImageryProvider({
        url: templateUrl,
        subdomains: ["1", "2", "3", "4"],
        tilingScheme,
        maximumLevel: 18,
    });
};

const createTencentImagery = async (ctx: BasemapHookContext, type: 'vector' | 'satellite' = 'vector') => {
    const { Cesium, env } = ctx;
    if (!env.tencentKey) {
        console.warn('Tencent key is missing.');
        return null;
    }
    const styleId = type === 'satellite' ? 'sate' : 'vector';
    const query = `z={z}&x={x}&y={y}&type=tile&style=${styleId}&key=${env.tencentKey}`;
    return new Cesium.UrlTemplateImageryProvider({
        url: buildUrl(env.proxyPrefixes.tencent ?? '', `/rtt/?${query}`),
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18,
    });
};

const createBaiduImagery = async (ctx: BasemapHookContext, style = 'midnight') => {
    const { Cesium, env } = ctx;
    if (!env.baiduAk) {
        console.warn('Baidu AK is missing.');
        return null;
    }

    const template = env.proxyPrefixes.baidu
        ? buildUrl(env.proxyPrefixes.baidu ?? '', `/customimage/tile?x={x}&y={y}&z={z}&scale=1&customid=${style}&ak=${env.baiduAk}`)
        : `https://api.map.baidu.com/customimage/tile?x={x}&y={y}&z={z}&scale=1&customid=${style}&ak=${env.baiduAk}`;

    return new Cesium.UrlTemplateImageryProvider({
        url: template,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 18,
    });
};

const createBasemapHook = (
    imageryCreators: ImageryCreator[],
    terrainFactory: ((ctx: BasemapHookContext) => Promise<import('cesium').TerrainProvider | null>) | null,
): BasemapHook => {
    return async (ctx) => {
        const { release: releaseImagery } = await applyImageryCreators(ctx, imageryCreators);
        const { release: releaseTerrain } = await setTerrainProvider(ctx, terrainFactory);

        const release = () => {
            releaseImagery();
            releaseTerrain();
        };

        return { release };
    };
};

const basemapEntries: Array<{ option: BasemapOption; hook: BasemapHook }> = [
    {
        option: { id: 'tianditu-imagery', label: 'Tianditu Imagery', group: 'China' },
        hook: createBasemapHook(
            [
                { id: 'td-img', create: (ctx) => createTiandituImagery(ctx, 'img_w') },
                { id: 'td-ibo', create: (ctx) => createTiandituImagery(ctx, 'ibo_w', 12) },
            ],
            createTiandituTerrain,
        ),
    },
    {
        option: { id: 'mapbox-streets', label: 'Mapbox Streets', group: 'Global' },
        hook: createBasemapHook(
            [
                { id: 'mapbox-streets', create: (ctx) => createMapboxImagery(ctx, 'mapbox/streets-v11') },
            ],
            async ({ Cesium }) => {
                if (typeof Cesium.createWorldTerrainAsync === 'function') {
                    return Cesium.createWorldTerrainAsync();
                }
                return new Cesium.EllipsoidTerrainProvider();
            },
        ),
    },
    {
        option: { id: 'gaode-vector', label: 'Gaode Vector', group: 'China' },
        hook: createBasemapHook(
            [
                { id: 'gaode-vector-base', create: (ctx) => createGaodeImagery(ctx, 'vector') },
                { id: 'gaode-vector-road', create: (ctx) => createGaodeRoadOverlay(ctx) },
            ],
            async ({ Cesium }) => new Cesium.EllipsoidTerrainProvider(),
        ),
    },
    {
        option: { id: 'baidu-satellite', label: 'Baidu Imagery', group: 'China' },
        hook: createBasemapHook(
            [
                { id: 'baidu-satellite', create: (ctx) => createBaiduImagery(ctx, 'midnight') },
            ],
            async ({ Cesium }) => new Cesium.EllipsoidTerrainProvider(),
        ),
    },
    {
        option: { id: 'tencent-vector', label: 'Tencent Vector', group: 'China' },
        hook: createBasemapHook(
            [
                { id: 'tencent-vector', create: (ctx) => createTencentImagery(ctx, 'vector') },
            ],
            async ({ Cesium }) => new Cesium.EllipsoidTerrainProvider(),
        ),
    },
];

export const basemapOptions: BasemapOption[] = basemapEntries.map((entry) => entry.option);
export const basemapHookMap: Record<string, BasemapHook> = basemapEntries.reduce((acc, entry) => {
    acc[entry.option.id] = entry.hook;
    return acc;
}, {} as Record<string, BasemapHook>);

