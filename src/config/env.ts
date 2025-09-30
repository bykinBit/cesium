/// <reference path='../types/env.d.ts' />
export const mapTokens = {
    tiandituToken: import.meta.env.VITE_TDT_TOKEN ?? 'd228841505c60647d5f9af5e891a57af',
    enableTiandituTerrain: (import.meta.env.VITE_ENABLE_TDT_TERRAIN ?? 'false') === 'true',
    mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN ?? '',
    gaodeKey: import.meta.env.VITE_GAODE_KEY ?? '',
    tencentKey: import.meta.env.VITE_TENCENT_KEY ?? '',
    baiduAk: import.meta.env.VITE_BAIDU_AK ?? '',
};

export const proxyPrefixes = {
    tianditu: import.meta.env.VITE_PROXY_TDT ?? '/td',
    mapbox: import.meta.env.VITE_PROXY_MAPBOX ?? '/mapbox',
    gaode: import.meta.env.VITE_PROXY_GAODE ?? '/gaode',
    tencent: import.meta.env.VITE_PROXY_TENCENT ?? '/tencent',
    baidu: import.meta.env.VITE_PROXY_BAIDU ?? '/baidu',
};

export const defaultBasemapId = import.meta.env.VITE_DEFAULT_BASEMAP ?? 'gaode-vector';




