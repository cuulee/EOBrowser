import _ from 'lodash'
import L from 'leaflet'
import '../components/ext/leaflet-clip-wms-layer'

export function getMultipliedLayers(layers) {
  let result = []
  for (let layer in layers) {
    if (layers.hasOwnProperty(layer)) {
      result.push(`${layers[layer]}*2.5`)
    }
  }
  return result.join(",")
}

export function addAdditionalParamsToInstance(instances) {
  instances.forEach(instanceObj => {
    let instance = instanceObj.id.split(".")[1],
        baseUrl = "http://" + instanceObj['@id'].split("//")[1].split("/")[0],
        wmsUrl = `${baseUrl}/v1/wms/${instance}`,
    name = instanceObj.name
    let isSentinel = name.includes('Sentinel')
    let landsatSuffix = '', previewPrefix = '', evalsource = 'S2', indexService = ''
    if (isSentinel) {
      previewPrefix = 'http://sentinel-s2-l1c.s3.amazonaws.com'
      indexService = 'http://services.sentinel-hub.com/index/v2'
    } else {
      previewPrefix = 'http://finder.eocloud.eu/files'
      landsatSuffix = name.split(" ")[name.split.length - 1]
      evalsource = `L${landsatSuffix}`
      indexService = `${baseUrl}/index/landsat${landsatSuffix}/v2`
    }
    instanceObj.additionalParams = {
      baseUrl: baseUrl,
      wmsUrl: wmsUrl,
      minZoom: isSentinel ? 4 : 10,
      evalsource: evalsource,
      indexService: indexService,
      previewPrefix: previewPrefix
    }
  })
}

export function createMapLayer(instanceObj, pane, progress) {
  let name = instanceObj.name
  let isSentinel = name.includes('Sentinel')
  let instance = instanceObj.id.split(".")[1],
      baseUrl = "http://" + instanceObj['@id'].split("//")[1].split("/")[0],
      url = `${baseUrl}/v1/wms/${instance}`

  let landsatSuffix = '', previewPrefix = '', evalsource = 'S2', indexService = ''
  if (isSentinel) {
    previewPrefix = 'http://sentinel-s2-l1c.s3.amazonaws.com'
    indexService = 'http://services.sentinel-hub.com/index/v2'
  } else {
    previewPrefix = 'http://finder.eocloud.eu/files'
    landsatSuffix = name.split(" ")[name.split.length - 1]
    evalsource = `L${landsatSuffix}`
    indexService = `${baseUrl}/index/landsat${landsatSuffix}/v2`
  }
  let layer = L.tileLayer.clip(url, {
    showlogo: false,
    tileSize: 512,
    crs: L.CRS.EPSG4326,
    minZoom: instanceObj.additionalParams.minZoom,
    maxZoom: 16,
    pane: pane,
    additionalParams: {
      evalsource: evalsource,
      indexService: indexService,
      previewPrefix: previewPrefix
    },
    name: name
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
  let popup = `
    <img width='200' src="${data.path}" />
    <p>Sensing time: ${data.time}</p>
    <p>Area: ${data.area} km<sup>2</sup></p>
    <p>Cloud coverage: ${data.cloudCoverage} %</p>
    ${sunElevation}
  `
  return {
    "type": "Feature",
    "properties": {
      "popupContent": popup,
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
