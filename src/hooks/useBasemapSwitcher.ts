import type { BasemapEnv, BasemapHookResult } from '../services/basemaps/types';
import { basemapHookMap, basemapOptions, normalizeBasemapEnv } from '../services/basemaps/definitions';

interface SwitcherOptions {
    Cesium: typeof import('cesium');
    viewer: import('cesium').Viewer;
    env?: BasemapEnv;
}

export const useBasemapSwitcher = ({ Cesium, viewer, env }: SwitcherOptions) => {
    const normalizedEnv = normalizeBasemapEnv(env);
    const options = basemapOptions;

    let activeCleanup: (() => void) | null = null;
    let currentId: string | null = null;

    const setBasemap = async (id: string, params?: { force?: boolean }): Promise<BasemapHookResult> => {
        const force = params?.force ?? false;

        if (!force && id === currentId) {
            return { release: activeCleanup ?? (() => {}) };
        }

        if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
        }

        const hook = basemapHookMap[id];
        if (!hook) {
            throw new Error(`Basemap '${id}' is not registered.`);
        }

        const result = await hook({ Cesium, viewer, env: normalizedEnv });
        activeCleanup = result.release;
        currentId = id;
        return result;
    };

    const destroy = () => {
        if (activeCleanup) {
            activeCleanup();
            activeCleanup = null;
        }
        currentId = null;
    };

    const getCurrentId = () => currentId;

    return {
        options,
        setBasemap,
        destroy,
        getCurrentId,
    };
};


