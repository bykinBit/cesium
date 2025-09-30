interface ImportMetaEnv {
    readonly VITE_TDT_TOKEN?: string;
    readonly VITE_ENABLE_TDT_TERRAIN?: string;
    readonly VITE_MAPBOX_TOKEN?: string;
    readonly VITE_GAODE_KEY?: string;
    readonly VITE_TENCENT_KEY?: string;
    readonly VITE_BAIDU_AK?: string;
    readonly VITE_PROXY_TDT?: string;
    readonly VITE_PROXY_MAPBOX?: string;
    readonly VITE_PROXY_GAODE?: string;
    readonly VITE_PROXY_TENCENT?: string;
    readonly VITE_PROXY_BAIDU?: string;
    readonly VITE_DEFAULT_BASEMAP?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
