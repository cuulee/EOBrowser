import request from 'superagent';
import xml2jsParser from 'superagent-xml2jsparser';
import Store from '../store'
import moment from 'moment'
import _ from 'lodash'
import {getGeoJson, getCoordsFromBounds} from './utils'

export function loadGetCapabilities(instanceObj) {
  return new Promise((resolve, reject) => {
    var parseString = require('xml2js').parseString;
    let instanceName = instanceObj.name,
        wmsUrl = instanceObj.additionalParams.wmsUrl
    request.get(`${wmsUrl}?SERVICE=WMS&REQUEST=GetCapabilities`)
      .accept('xml')
      .parse(xml2jsParser)
      .end((err, res) => {
        if (res && res.ok) {
          parseString(res.text, function (err, result) {
            if (result) {
              let layers = result.WMS_Capabilities.Capability[0].Layer[0].Layer
              var myRegexp = /^B[0-9][0-9A]/i; //excluse "B01", "B8A" etc. layer names
              let channels = [], presets = {}
              for (let l in layers) {
                if (layers.hasOwnProperty(l)) {
                  let layerName = layers[l].Name[0]
                  if (layerName === "FILL") break

                  if (myRegexp.test(layerName)) {
                    //fill bands
                    channels.push({
                      name: layerName,
                      desc: layers[l].Abstract !== undefined ? layers[l].Abstract[0].split("|")[0] : '',
                      color: (layers[l].Abstract[0].split("|")[1] !== undefined) ? layers[l].Abstract[0].split("|")[1] : "red"
                    });

                  } else {
                    presets[layerName] = {
                      name: layers[l].Title[0],
                      desc: layers[l].Abstract !== undefined ? layers[l].Abstract[0] : '',
                      image: `${wmsUrl}&SERVICE=WMS&REQUEST=GetMap&show&LAYERS=${layerName}&BBOX=-19482,6718451,-18718,6719216&MAXCC=20&WIDTH=40&HEIGHT=40&gain=1&FORMAT=image/jpeg&bgcolor=00000000&transparent=1&TIME=2015-01-01/2016-08-04`
                    }
                  }
                }
              }
              //set first active preset if none defined
              if (channels.length > 0) {
                Store.setChannels(instanceName, channels)
                Store.setLayers(instanceName, {
                  r: channels[0].name,
                  g: channels[1].name,
                  b: channels[2].name,
                })
              }
              Store.setPresets(instanceName, presets)
              resolve()
            } else if (err) {
              reject(err)
            }
          });
        } else if (err) {
            reject(err)
        }
      })
  })
}

export function queryAvailableDates() {
  let {datasources} = Store.current
  if (datasources.length === 1) {
    queryIndex(true, datasources[0])
  }
}

export function logout() {
  return new Promise((resolve, reject) => {
    request.get(`http://services.eocloud.sentinel-hub.com/v1/sessions/logout`).end((err, res) => {
      if (res && res.ok) {
        resolve(res.body)
      }
      if (err) {
        reject(err)
      }
    })
  })
}

export function queryIndex(onlyDates, datasource, queryParams) {
  const activeLayer = _.find(Store.current.instances, {name: datasource})
  if (activeLayer === undefined) {
    return
  }
  queryParams = _.cloneDeep(queryParams)
  let bounds = Store.current.mapBounds
  if (!onlyDates) {
    Store.setSearchingIsOn(true)
  }
  if (!_.get(queryParams,'firstSearch') && _.get(queryParams,'queryBounds') !== undefined) {
    bounds = queryParams.queryBounds
  }
  return new Promise((resolve, reject) => {
    var polygon = {
      "type": "Polygon",
      "crs": {
        "type": "name",
        "properties": {
          "name": "urn:ogc:def:crs:EPSG::4326"
        }
      },
      "coordinates": [getCoordsFromBounds(bounds, false)]
    };
    let today =  moment().hour(23).minute(59)
    let maxDate = today.format("YYYY-MM-DDTHH:mm:ss");
    let minDate = onlyDates ? Store.current.minDate.format(Store.current.dateFormat) : moment(Store.current.dateFrom).format("YYYY-MM-DDTHH:mm:ss");
    let url = activeLayer.additionalParams.indexService
    let pageSize = 50
    let isSentinel = datasource.includes('Sentinel')
    if (onlyDates) {
      if (isSentinel) {
        url = "http://services.sentinel-hub.com/index/v2"
      }
      url += `/${isSentinel ? 'finddates' : 'dates'}/?timefrom=${minDate}&timeto=${maxDate}&maxcc=${Store.current.maxcc / 100}`
    } else {
      var offset = 0
      if (!queryParams.firstSearch) {
        offset += queryParams.multiplyOffset * pageSize
      }
      let from = queryParams.timeFrom.format("YYYY-MM-DDTHH:mm:ss");
      maxDate = queryParams.timeTo.hour(23).minute(59).format("YYYY-MM-DDTHH:mm:ss");
      url += `/search?expand=true&timefrom=${from}&timeto=${maxDate}&maxcc=${queryParams.cloudCoverPercentage / 100}&maxcount=${pageSize}&offset=${offset}`
    }
    request.post(url)
      .set({
        'Content-Type': 'application/json',
        'Accept-CRS':   'EPSG:4326'
      })
      .type('json')
      .send(polygon)
      .end((err, res) => {
        if (res && res.ok) {
          if (onlyDates) {
            Store.setAvailableDates(JSON.parse(res.text));
            resolve()
          } else {
            // this is for querying geometries
            let searchReturned = {
              hasMore: res.body.hasMore,
              maxOrderKey: res.body.maxOrderKey,
              queryBounds: bounds
            }
            if (res.body.tiles.length === 0) {
              resolve({results:[], params: {[datasource]: queryParams}, datasource: datasource})
            }
            let results = []
            res.body.tiles.forEach((tile, i) => {
              let previewUrl = isSentinel
                ? activeLayer.additionalParams.previewPrefix+"/"+tile.pathFragment+'/preview.jpg'
                : (tile.previewUrl === '') ? '' : (tile.previewUrl + '.JPG')
              let sourceUrl = ""
              sourceUrl += isSentinel ? "/eodata/Sentinel-2/"+tile.eoPathFragment : tile.pathFragment
              if (isSentinel) {
                sourceUrl = sourceUrl.split(".SAFE")[0]
              } else {
                sourceUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf("/") + 1);
              }
              let item = {
                time: moment(tile.sensingTime).format("YYYY-MM-DD"),
                cloudCoverage: tile.cloudCoverPercentage,
                sourcePath: sourceUrl,
                path: previewUrl,
                datasource: datasource,
                prettyName: datasource.replace("_", ""),
                additionalParams: activeLayer.additionalParams,
                id: tile.id,
              }
              if (tile.area) item['area'] = Number(tile.area / 1000000).toFixed(2)
              if (tile.sunElevation) item['sunElevation'] = tile.sunElevation

              results.push(getGeoJson(tile.tileDrawRegionGeometry, item, (i + offset), Store.current.defaultPolyStyle))
            })
            if (!queryParams.firstSearch) {
                results = _.concat(Store.current.searchResults[datasource], results)
            }
            resolve({results: results, params: _.merge(queryParams, searchReturned), datasource: datasource})
          }
        } else {
          if (onlyDates) {
            reject(err)
          } else {
            Store.setSearchingIsOn(false)
            reject(err)
          }
        }
      })
  })
}
