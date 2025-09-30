import { onBeforeUnmount, ref } from 'vue';

export interface UseCesiumViewerOptions extends Partial<import('cesium').Viewer.ConstructorOptions> {}

export interface UseCesiumViewerResult {
    viewer: import('vue').Ref<import('cesium').Viewer | null>;
    isReady: import('vue').Ref<boolean>;
    initViewer: (container: string | HTMLElement, options?: UseCesiumViewerOptions) => Promise<import('cesium').Viewer>;
    destroyViewer: () => void;
}

export function useCesiumViewer(Cesium: typeof import('cesium')): UseCesiumViewerResult {
    const viewer = ref<import('cesium').Viewer | null>(null);
    const isReady = ref(false);

    const initViewer = async (container: string | HTMLElement, options: UseCesiumViewerOptions = {}) => {
        if (viewer.value) {
            return viewer.value;
        }

        const target = typeof container === 'string' ? container : (container as HTMLElement);
        const instance = new Cesium.Viewer(target, {
            imageryProvider: false,
            baseLayerPicker: false,
            ...options,
        });

        viewer.value = instance;
        isReady.value = true;
        return instance;
    };

    const destroyViewer = () => {
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
