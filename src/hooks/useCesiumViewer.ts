import { onBeforeUnmount, ref, type Ref } from 'vue';

import type { Viewer } from 'cesium';

export type UseCesiumViewerOptions = Partial<Viewer.ConstructorOptions>;

export interface UseCesiumViewerResult {
    viewer: Ref<Viewer | null>;
    isReady: Ref<boolean>;
    initViewer: (container: string | Element, options?: UseCesiumViewerOptions) => Promise<Viewer>;
    destroyViewer: () => void;
}

export function useCesiumViewer(Cesium: typeof import('cesium')): UseCesiumViewerResult {
    const viewer = ref<Viewer | null>(null);
    const isReady = ref(false);

    const initViewer = async (container: string | Element, options: UseCesiumViewerOptions = {}): Promise<Viewer> => {
        if (viewer.value) {
            return viewer.value;
        }

        const target = container;

        const instance = new Cesium.Viewer(target, {
            terrainProvider:undefined,
            timeline: false,
            infoBox:false,
            animation:false,
            baseLayer: false,
            baseLayerPicker: false,
            ...options,
        });
        // 添加瓦片坐标信息
        instance.imageryLayers.addImageryProvider(new Cesium.TileCoordinatesImageryProvider());
        viewer.value = instance;
        isReady.value = true;
        return instance;
    };

    const destroyViewer = (): void => {
        if (viewer.value && !viewer.value.isDestroyed()) {
            viewer.value.destroy();
        }
        viewer.value = null;
        isReady.value = false;
    };

    onBeforeUnmount(destroyViewer);

    return {
        viewer,
        isReady,
        initViewer,
        destroyViewer,
    };
}
