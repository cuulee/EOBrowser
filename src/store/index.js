import _                                        from 'lodash'
import URI                                      from 'urijs'
import {calcBboxFromXY}        from '../utils/coords'
import { combineEpics }                         from 'redux-observable';
import {createEpicMiddleware}                   from 'redux-observable'
import {createStore, applyMiddleware, compose}  from 'redux'
import {getMultipliedLayers}    from '../utils/utils'

// eslint-disable-next-line
import rxjs from 'rxjs'

const
  SET_MAXCC =               'SET_MAXCC',
  SET_DATE =                'SET_DATE',
  SET_MIN_DATE =            'SET_MIN_DATE',
  SET_DATASOURCE =          'SET_DATASOURCE',
  SET_DATASOURCES =         'SET_DATASOURCES',
  SET_INSTANCES =           'SET_INSTANCES',
  SET_PRESET =              'SET_PRESET',
  SET_CURR_VIEW =           'SET_CURR_VIEW',
  SET_CHANNELS =            'SET_CHANNELS',
  SET_LAYERS =              'SET_LAYERS',
  SET_PRESETS =             'SET_PRESETS',
  SET_PROBA =               'SET_PROBA',
  SET_BASE64_URLS =         'SET_BASE64_URLS',
  SET_MAP_BOUNDS =          'SET_MAP_BOUNDS',
  SET_EVAL_SCRIPT =         'SET_EVAL_SCRIPT',
  SET_AVAILABLE_DAYS =      'SET_AVAILABLE_DAYS',
  SET_START_LOC =           'SET_START_LOC',
  SET_LAT=                  'SET_LAT',
  SET_LNG=                  'SET_LNG',
  SET_ZOOM =                'SET_ZOOM',
  SET_SIZE =                'SET_SIZE',
  GENERATE_WMS_URL =        'GENERATE_WMS_URL',
  GENERATE_FULL_TILE =      'GENERATE_FULL_TILE',
  REFRESH =                 'REFRESH',
  IS_SEARCHING=             'IS_SEARCHING',
  SET_PATH =                'SET_PATH',
  SET_SEARCH_RESULTS=       'SET_SEARCH_RESULTS',
  CLEAR_SEARCH_RESULTS=     'CLEAR_SEARCH_RESULTS',
  SET_COMPARE_MODE=         'SET_COMPARE_MODE',
  SET_COMPARE_MODE_TYPE=    'SET_COMPARE_MODE_TYPE',
  SET_FILTER_RESULTS=       'SET_FILTER_RESULTS',
  SET_SELECTED_RESULT=      'SET_SELECTED_RESULT',
  ADD_PIN_RESULT=           'ADD_PIN_RESULT',
  REMOVE_PIN=               'REMOVE_PIN',
  CLEAR_PINS=               'CLEAR_PINS',
  SET_ACTIVE_BASE_LAYER =   'SET_ACTIVE_BASE_LAYER'

const Reducers = {
  SET_MAXCC:                (maxcc) => ({ maxcc }),
  SET_DATE:                 (dateTo) => ({dateTo}),
  SET_MIN_DATE:             (dateFrom) => ({dateFrom}),
  SET_DATASOURCE:           (datasource) => ({datasource}),
  SET_DATASOURCES:          (datasources) => ({datasources}),
  SET_PRESET:               setPreset,
  SET_PRESETS:              setPresets,
  SET_CURR_VIEW:            setCurrentView,
  SET_MAP_BOUNDS:           setBoundsAdSquarePerMeter,
  SET_AVAILABLE_DAYS:       (availableDays) => ({availableDays}),
  SET_EVAL_SCRIPT:          setEvalscript,
  SET_CHANNELS:             setChannels,
  SET_START_LOC:            (startLocation) => ({startLocation}),
  SET_BASE64_URLS:          (base64Urls) => ({base64Urls}),
  SET_LAYERS:               setLayers,
  SET_PROBA:                (proba) => ({proba}),
  SET_LAT:                  (lat) => ({lat}),
  SET_LNG:                  (lng) => ({lng}),
  SET_INSTANCES:            (instances, user) => ({instances, user}),
  SET_ZOOM:                 (zoom) => ({zoom}),
  SET_SIZE:                 (size) => ({size}),
  SET_COMPARE_MODE:         (compareMode) => ({compareMode}),
  SET_COMPARE_MODE_TYPE:    (compareModeType) => ({compareModeType}),
  SET_CURRENT_DATE:         (currentDate) => ({currentDate}),
  GENERATE_WMS_URL:         generateWmsUrl,
  GENERATE_FULL_TILE:       generateTileTiffUrl,
  SET_PATH:                 updatePath,
  ADD_PIN_RESULT:           addPinResult,
  REMOVE_PIN:               removePin,
  CLEAR_PINS:               () => ({pinResults: []}),
  REFRESH:                  (doRefresh) => ({doRefresh}),
  SET_ACTIVE_BASE_LAYER:    setActiveBaseLayer,
  IS_SEARCHING:             (isSearching) => ({isSearching}),
  SET_FILTER_RESULTS:       (searchFilterResults) => ({searchFilterResults}),
  SET_SELECTED_RESULT:      (selectedResult) => ({selectedResult}),
  SET_SEARCH_RESULTS:       setSearchResults,
  CLEAR_SEARCH_RESULTS:     clearSearchResults,
}

const DoesNeedRefresh = [
  SET_MAXCC, SET_DATE, SET_PRESET, SET_LAYERS, SET_PROBA, SET_SELECTED_RESULT, SET_CURR_VIEW
]
const DoRefreshUrl = [
  SET_LAT, SET_LNG, SET_ZOOM, SET_EVAL_SCRIPT, SET_MAXCC, SET_DATE, SET_PRESET, SET_LAYERS,SET_CURR_VIEW, SET_SELECTED_RESULT
]

function setChannels(datasource, channels) {
  //since we load and set channels only once, we will also set some default starting bands
  let startLayers = {
    r: channels[0].name,
    g: channels[1].name,
    b: channels[2].name
  }
  this.layers[datasource] = startLayers
  return {
    channels: _.merge(this.channels, {[datasource]: channels})
  }
}

function setPreset(datasource, preset) {
  let currView = preset === 'CUSTOM' ? this.views.BANDS : this.views.PRESETS
  return {
    currView: _.merge(this.currView, {[datasource]: currView}),
    preset: _.merge(this.preset, {[datasource]: preset}),
    datasource: datasource
  }
}
function setPresets(datasource, presets) {
  let preset = Object.keys(presets)[0]
  let currView = preset === 'CUSTOM' ? this.views.BANDS : this.views.PRESETS
  return {
    currView: _.merge(this.currView, {[datasource]: currView}),
    preset: _.merge(this.preset, {[datasource]: preset}),
    presets: _.merge(this.presets, {[datasource]: presets})
  }
}
function setCurrentView(datasource, currView) {
  return {
    currView: _.merge(this.currView, {[datasource]: currView})
  }
}
function setEvalscript(datasource, evalscript) {
  return {
    evalscript: _.merge(this.evalscript, {[datasource]: evalscript})
  }
}
function setLayers(datasource, layers) {
  return {
    evalscript: _.merge(this.evalscript, {[datasource]: btoa("return [" + getMultipliedLayers(this.layers[datasource]) + "]")}),
    layers: _.merge(this.layers, {[datasource]: layers})
  }
}
function addPinResult() {
  let array = this.pinResults
  let pinItem = _.clone(this.selectedResult)
  pinItem.preset = this.preset[this.datasource]
  if (this.preset[this.datasource] === 'CUSTOM') {
    pinItem.layers = this.layers[this.datasource]
    pinItem.evalscript = this.evalscript[this.datasource]
  }
  array.unshift(pinItem)
  return {
    pinResults: array
  }
}
function removePin(index) {
  return {
    pinResults: this.pinResults.filter((obj, i) =>
      i !== index
    )
  }
}

function setBoundsAdSquarePerMeter(bounds, pixelBounds) {
  let equatorLength = 40075016.685578488
  let unitsToMetersRatio = 360 / (equatorLength * Math.cos(this.lat * Math.PI / 180))
  let bboxH = bounds._northEast.lat - bounds._southWest.lat
  let bboxW = bounds._northEast.lng - bounds._southWest.lng
  let imageWidth = bboxW / (unitsToMetersRatio * 10)
  let imageHeight = bboxH / (unitsToMetersRatio * 10)
  return {
    mapBounds: bounds,
    squaresPerMtr: Math.ceil(imageWidth) * Math.ceil(imageHeight)
  }
  // return {meterPerPx: this.metersPerPx = 40075016.686 * Math.abs(Math.cos(this.center.lat * 180/Math.PI)) / Math.pow(2, this.zoom+8)}
}

function updatePath() {
  const store = this
  let params = []
  params.push(`lat=${ store.lat }`)
  params.push(`lng=${ store.lng }`)
  params.push(`zoom=${ store.zoom }`)
  const path = params.join('/')
  window.location.hash = path
  return {path}
}

function setActiveBaseLayer(name, minmax) {
  return {activeBaseLayer: {
    name: name,
    minmax:{min: minmax.min, max: minmax.max}}
  }
}

function setSearchResults(results, datasource, returnParams) {
  return {
    isSearching: false,
    searchResults: _.merge(this.searchResults,{[datasource]: results}),
    searchParams: _.merge(this.searchParams,{[datasource]: returnParams}),
  }
}

function clearSearchResults() {
  return {
    isSearching: false,
    searchResults: {},
    searchParams: {}
  }
}

function generateWmsUrl() {
  if (_.isEmpty(this.selectedResult)) {
    return {imgWmsUrl : ''}
  }
  let activeLayer = _.find(this.instances, {name: this.selectedResult.name})
  let baseUrl = activeLayer.additionalParams.wmsUrl + "?SERVICE=WMS&REQUEST=GetMap"
  const url = new URI(baseUrl)
  let time = this.selectedResult.properties.rawData.time

  url.addQuery('MAXCC', this.maxcc)
  url.addQuery('SHOWLOGO', true)
  url.addQuery('LAYERS', this.preset[this.datasource] === 'CUSTOM' ? _.values(this.layers[this.datasource]).join(",") : this.preset[this.datasource])
  url.addQuery('GAIN', this.gain)
  url.addQuery('CLOUDCORRECTION', this.cloudCorrection)
  url.addQuery('WIDTH', this.size[0] - 50)
  url.addQuery('HEIGHT', this.size[1] - 100)
  url.addQuery('COLCOR', `${this.colCor},BOOST`)
  url.addQuery('NICENAME', `${activeLayer.name} from ${time}.jpg`)
  url.addQuery('FORMAT', 'image/jpeg')
  url.addQuery('BGCOLOR', '00000000')
  url.addQuery('TRANSPARENT', '1')
  url.addQuery('TIME', `${time}/${time}`)
  url.addQuery('BBOX', calcBboxFromXY([this.lat, this.lng], this.zoom).join(','))
  if (this.evalscript[this.datasource] !== '' && this.preset[this.datasource] === 'CUSTOM') {
    url.addQuery('EVALSCRIPT', this.evalscript[this.datasource])
    url.addQuery('EVALSOURCE', activeLayer.additionalParams.evalsource)
  }
  const browserUrl = url.toString().replace(/%2f/gi, '/').replace(/%2c/gi, ',')
  return {imgWmsUrl: browserUrl}
}
function generateTileTiffUrl() {
  if (_.isEmpty(this.selectedResult)) {
    return {imgTiffUrl : ''}
  }
  let time = this.selectedResult.properties.rawData.time
  let activeLayer = _.find(this.instances, {name: this.selectedResult.name})
  let baseUrl = activeLayer.additionalParams.wmsUrl
  baseUrl = baseUrl.replace("wms", "wcs")
  baseUrl += "?SERVICE=WCS&REQUEST=GetCoverage"
  const url = new URI(baseUrl)

  url.addQuery('SHOWLOGO', true)
  url.addQuery('MAXCC', this.maxcc)
  url.addQuery('COVERAGE', this.preset[this.datasource] === 'CUSTOM' ? _.values(this.layers[this.datasource]).join(",") : this.preset[this.datasource])
  url.addQuery('RESX', 10)
  url.addQuery('RESX', 10)
  url.addQuery('FORMAT', 'image/tiff;depth=16')
  url.addQuery('CRS', 'EPSG:3857')
  url.addQuery('TIME', `${time}/${time}`)
  url.addQuery('NICENAME', `${activeLayer.name} from ${time}.tiff`)
  url.addQuery('BBOX', calcBboxFromXY([this.lat, this.lng], this.zoom).join(','))
  if (this.evalscript[this.datasource] !== '' && this.preset[this.datasource] === 'CUSTOM') {
    url.addQuery('EVALSCRIPT', this.evalscript[this.datasource])
    url.addQuery('EVALSOURCE', activeLayer.additionalParams.evalsource)
  }

  const tiffUrl = url.toString().replace(/%2f/gi, '/').replace(/%2c/gi, ',')
  return {imgTiffUrl: tiffUrl}
}

function mustRefresh(actions) {
  // NOTE: even though rxjs documentation says to use .debounce,
  // you are actually supposed to use debounceTime
  return actions.filter(action => DoesNeedRefresh.includes(action.type))
    .debounceTime(600)
    .mapTo({type: REFRESH, args: []})
}
function refreshPath(actions) {
  return actions.filter(action => DoRefreshUrl.includes(action.type))
    .debounceTime(1500)
    .mapTo({type: SET_PATH, args: []})
}

function reducer(currentState, action) {
  if (Reducers[action.type]) {
    return Object.assign({}, currentState,
      Reducers[action.type].call(currentState, ...(action.args)), {action})
  }
  return currentState // DO NOTHING IF NO MATCH
}

const store = createStore(reducer, require('./config'),
  compose(
    applyMiddleware(createEpicMiddleware(combineEpics(mustRefresh, refreshPath))),
    window.devToolsExtension ? window.devToolsExtension() : f => f))

if (window.devToolsExtension) {
  window.devToolsExtension.updateStore(store)
}

function action(x) {
  return (...args) => store.dispatch({type: x, args})
}

module.exports = {
  get current() {
    return store.getState()
  },
  get Store() {
    return store
  },
  get meterPerPx() {
    return this.getMetersPerPixel
  },

  setMaxcc:             action(SET_MAXCC),
  setDate:              action(SET_DATE),
  setDateFrom:          action(SET_MIN_DATE),
  setDatasource:        action(SET_DATASOURCE),
  setDatasources:       action(SET_DATASOURCES),
  setAvailableDates:    action(SET_AVAILABLE_DAYS),
  setPreset:            action(SET_PRESET),
  setPresets:           action(SET_PRESETS),
  setCurrentView:       action(SET_CURR_VIEW),
  setEvalScript:        action(SET_EVAL_SCRIPT),
  setBase64Urls:        action(SET_BASE64_URLS),
  setChannels:          action(SET_CHANNELS),
  setLayers:            action(SET_LAYERS),
  setStartLocation:     action(SET_START_LOC),
  setMapBounds:         action(SET_MAP_BOUNDS),
  setLat:               action(SET_LAT),
  setLng:               action(SET_LNG),
  setZoom:              action(SET_ZOOM),
  setSize:              action(SET_SIZE),
  refresh:              action(REFRESH),
  generateWmsUrl:       action(GENERATE_WMS_URL),
  generateFullTile:     action(GENERATE_FULL_TILE),
  setActiveBaseLayer:   action(SET_ACTIVE_BASE_LAYER),
  setProbaParams:       action(SET_PROBA),
  setSearchingIsOn:     action(IS_SEARCHING),
  setSearchResults:     action(SET_SEARCH_RESULTS),
  clearSearchResults:   action(CLEAR_SEARCH_RESULTS),
  setInstances:         action(SET_INSTANCES),
  setSelectedResult:    action(SET_SELECTED_RESULT),
  setFilterResults:     action(SET_FILTER_RESULTS),
  setCompareMode:       action(SET_COMPARE_MODE),
  setCompareModeType:   action(SET_COMPARE_MODE_TYPE),
  clearPins:            action(CLEAR_PINS),
  removePin:            action(REMOVE_PIN),
  addPinResult:         action(ADD_PIN_RESULT)
}
