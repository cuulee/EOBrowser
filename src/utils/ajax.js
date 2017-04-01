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
    request.get(`${wmsUrl}?SERVICE=WMS&REQUEST=GetCapabilities&time=${new Date().valueOf()}`)
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
                  const splitName = layerName.split(".")[1]
                  if (layerName === "FILL" || splitName === "FILL") break

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
                      image: `http://${wmsUrl}&SERVICE=WMS&REQUEST=GetMap&show&LAYERS=${layerName}&BBOX=-19482,6718451,-18718,6719216&MAXCC=20&WIDTH=40&HEIGHT=40&gain=1&FORMAT=image/jpeg&bgcolor=00000000&transparent=1&TIME=2015-01-01/2016-08-04`
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

export function loadProbaCapabilities() {
  return new Promise((resolve, reject) => {
    let parseString = require('xml2js').parseString;
    request.get('https://proba-v-mep.esa.int/applications/geo-viewer/app/mapcache/wmts?service=WMTS&request=GetCapabilities')
      .accept('xml')
      .parse(xml2jsParser)
      .end((err, res) => {
        if (res && res.ok) {
          parseString(res.text, function (err, result) {
            if (result) {
              let probaLayers = {}
              result.Capabilities.Contents[0].Layer.forEach(layer => {
                const {
                  ['ows:Title']: title, 
                  Dimension: dates}
                 = layer
                 probaLayers[title] = {dates: dates[0].Value}
              })
              Store.setProbaLayers(probaLayers)
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
  const isAws = process.env.REACT_APP_TARGET === 'aws'
  return new Promise((resolve, reject) => {
    request.get(`http://services.sentinel-hub.com/wms/configuration/v1/sessions/logout`).end((err, res) => {
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
  if (activeLayer === undefined || (activeLayer.name === 'Sentinel-3') && onlyDates) {
    return Promise.reject()
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
    let url = _.get(activeLayer,'additionalParams.indexService')
    let pageSize = 50
    let isFromAWS = datasource.includes('USGS')
    let isSentinel = datasource.includes('Sentinel')
    let isSentinel3 = datasource === 'Sentinel-3'
    if (onlyDates) {
      if (queryParams) {
        const {from: dateFrom, to: dateTo} = queryParams  
        minDate = dateFrom
        maxDate = dateTo
      } else {
        minDate = isSentinel || datasource.includes('Landsat 8') ? '2015-01-01' : '1983-01-01'
        if (!isSentinel || datasource.includes(['Landsat 5, Landsat 7'])) {
          maxDate = '2003-01-01'
        }
      }
      url += `/${(isFromAWS || isSentinel) ? 'finddates' : 'dates'}/?timefrom=${minDate}&timeto=${maxDate}&maxcc=${Store.current.maxcc / 100}`
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
              // this is mainly used for ResultItem.js to show various info
              let previewUrl = ''
              if (!isSentinel3) {
                const suffix = datasource.includes('USGS') ? '_thumb_small.jpg' : '/preview.jpg'
                previewUrl = (isSentinel || isFromAWS)
                  ? activeLayer.additionalParams.previewPrefix + "/" + tile.pathFragment + suffix
                  : (tile.previewUrl === '') ? '' : (tile.previewUrl + '.JPG')
              }
              let sourcePath = ""
              let isS2 = datasource === 'Sentinel-2'
              if (!isS2) {
                sourcePath += tile.pathFragment
              } else if (isSentinel) {
                sourcePath += isS2 ? "/eodata/Sentinel-2/"+tile.eoPathFragment : tile.pathFragment
              }
              if (isSentinel) {
                sourcePath = sourcePath.split(".SAFE")[0]
              } else {
                sourcePath = sourcePath.substring(0, sourcePath.lastIndexOf("/") + 1);
              }
              if(isSentinel3) {
                let path = tile.pathFragment;
                let pattern = /^.*Sentinel-3\/(.*)\/(.*)\.SEN3$/i;
                let matches = pattern.exec(path);

                if(matches !== null) {
                  previewUrl = `http://finder.eocloud.eu/files/Sentinel-3/${matches[1]}/${matches[2]}.SEN3/${matches[2]}-ql.jpg`;
                } 
              }
              let item = {
                time: moment(tile.sensingTime).format("YYYY-MM-DD"),
                sensingTime: moment(tile.sensingTime).format("h:mm:ss A"),
                cloudCoverage: tile.cloudCoverPercentage,
                sourcePath: sourcePath,
                previewUrl: previewUrl,
                datasource: datasource,
                prettyName: datasource.replace("_", ""),
                additionalParams: activeLayer.additionalParams,
                id: tile.id,
              }
              if (isS2) {
                item.crs = "EPSG:"+tile.tileGeometry.crs.properties.name.split("::")[1]
                const mgrsPath = tile.pathFragment.split("/")
                item.mgrs = mgrsPath[1]+mgrsPath[2]+mgrsPath[3]
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