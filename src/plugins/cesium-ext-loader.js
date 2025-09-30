import * as CesiumModule from "cesium";
import * as ProtoBufModule from "protobufjs";
const ProtoBuf = ProtoBufModule.default || ProtoBufModule;
import pluginSource from "./Cesium_ext_min.js?raw";

const globalObj = typeof window !== "undefined" ? window : globalThis;
let initialized = false;

const mergeCesiumExports = () => {
    if (!globalObj.Cesium) {
        globalObj.Cesium = { ...CesiumModule };
    }

    if (!globalObj.ProtoBuf) {
        globalObj.ProtoBuf = ProtoBuf;
    }

    if (!globalObj.dcodeIO) {
        globalObj.dcodeIO = {};
    }
    if (!globalObj.dcodeIO.ProtoBuf) {
        globalObj.dcodeIO.ProtoBuf = ProtoBuf;
    }

    if (!globalObj.Cesium) {
        return;
    }

    const SceneTransforms = globalObj.Cesium.SceneTransforms;
    if (SceneTransforms && typeof SceneTransforms.wgs84ToDrawingBufferCoordinates !== 'function') {
        const Cartesian3 = globalObj.Cesium.Cartesian3;
        const Cartographic = globalObj.Cesium.Cartographic;
        const defined = globalObj.Cesium.defined || ((value) => value !== undefined && value !== null);
        const scratchCartesian = new Cartesian3();
        const scratchCartographic = new Cartographic();
        SceneTransforms.wgs84ToDrawingBufferCoordinates = function wgs84ToDrawingBufferCoordinates(scene, position, result) {
            if (!defined(scene) || !defined(position)) {
                return undefined;
            }

            let cartesian = position;
            if (defined(position.longitude) && defined(position.latitude)) {
                const cartographic = Cartographic.clone(position, scratchCartographic);
                cartesian = scene.globe && scene.globe.ellipsoid
                    ? scene.globe.ellipsoid.cartographicToCartesian(cartographic, scratchCartesian)
                    : Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height, scratchCartesian);
            }

            return SceneTransforms.worldToDrawingBufferCoordinates(scene, cartesian, result);
        };
    }

    const defaultValue = globalObj.Cesium.defaultValue;
    if (defaultValue && !defaultValue.__geoPatched) {
        const Frozen = globalObj.Cesium.Frozen || {};
        const isDefined = (value) => value !== undefined && value !== null;
        const patchedDefaultValue = (value, fallback) => (value ?? fallback);

        patchedDefaultValue.EMPTY_OBJECT = Frozen.EMPTY_OBJECT || defaultValue.EMPTY_OBJECT || Object.freeze({});
        patchedDefaultValue.EMPTY_ARRAY = Frozen.EMPTY_ARRAY || defaultValue.EMPTY_ARRAY || Object.freeze([]);

        patchedDefaultValue.and = (value, fallback, resultIfBothDefined) => {
            if (isDefined(value) && isDefined(fallback)) {
                return resultIfBothDefined;
            }
            return patchedDefaultValue(value, fallback ?? resultIfBothDefined);
        };

        patchedDefaultValue.or = (value, fallback, resultIfBothDefined) => {
            if (isDefined(value)) {
                return value;
            }
            if (isDefined(fallback)) {
                return fallback;
            }
            return resultIfBothDefined;
        };

        patchedDefaultValue.__geoPatched = true;
        globalObj.Cesium.defaultValue = patchedDefaultValue;
    } else if (defaultValue && globalObj.Cesium.Frozen?.EMPTY_OBJECT) {
        defaultValue.EMPTY_OBJECT = globalObj.Cesium.Frozen.EMPTY_OBJECT;
    }

    for (const [key, value] of Object.entries(CesiumModule)) {
        if (!(key in globalObj.Cesium)) {
            globalObj.Cesium[key] = value;
        }
    }
};

const restoreDefine = (previousDefine) => {
    if (previousDefine) {
        globalObj.define = previousDefine;
    } else {
        delete globalObj.define;
    }
};

const withRedefinitionGuards = (executor) => {
    const originalDefineProperty = Object.defineProperty;
    const originalDefineProperties = Object.defineProperties;

    const shouldBypass = (target, key) => {
        if (!target) {
            return false;
        }
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        return Boolean(descriptor && descriptor.configurable === false);
    };

    Object.defineProperty = (target, key, descriptor) => {
        if (shouldBypass(target, key)) {
            return target;
        }
        return originalDefineProperty(target, key, descriptor);
    };

    Object.defineProperties = (target, descriptors) => {
        if (!descriptors) {
            return originalDefineProperties(target, descriptors);
        }

        let modified = false;
        const filtered = {};

        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (shouldBypass(target, key)) {
                modified = true;
                continue;
            }
            filtered[key] = descriptor;
        }

        if (!modified) {
            return originalDefineProperties(target, descriptors);
        }

        if (Object.keys(filtered).length === 0) {
            return target;
        }

        return originalDefineProperties(target, filtered);
    };

    try {
        executor();
    } finally {
        Object.defineProperty = originalDefineProperty;
        Object.defineProperties = originalDefineProperties;
    }
};

export const ensureCesiumExt = () => {
    if (initialized || typeof window === "undefined") {
        return globalObj.Cesium ?? CesiumModule;
    }

    mergeCesiumExports();

    const previousDefine = globalObj.define;
    let factoryResult = null;

    const amdDefine = (factory) => {
        factoryResult = factory();
        return factoryResult;
    };

    amdDefine.amd = true;
    globalObj.define = amdDefine;

    const moduleShim = { exports: {} };
    const exportsShim = moduleShim.exports;
    const executor = new Function("module", "exports", pluginSource);

    withRedefinitionGuards(() => {
        executor(moduleShim, exportsShim);
    });

    restoreDefine(previousDefine);

    initialized = true;

    mergeCesiumExports();

    return globalObj.Cesium;
};

const Cesium = ensureCesiumExt();

export default Cesium;
export const GeoWTFS = Cesium.GeoWTFS;
