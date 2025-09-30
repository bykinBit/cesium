/// <reference path="../types/env.d.ts" />

export const mapTokens = {
    tiandituToken: import.meta.env.VITE_TDT_TOKEN ?? '',
    enableTiandituTerrain: (import.meta.env.VITE_ENABLE_TDT_TERRAIN ?? 'false') === 'true',
    mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN ?? '',
    gaodeKey: import.meta.env.VITE_GAODE_KEY ?? '',
    tencentKey: import.meta.env.VITE_TENCENT_KEY ?? '',
    baiduAk: import.meta.env.VITE_BAIDU_AK ?? '',
};

export const proxyPrefixes = {
    baidu: import.meta.env.VITE_PROXY_BAIDU ?? '',
};

export const defaultBasemapId = import.meta.env.VITE_DEFAULT_BASEMAP ?? 'baidu-satellite';
