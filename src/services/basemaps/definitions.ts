let hasLoggedTiandituTerrainSkip = false;

import type { BasemapEnv, BasemapHook, BasemapHookContext, BasemapHookResult, BasemapOption } from './types';
import { BaiduImageryProvider } from './BaiduImageryProvider';

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

const createBaiduImagery = async (ctx: BasemapHookContext) => {
    const { Cesium, env } = ctx;

    const template = env.proxyPrefixes.baidu
        ? buildUrl(env.proxyPrefixes.baidu ?? '', `/starpic/?qt=satepc&u=x={x};y={y};z={z};v=009;type=sate&fm=46&app=webearth2&udt=20250928`)
        : 'https://maponline1.bdimg.com/starpic/?qt=satepc&u=x={x};y={y};z={z};v=009;type=sate&fm=46&app=webearth2&udt=20250928';

    return new BaiduImageryProvider({ Cesium, url: template, minimumLevel: 3, maximumLevel: 19, zoomOffset: 3 });
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
        option: { id: 'baidu-satellite', label: 'Baidu Imagery', group: 'China' },
        hook: createBasemapHook(
            [
                { id: 'baidu-satellite', create: (ctx) => createBaiduImagery(ctx) },
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
