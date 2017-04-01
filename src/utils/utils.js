import _ from 'lodash'
import React from 'react'
import L from 'leaflet'
import '../components/ext/leaflet-clip-wms-layer'
import Store from '../store'

export function getMultipliedLayers(layers) {
  let result = [];
  for (let layer in layers) {
    if (layers.hasOwnProperty(layer)) {
      result.push(`${layers[layer]}*2.5`)
    }
  }
  return result.join(",");
}

export function addAdditionalParamsToInstance(instances) {
  instances.forEach(instanceObj => {
    let instance = instanceObj.id.split(".")[1],
        baseUrl = 'services.sentinel-hub.com',
        wmsUrl = `http://${baseUrl}/v1/wms/${instance}`,
    name = instanceObj.name
    let minZoom = 10
    let isSentinel = name.includes('Sentinel')
    let isSentinel3 = name === 'Sentinel-3'
    let previewPrefix = '', evalsource = 'S2', indexService = ''
    if (isSentinel3) {
      previewPrefix = ''
      minZoom = 6
      evalsource = `S3`
      indexService = 'http://services.eocloud.sentinel-hub.com/index/s3/v1'
    } else if (isSentinel) {
      minZoom = 4
      previewPrefix = 'http://sentinel-s2-l1c.s3.amazonaws.com'
      indexService = 'http://services.sentinel-hub.com/index/v2'
    } else {
      const [landsat, number, isAws] = name.split(" ")
      if (isAws === 'USGS') {
        minZoom = 8
        previewPrefix = 'http://landsat-pds.s3.amazonaws.com'
        indexService = `http://services-uswest2.sentinel-hub.com/index/v2`
      } else {
        previewPrefix = 'http://finder.eocloud.eu/files'
        indexService = `http://${baseUrl}/index/landsat${number}/v2`
      }
      evalsource = `L${number}`
    }
    instanceObj.additionalParams = {
      baseUrl: baseUrl,
      wmsUrl: wmsUrl,
      minZoom: minZoom,
      evalsource: evalsource,
      indexService: indexService,
      previewPrefix: previewPrefix
    }
  })
}

export const evalSourcesMap = {
  'Sentinel-2': 'S2',
  'Sentinel-3': 'S3',
  'Landsat 5': 'L5',
  'Landsat 7': 'L7',
  'Landsat 8': 'L8',
  'Landsat 8 ESA': 'L8',
  'Landsat 8 USGS': 'L8',
}
export function getActivePreset(obj) {
  const {selectedResult, preset, datasource} = Store.current
  return (obj && obj.preset) || selectedResult.preset || preset[datasource]
}
export function isCustom(obj) {
  return getActivePreset(obj) === 'CUSTOM'
}

export function getLayersString(obj) {
  const layers = obj ? Store.current.layers[obj.name] : Store.current.selectedResult.layer
  return isCustom(obj) ? _.values(obj ? obj.layers : layers).join(",") : getActivePreset(obj)
}

export function hasPinSaved(item) {
  const {pinResults, selectedResult} = Store.current
  const result = item ? item : selectedResult
  let hasPin = false
  pinResults.forEach(pin => {
    hasPin = _.isEqual(pin, result)
  })
  return hasPin
}

export function createMapLayer(instanceObj, pane, progress) {
  let name = instanceObj.name
  let isSentinel3 = name === 'Sentinel-3'
  let instance = instanceObj.id.split(".")[1],
      baseUrl = 'http://services.sentinel-hub.com',
      url = `${baseUrl}/v1/wms/${instance}`

  let evalsource = 'S2'
  if (isSentinel3) {
    evalsource = `S3`
  } else {
    evalsource = `L${name.split(" ")[1]}`
  }
  // when we create compare layer, we will create CLIP layer, otherwise normal wms layer
  let layer = pane === 'compareLayer' ? L.tileLayer.clip(url, {
    showlogo: false,
    tileSize: 512,
    minZoom: instanceObj.additionalParams.minZoom,
    maxZoom: 16,
    pane: pane,
    name: name,
    additionalParams: {
      evalsource: evalsource
    }
  }) : L.tileLayer.wms(url, {
    showlogo: false,
    tileSize: 512,
    minZoom: instanceObj.additionalParams.minZoom,
    maxZoom: 16,
    pane: pane,
    name: name,
    additionalParams: {
      evalsource: evalsource
    }
  });
  layer.on('loading', function() {
    progress.start()
    progress.inc(0.1);
  })
  layer.on('load', function() {
    progress.done()
  })
  return layer
}

export function getGeoJson(geometry, data, index, style) {
  let sunElevation = data.sunElevation && `<p>Sun elevation: ${data.sunElevation}</p>`
  return {
    "type": "Feature",
    "properties": {
      "index": index,
      "rawData": data,
      "style": style,
    },
    "geometry": geometry
  }
}



export function getCoordsFromBounds(bounds, isLatLng) {
  let coords = []
  let sw = bounds.getSouthWest().wrap(),
    se = bounds.getSouthEast().wrap(),
    ne = bounds.getNorthEast().wrap(),
    nw = bounds.getNorthWest().wrap()
  if (!isLatLng) {
    coords.push([sw.lng, sw.lat])
    coords.push([se.lng, se.lat])
    coords.push([ne.lng, ne.lat])
    coords.push([nw.lng, nw.lat])
    coords.push([sw.lng, sw.lat])
  } else {
    coords.push([sw.lat, sw.lng])
    coords.push([se.lat, se.lng])
    coords.push([ne.lat, ne.lng])
    coords.push([nw.lat, nw.lng])
    coords.push([sw.lat, sw.lng])
  }

  return coords
}

// Store pins to localStorage
function hasLocalStorage() {
  var mod = 'modernizr';
    try {
      localStorage.setItem(mod, mod);
      localStorage.removeItem(mod);
      return true;
    } catch (e) {
      return false;
    }
}

let pinsLsId = 'react-app-pins';
export function getPinsFromLocalStorage() {
  if(!hasLocalStorage) return [];

  let pins = window.localStorage.getItem(pinsLsId);

  return pins == null ? [] : JSON.parse(pins);
}

export function syncPinsWithLocalStorage(pins) {
  if(!hasLocalStorage) return;

  window.localStorage.setItem(pinsLsId, JSON.stringify(pins));
}

export function getNativeRes() {
  const {datasource, lat} = Store.current
  const isS3 = datasource === 'Sentinel-3'
  const res = isS3 ? 300 * 1 / Math.cos(lat * 0.0174532925199432957692) : 10
  return res
}

export function b64DecodeUnicode(str) {
    if (str.includes("=")) {
      str = str.replace("=", "")
    }
    try {
      atob(str)
    }catch(e) {
      return ''
    }
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}
export function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
  }

export function getPolyfill() {
  if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, "includes", {
      value: function(searchElement, fromIndex) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If len is 0, return false.
        if (len === 0) {
          return false;
        }

        // 4. Let n be ? ToInteger(fromIndex).
        //    (If fromIndex is undefined, this step produces the value 0.)
        var n = fromIndex | 0;

        // 5. If n ≥ 0, then
        //  a. Let k be n.
        // 6. Else n < 0,
        //  a. Let k be len + n.
        //  b. If k < 0, let k be 0.
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        function sameValueZero(x, y) {
          return x === y ||
            (typeof x === "number" &&
              typeof y === "number" &&
              isNaN(x) &&
              isNaN(y));
        }

        // 7. Repeat, while k < len
        while (k < len) {
          // a. Let elementK be the result of ? Get(O, ! ToString(k)).
          // b. If SameValueZero(searchElement, elementK) is true, return true.
          // c. Increase k by 1.
          if (sameValueZero(o[k], searchElement)) {
            return true;
          }
          k++;
        }

        // 8. Return false
        return false;
      }
    });
  }

  if (!Array.prototype.map) {
    Array.prototype.map = function(callback /*, thisArg*/) {
      var T, A, k;

      if (this == null) {
        throw new TypeError("this is null or not defined");
      }

      // 1. Let O be the result of calling ToObject passing the |this|
      //    value as the argument.
      var O = Object(this);

      // 2. Let lenValue be the result of calling the Get internal
      //    method of O with the argument "length".
      // 3. Let len be ToUint32(lenValue).
      var len = O.length >>> 0;

      // 4. If IsCallable(callback) is false, throw a TypeError exception.
      // See: http://es5.github.com/#x9.11
      if (typeof callback !== "function") {
        throw new TypeError(callback + " is not a function");
      }

      // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
      if (arguments.length > 1) {
        T = arguments[1];
      }

      // 6. Let A be a new array created as if by the expression new Array(len)
      //    where Array is the standard built-in constructor with that name and
      //    len is the value of len.
      A = new Array(len);

      // 7. Let k be 0
      k = 0;

      // 8. Repeat, while k < len
      while (k < len) {
        var kValue, mappedValue;
        if (k in O) {
          // i. Let kValue be the result of calling the Get internal
          //    method of O with argument Pk.
          kValue = O[k];

          // ii. Let mappedValue be the result of calling the Call internal
          //     method of callback with T as the this value and argument
          //     list containing kValue, k, and O.
          mappedValue = callback.call(T, kValue, k, O);

          // For best browser support, use the following:
          A[k] = mappedValue;
        }
        // d. Increase k by 1.
        k++;
      }

      // 9. return A
      return A;
    };
  }

  if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      "use strict";
      if (typeof start !== "number") {
        start = 0;
      }

      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }
}
