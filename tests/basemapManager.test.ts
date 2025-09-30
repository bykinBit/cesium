import { beforeEach, describe, expect, it } from 'vitest';
import { useBasemapSwitcher } from '../src/hooks/useBasemapSwitcher';
import { basemapOptions, normalizeBasemapEnv } from '../src/services/basemaps';

class MockImageryLayerCollection {
    constructor() {
        this._layers = [];
    }

    addImageryProvider(provider) {
        const layer = { provider, alpha: 1, show: true };
        this._layers.push(layer);
        return layer;
    }

    remove(layer) {
        const index = this._layers.indexOf(layer);
        if (index >= 0) {
            this._layers.splice(index, 1);
        }
        return true;
    }

    toArray() {
        return this._layers.slice();
    }
}

class MockViewer {
    constructor() {
        this.imageryLayers = new MockImageryLayerCollection();
        this.terrainProvider = null;
        this._cesiumWidget = { _creditContainer: { style: { display: '' } } };
    }
}

class StubUrlTemplateImageryProvider {
    constructor(options) {
        this.url = options.url;
        this.options = options;
    }
}

class StubWebMercatorTilingScheme {}

class StubEllipsoidTerrainProvider {
    constructor(id = 'ellipsoid') {
        this.id = id;
    }
}

describe('useBasemapSwitcher', () => {
    let viewer;
    let CesiumStub;

    beforeEach(() => {
        viewer = new MockViewer();
        CesiumStub = {
            UrlTemplateImageryProvider: StubUrlTemplateImageryProvider,
            WebMercatorTilingScheme: StubWebMercatorTilingScheme,
            EllipsoidTerrainProvider: StubEllipsoidTerrainProvider,
            createWorldTerrainAsync: async () => new StubEllipsoidTerrainProvider('world-terrain'),
            Math: { toRadians: (value) => value },
            Cartesian3: { fromDegrees: (...vals) => vals, ZERO: {} },
            Cartesian2: class {},
            Color: {},
            LabelStyle: {},
            HorizontalOrigin: {},
            VerticalOrigin: {},
        };
    });

    const env = normalizeBasemapEnv({
        tiandituToken: 'mock-tdt-token',
        enableTiandituTerrain: false,
        mapboxToken: 'mock-mapbox-token',
        gaodeKey: 'mock-gaode-key',
        tencentKey: 'mock-tencent-key',
        baiduAk: 'mock-baidu-ak',
        proxyPrefixes: {
            tianditu: '/td',
            mapbox: '/mapbox',
            gaode: '/gaode',
            tencent: '/tencent',
            baidu: '/baidu',
        },
    });

    it('provides basemap options', () => {
        expect(basemapOptions.length).toBeGreaterThan(0);
    });

    it('applies a basemap and updates viewer', async () => {
        const switcher = useBasemapSwitcher({ Cesium: CesiumStub, viewer, env });
        await switcher.setBasemap('tianditu-imagery');

        expect(viewer.imageryLayers.toArray().length).toBeGreaterThanOrEqual(2);
        expect(viewer.terrainProvider).toBeInstanceOf(StubEllipsoidTerrainProvider);
        switcher.destroy();
        expect(viewer.imageryLayers.toArray().length).toBe(0);
    });

    it('switches between basemaps', async () => {
        const switcher = useBasemapSwitcher({ Cesium: CesiumStub, viewer, env });
        await switcher.setBasemap('tianditu-imagery');
        const firstUrl = viewer.imageryLayers.toArray()[0].provider.url;
        await switcher.setBasemap('mapbox-streets');
        const layers = viewer.imageryLayers.toArray();
        expect(layers.length).toBe(1);
        expect(layers[0].provider.url).not.toBe(firstUrl);
        switcher.destroy();
    });
});
