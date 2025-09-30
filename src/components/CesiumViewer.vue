<template>
    <div class="viewer-wrapper">
        <div id="cesium-container"></div>
        <div class="basemap-control">
            <label class="basemap-control__label" for="basemap-select">µ◊Õº</label>
            <select
                id="basemap-select"
                class="basemap-control__select"
                v-model="selectedBasemapId"
            >
                <option v-for="option in basemapOptions" :key="option.id" :value="option.id">
                    {{ option.label }}
                </option>
            </select>
            <span v-if="basemapLoading" class="basemap-status">º”‘ÿ÷–°≠</span>
            <span v-else-if="basemapError" class="basemap-status basemap-status--error">{{ basemapError }}</span>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Cesium, { GeoWTFS as GeoWTFSModule, ensureCesiumExt } from '../plugins/cesium-ext-loader'
import { useCesiumViewer } from '../hooks/useCesiumViewer'
import { useBasemapSwitcher } from '../hooks/useBasemapSwitcher'
import { mapTokens, proxyPrefixes, defaultBasemapId } from '../config/env'

const selectedBasemapId = ref(defaultBasemapId)
const basemapOptions = ref([])
const basemapLoading = ref(false)
const basemapError = ref('')

const TIANDITU_BASEMAP_IDS = new Set(['tianditu-imagery'])
let tiandituTerrainProvider = null
let tiandituTerrainActive = false
let removeSceneModeListener = null

const { viewer, initViewer, destroyViewer } = useCesiumViewer(Cesium)
let basemapSwitcher = null
let geoWTFSCtor = null

const applyBasemap = async (id, params = {}) => {
    if (!basemapSwitcher) {
        return
    }

    basemapLoading.value = true
    basemapError.value = ''

    const { force = false } = params ?? {}

    try {
        await basemapSwitcher.setBasemap(id, { force })
        const viewerInstance = viewer.value
        if (viewerInstance) {
            syncTiandituExtras(viewerInstance, id)
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        basemapError.value = message
    } finally {
        basemapLoading.value = false
    }
}

const initializeGeoWTFS = (viewerInstance) => {
    const GeoWTFSCtor = GeoWTFSModule ?? Cesium.GeoWTFS ?? window.GeoWTFS ?? null

    if (!GeoWTFSCtor) {
        console.warn('GeoWTFS plugin is unavailable, Tianditu label layer will be skipped.')
        return null
    }

    const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7']

    const wtfs = new GeoWTFSCtor({
        viewer: viewerInstance,
        subdomains,
        metadata: {
            boundBox: {
                minX: -180,
                minY: -90,
                maxX: 180,
                maxY: 90,
            },
            minLevel: 1,
            maxLevel: 20,
        },
        depthTestOptimization: true,
        dTOElevation: 15000,
        dTOPitch: Cesium.Math.toRadians(-70),
        aotuCollide: true,
        collisionPadding: [5, 10, 8, 5],
        serverFirstStyle: true,
        labelGraphics: {
            font: '28px sans-serif',
            fontSize: 28,
            fillColor: Cesium.Color.WHITE,
            scale: 0.5,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            showBackground: false,
            backgroundColor: Cesium.Color.RED,
            backgroundPadding: new Cesium.Cartesian2(10, 10),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            eyeOffset: Cesium.Cartesian3.ZERO,
            pixelOffset: new Cesium.Cartesian2(5, 5),
            disableDepthTestDistance: undefined,
        },
        billboardGraphics: {
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            eyeOffset: Cesium.Cartesian3.ZERO,
            pixelOffset: Cesium.Cartesian2.ZERO,
            alignedAxis: Cesium.Cartesian3.ZERO,
            color: Cesium.Color.WHITE,
            rotation: 0,
            scale: 1,
            width: 18,
            height: 18,
            disableDepthTestDistance: undefined,
        },
    })

    wtfs.getTileUrl = function getTileUrl() {
        return `${proxyPrefixes.tianditu ?? '/td'}/mapservice/GetTiles?lxys={z},{x},{y}&VERSION=1.0.0&tk=${mapTokens.tiandituToken}`
    }

    wtfs.getIcoUrl = function getIcoUrl() {
        return `${proxyPrefixes.tianditu ?? '/td'}/mapservice/GetIcon?id={id}&tk=${mapTokens.tiandituToken}`
    }

    wtfs.initTDT([
        { x: 6, y: 1, level: 2, boundBox: { minX: 90, minY: 0, maxX: 135, maxY: 45 } },
        { x: 7, y: 1, level: 2, boundBox: { minX: 135, minY: 0, maxX: 180, maxY: 45 } },
        { x: 6, y: 0, level: 2, boundBox: { minX: 90, minY: 45, maxX: 135, maxY: 90 } },
        { x: 7, y: 0, level: 2, boundBox: { minX: 135, minY: 45, maxX: 180, maxY: 90 } },
        { x: 5, y: 1, level: 2, boundBox: { minX: 45, minY: 0, maxX: 90, maxY: 45 } },
        { x: 4, y: 1, level: 2, boundBox: { minX: 0, minY: 0, maxX: 45, maxY: 45 } },
        { x: 5, y: 0, level: 2, boundBox: { minX: 45, minY: 45, maxX: 90, maxY: 90 } },
        { x: 4, y: 0, level: 2, boundBox: { minX: 0, minY: 45, maxX: 45, maxY: 90 } },
        { x: 6, y: 2, level: 2, boundBox: { minX: 90, minY: -45, maxX: 135, maxY: 0 } },
        { x: 6, y: 3, level: 2, boundBox: { minX: 90, minY: -90, maxX: 135, maxY: -45 } },
        { x: 7, y: 2, level: 2, boundBox: { minX: 135, minY: -45, maxX: 180, maxY: 0 } },
        { x: 5, y: 2, level: 2, boundBox: { minX: 45, minY: -45, maxX: 90, maxY: 0 } },
        { x: 4, y: 2, level: 2, boundBox: { minX: 0, minY: -45, maxX: 45, maxY: 0 } },
        { x: 3, y: 1, level: 2, boundBox: { minX: -45, minY: 0, maxX: 0, maxY: 45 } },
        { x: 3, y: 0, level: 2, boundBox: { minX: -45, minY: 45, maxX: 0, maxY: 90 } },
        { x: 2, y: 0, level: 2, boundBox: { minX: -90, minY: 45, maxX: -45, maxY: 90 } },
        { x: 0, y: 1, level: 2, boundBox: { minX: -180, minY: 0, maxX: -135, maxY: 45 } },
        { x: 1, y: 0, level: 2, boundBox: { minX: -135, minY: 45, maxX: -90, maxY: 90 } },
        { x: 0, y: 0, level: 2, boundBox: { minX: -180, minY: 45, maxX: -135, maxY: 90 } },
    ])

    return wtfs
}

const ensureTiandituLabel = (viewerInstance) => {
    if (geoWTFSCtor) {
        return
    }
    geoWTFSCtor = initializeGeoWTFS(viewerInstance)
}

const destroyTiandituLabel = () => {
    if (!geoWTFSCtor) {
        return
    }

    const cleanupEvent = (event) => {
        if (!event) {
            return
        }

        const listeners = Array.isArray(event._listeners) ? event._listeners : null
        const scopes = Array.isArray(event._scopes) ? event._scopes : null
        const hasRemovalApi = typeof event.removeEventListener === 'function'

        if (!listeners || listeners.length === 0) {
            return
        }

        let mutated = false
        const retainedListeners = []
        const retainedScopes = []

        for (let index = listeners.length - 1; index >= 0; index -= 1) {
            const listener = listeners[index]
            const scope = scopes ? scopes[index] : undefined

            if (typeof listener !== 'function') {
                retainedListeners.unshift(listener)
                if (scopes) {
                    retainedScopes.unshift(scope)
                }
                continue
            }

            const factorySource = listener.name ? listener.name.toLowerCase() : ''
            let bodySource = ''
            try {
                bodySource = String(listener).toLowerCase()
            } catch (error) {
                bodySource = ''
            }
            const matchesByScope = scope === geoWTFSCtor
            const matchesBySource = factorySource.includes('wtf') || bodySource.includes('wtf') || bodySource.includes('tianditu')

            if (!matchesByScope && !matchesBySource) {
                retainedListeners.unshift(listener)
                if (scopes) {
                    retainedScopes.unshift(scope)
                }
                continue
            }

            mutated = true
            if (hasRemovalApi) {
                try {
                    if (matchesByScope) {
                        event.removeEventListener(listener, scope)
                    } else {
                        event.removeEventListener(listener)
                    }
                } catch (error) {
                    console.warn('Failed to remove GeoWTFS listener.', error)
                }
            }
        }

        if (mutated && listeners) {
            listeners.length = 0
            for (const retained of retainedListeners) {
                listeners.push(retained)
            }
            if (scopes) {
                scopes.length = 0
                for (const retainedScope of retainedScopes) {
                    scopes.push(retainedScope)
                }
            }
        }
    }

    const wtfsViewer = geoWTFSCtor.viewer ?? geoWTFSCtor._viewer
    const scene = wtfsViewer?.scene
    const camera = scene?.camera

    cleanupEvent(camera?.moveStart)
    cleanupEvent(camera?.moveEnd)
    cleanupEvent(camera?.changed)
    cleanupEvent(camera?.moveStartEvent)
    cleanupEvent(camera?.moveEndEvent)
    cleanupEvent(camera?.preRender)
    cleanupEvent(scene?.preUpdate ?? scene?._preUpdate)
    cleanupEvent(scene?.postUpdate)
    cleanupEvent(scene?.preRender)
    cleanupEvent(scene?.postRender)
    cleanupEvent(scene?.globe?.tileLoadProgressEvent)
    cleanupEvent(scene?.postProcessStages?.onAfterExecute)
    cleanupEvent(wtfsViewer?.clock?.onTick)

    if (geoWTFSCtor.destroy) {
        try {
            geoWTFSCtor.destroy()
        } catch (error) {
            console.warn('Failed to destroy GeoWTFS instance.', error)
        }
    }

    geoWTFSCtor = null
}

const updateTiandituTerrainState = (viewerInstance) => {
    const isTianditu = TIANDITU_BASEMAP_IDS.has(selectedBasemapId.value)

    if (!isTianditu || !mapTokens.enableTiandituTerrain || !tiandituTerrainProvider) {
        tiandituTerrainActive = false
        return
    }

    if (viewerInstance.scene.mode === Cesium.SceneMode.SCENE3D) {
        if (!tiandituTerrainActive) {
            viewerInstance.terrainProvider = tiandituTerrainProvider
            tiandituTerrainActive = true
        }
    } else if (tiandituTerrainActive) {
        viewerInstance.terrainProvider = new Cesium.EllipsoidTerrainProvider()
        tiandituTerrainActive = false
    }
}

const syncTiandituExtras = (viewerInstance, basemapId) => {
    const isTianditu = TIANDITU_BASEMAP_IDS.has(basemapId)

    if (isTianditu) {
        ensureTiandituLabel(viewerInstance)
        tiandituTerrainProvider = mapTokens.enableTiandituTerrain ? viewerInstance.terrainProvider : null
        if (!tiandituTerrainProvider) {
            tiandituTerrainActive = false
        }
    } else {
        destroyTiandituLabel()
        tiandituTerrainProvider = null
        tiandituTerrainActive = false
    }

    updateTiandituTerrainState(viewerInstance)
}

onMounted(async () => {
    ensureCesiumExt()
    const viewerInstance = await initViewer('cesium-container')

    viewerInstance.imageryLayers.removeAll()

    if (viewerInstance._cesiumWidget?._creditContainer) {
        viewerInstance._cesiumWidget._creditContainer.style.display = 'none'
    }

    const env = {
        tiandituToken: mapTokens.tiandituToken,
        enableTiandituTerrain: mapTokens.enableTiandituTerrain,
        mapboxToken: mapTokens.mapboxToken,
        gaodeKey: mapTokens.gaodeKey,
        tencentKey: mapTokens.tencentKey,
        baiduAk: mapTokens.baiduAk,
        proxyPrefixes,
    }

    basemapSwitcher = useBasemapSwitcher({ Cesium, viewer: viewerInstance, env })
    basemapOptions.value = basemapSwitcher.options
    if (!basemapOptions.value.some((option) => option.id === selectedBasemapId.value)) {
        selectedBasemapId.value = basemapOptions.value[0]?.id ?? selectedBasemapId.value
    }
    await applyBasemap(selectedBasemapId.value)

    const handleMorphComplete = () => {
        updateTiandituTerrainState(viewerInstance)
    }
    viewerInstance.scene.morphComplete.addEventListener(handleMorphComplete)
    removeSceneModeListener = () => {
        viewerInstance.scene.morphComplete.removeEventListener(handleMorphComplete)
    }

    viewerInstance.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(103.84, 31.15, 17850000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-89.74026687972041),
            roll: Cesium.Math.toRadians(0),
        },
    })

})

watch(selectedBasemapId, (next, prev) => {
    if (next === prev) return
    void applyBasemap(next)
})

onBeforeUnmount(() => {
    removeSceneModeListener?.()
    removeSceneModeListener = null
    basemapSwitcher?.destroy()
    basemapSwitcher = null
    destroyTiandituLabel()
    tiandituTerrainProvider = null
    tiandituTerrainActive = false
    destroyViewer()
})
</script>

<style scoped lang="less">
.viewer-wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
}

#cesium-container {
    width: 100%;
    height: 100%;
}

.basemap-control {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.45);
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    backdrop-filter: blur(4px);
}

.basemap-control__label {
    font-weight: 600;
}

.basemap-control__select {
    padding: 4px 8px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
}

.basemap-status {
    font-size: 12px;
}

.basemap-status--error {
    color: #ffadad;
}

:deep(.cesium-viewer-toolbar),
:deep(.cesium-viewer-animationContainer),
:deep(.cesium-viewer-timelineContainer) {
    display: none;
}
</style>






