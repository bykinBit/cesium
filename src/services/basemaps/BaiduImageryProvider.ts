import type { default as CesiumType } from 'cesium';

export interface BaiduImageryProviderOptions {
    Cesium: CesiumType;
    url: string;
    minimumLevel?: number;
    maximumLevel?: number;
    zoomOffset?: number;
}

export class BaiduImageryProvider implements Cesium.ImageryProvider {
    private readonly _Cesium: CesiumType;
    private readonly _tileWidth = 256;
    private readonly _tileHeight = 256;
    private readonly _maximumLevel: number;
    private readonly _minimumLevel: number;
    private readonly _zoomOffset: number;
    private readonly _tilingScheme: CesiumType.WebMercatorTilingScheme;
    private readonly _rectangle: CesiumType.Rectangle;
    private readonly _resource: CesiumType.Resource;
    private readonly _urlTemplate: string;
    private readonly _errorEvent: CesiumType.Event;
    private readonly _readyPromise: Promise<boolean>;
    private readonly _tileDiscardPolicy?: CesiumType.TileDiscardPolicy;
    private readonly _credit?: CesiumType.Credit;

    constructor(options: BaiduImageryProviderOptions) {
        const { Cesium, url, minimumLevel = 3, maximumLevel = 19, zoomOffset = 3 } = options;

        this._Cesium = Cesium;
        this._maximumLevel = maximumLevel;
        this._minimumLevel = minimumLevel;
        this._zoomOffset = zoomOffset;
        this._urlTemplate = url;

        const southwestInMeters = new Cesium.Cartesian2(-33554054, -33746824);
        const northeastInMeters = new Cesium.Cartesian2(33554054, 33746824);

        this._tilingScheme = new Cesium.WebMercatorTilingScheme({
            rectangleSouthwestInMeters: southwestInMeters,
            rectangleNortheastInMeters: northeastInMeters,
        });

        this._rectangle = this._tilingScheme.rectangle;
        this._resource = Cesium.Resource.createIfNeeded(url);
        this._errorEvent = new Cesium.Event();
        this._readyPromise = Promise.resolve(true);
    }

    get url(): string {
        return this._resource.url;
    }

    get proxy(): CesiumType.Proxy | undefined {
        return this._resource.proxy;
    }

    get tileWidth(): number {
        return this._tileWidth;
    }

    get tileHeight(): number {
        return this._tileHeight;
    }

    get maximumLevel(): number {
        return this._maximumLevel;
    }

    get minimumLevel(): number {
        return this._minimumLevel;
    }

    get tilingScheme(): CesiumType.WebMercatorTilingScheme {
        return this._tilingScheme;
    }

    get tileDiscardPolicy(): CesiumType.TileDiscardPolicy | undefined {
        return this._tileDiscardPolicy;
    }

    get rectangle(): CesiumType.Rectangle {
        return this._rectangle;
    }

    get errorEvent(): CesiumType.Event {
        return this._errorEvent;
    }

    get ready(): boolean {
        return true;
    }

    get readyPromise(): Promise<boolean> {
        return this._readyPromise;
    }

    get credit(): CesiumType.Credit | undefined {
        return this._credit;
    }

    public requestImage(x: number, y: number, level: number): Promise<HTMLImageElement | ImageBitmap> | undefined {
        const Cesium = this._Cesium;
        const zoom = level + this._zoomOffset;
        const tileCount = Math.pow(2, zoom);
        const tileX = Math.round(x - tileCount / 2);
        const tileY = Math.round(tileCount / 2 - y - 1);

        const finalUrl = this._urlTemplate
            .replace(/\{x\}/gi, tileX.toString())
            .replace(/\{y\}/gi, tileY.toString())
            .replace(/\{z\}/gi, zoom.toString());

        const resource = this._resource.getDerivedResource({ url: finalUrl });
        return Cesium.ImageryProvider.loadImage(this, resource);
    }

    // eslint-disable-next-line class-methods-use-this
    public pickFeatures(): undefined {
        return undefined;
    }
}
