export type BasemapLayerKind = "imagery" | "terrain" | "overlay";

export interface BasemapEnv {
    tiandituToken?: string;
    enableTiandituTerrain?: boolean;
    mapboxToken?: string;
    gaodeKey?: string;
    tencentKey?: string;
    baiduAk?: string;
    proxyPrefixes?: Partial<Record<'tianditu' | 'mapbox' | 'gaode' | 'tencent' | 'baidu', string>>;
}

export interface BasemapHookContext {
    Cesium: typeof import('cesium');
    viewer: import('cesium').Viewer;
    env: Required<BasemapEnv>;
}

export interface BasemapHookResult {
    release: () => void;
}

export type BasemapHook = (context: BasemapHookContext) => Promise<BasemapHookResult>;

export interface BasemapOption {
    id: string;
    label: string;
    group?: string;
    description?: string;
}
