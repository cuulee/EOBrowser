import _                                       from 'lodash'
import URI                                     from 'urijs'
import {calcBboxFromXY}                        from '../utils/coords'
import { combineEpics }                        from 'redux-observable';
import {createEpicMiddleware}                  from 'redux-observable'
import {createStore, applyMiddleware, compose} from 'redux'
import {getMultipliedLayers, 
        getNativeRes, 
        syncPinsWithLocalStorage,
        b64EncodeUnicode}                   from '../utils/utils'

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
  SET_PROBA_LAYERS =        'SET_PROBA_LAYERS',
  SET_BASE64_URLS =         'SET_BASE64_URLS',
  SET_MAP_BOUNDS =          'SET_MAP_BOUNDS',
  SET_EVAL_SCRIPT =         'SET_EVAL_SCRIPT',
  SET_AVAILABLE_DAYS =      'SET_AVAILABLE_DAYS',
  SET_START_LOC =           'SET_START_LOC',
  SET_LAT=                  'SET_LAT',
  SET_LNG=                  'SET_LNG',
  SET_ZOOM =                'SET_ZOOM',
  SET_SIZE =                'SET_SIZE',
  GENERATE_IMAGE_LINK =     'GENERATE_IMAGE_LINK',
  REFRESH =                 'REFRESH',
  IS_SEARCHING=             'IS_SEARCHING',
  SET_PATH =                'SET_PATH',
  SET_TAB_INDEX =           'SET_TAB_INDEX',
  SET_SEARCH_RESULTS=       'SET_SEARCH_RESULTS',
  CLEAR_SEARCH_RESULTS=     'CLEAR_SEARCH_RESULTS',
  SET_COMPARE_MODE=         'SET_COMPARE_MODE',
  SET_COMPARE_MODE_TYPE=    'SET_COMPARE_MODE_TYPE',
  SET_FILTER_RESULTS=       'SET_FILTER_RESULTS',
  SET_SELECTED_RESULT=      'SET_SELECTED_RESULT',
  ADD_PIN_RESULT=           'ADD_PIN_RESULT',
  TOGGLE_ACTIVE_LAYER=      'TOGGLE_ACTIVE_LAYER',
  REMOVE_PIN=               'REMOVE_PIN',
  CLEAR_PINS=               'CLEAR_PINS',
  SHOW_LOGIN=               'SHOW_LOGIN',
  SET_ACTIVE_BASE_LAYER =   'SET_ACTIVE_BASE_LAYER',
  SET_SELECTED_CRS =        'SET_SELECTED_CRS',
  SET_DOWNLOADABLE_IMAGE_TYPE = 'SET_DOWNLOADABLE_IMAGE_TYPE'

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
  SET_PROBA_LAYERS:         (probaLayers) => ({probaLayers}),
  SET_LAT:                  (lat) => ({lat}),
  SET_LNG:                  (lng) => ({lng}),
  SET_INSTANCES:            (instances, user) => ({instances, user}),
  SET_ZOOM:                 (zoom) => ({zoom}),
  SET_TAB_INDEX:            (mainTabIndex) => ({mainTabIndex}),
  SET_SIZE:                 (size) => ({size}),
  SET_COMPARE_MODE:         (compareMode) => ({compareMode}),
  SET_COMPARE_MODE_TYPE:    (compareModeType) => ({compareModeType}),
  SET_CURRENT_DATE:         (currentDate) => ({currentDate}),
  TOGGLE_ACTIVE_LAYER:      (isActiveLayerVisible) => ({isActiveLayerVisible}),
  GENERATE_IMAGE_LINK:      generateImageLink,
  SET_PATH:                 updatePath,
  ADD_PIN_RESULT:           addPinResult,
  REMOVE_PIN:               removePin,
  CLEAR_PINS:               clearPins,
  REFRESH:                  (doRefresh) => ({doRefresh}),
  SET_ACTIVE_BASE_LAYER:    setActiveBaseLayer,
  SET_SELECTED_CRS:         (selectedCrs) => ({selectedCrs}),
  SET_DOWNLOADABLE_IMAGE_TYPE: (downloadableImageType) => ({downloadableImageType}),
  IS_SEARCHING:             (isSearching) => ({isSearching}),
  SHOW_LOGIN:               (showLogin) => ({showLogin}),
  SET_FILTER_RESULTS:       (searchFilterResults) => ({searchFilterResults}),
  SET_SELECTED_RESULT:      (selectedResult) => ({selectedResult}),
  SET_SEARCH_RESULTS:       setSearchResults,
  CLEAR_SEARCH_RESULTS:     clearSearchResults,
}

const DoesNeedRefresh = [
  SET_PRESET, SET_LAYERS, SET_PROBA, SET_SELECTED_RESULT, SET_EVAL_SCRIPT
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
  const currView = preset === 'CUSTOM' ? this.views.BANDS : this.views.PRESETS
  return {
    currView: _.merge(this.currView, {[datasource]: currView}),
    preset: _.merge(this.preset, {[datasource]: preset}),
    datasource: datasource
  }
}
function setPresets(datasource, presets) {
  const preset = Object.keys(presets)[0]
  const currView = preset === 'CUSTOM' ? this.views.BANDS : this.views.PRESETS

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
  let script = b64EncodeUnicode("return [" + getMultipliedLayers(this.layers[datasource]) + "]")

  return {
    evalscript: _.merge(this.evalscript, {[datasource]: script}),
    // selectedResult: _.merge(this.selectedResult, {layers: layers, evalscript: script}),
    layers: _.merge(this.layers, {[datasource]: layers})
  }
}

function addPinResult(item) {
  let array = this.pinResults
  let pinItem = _.clone(item)
  // all logic has been moved to AddPin.js#buildPinObject
  array.unshift(pinItem)
  let result = array

  syncPinsWithLocalStorage(result)

  return {
    pinResults: result
  };
}
function removePin(index) {
  let result = this.pinResults.filter((obj, i) =>
    i !== index
  )
  
  syncPinsWithLocalStorage(result)

  return {
    pinResults: result
  }
}
function clearPins() {
  let result = []

  syncPinsWithLocalStorage(result)

  return {
    pinResults: result
  }
}

function setBoundsAdSquarePerMeter(bounds, pixelBounds) {
  const equatorLength = 40075016.685578488
  const unitsToMetersRatio = 360 / (equatorLength * Math.cos(this.lat * Math.PI / 180))
  const bboxH = bounds._northEast.lat - bounds._southWest.lat
  const bboxW = bounds._northEast.lng - bounds._southWest.lng
  let res = getNativeRes()
  const imageWidth = bboxW / (unitsToMetersRatio * res)
  const imageHeight = bboxH / (unitsToMetersRatio * res)
  return {
    mapBounds: bounds,
    squaresPerMtr: [Math.ceil(imageWidth), Math.ceil(imageHeight)]
  }
}

function updatePath() {
  let params = []
  params.push(`lat=${ this.lat }`)
  params.push(`lng=${ this.lng }`)
  params.push(`zoom=${ this.zoom }`)
  
  if (!_.isEmpty(this.selectedResult) && this.isActiveLayerVisible) {
    params.push(`datasource=${ encodeURIComponent(this.selectedResult.name) }`)
    params.push(`time=${ this.selectedResult.properties.rawData.time }`)
    params.push(`preset=${this.preset[this.selectedResult.name]}`)
    if (this.selectedResult.preset === 'CUSTOM') {
      params.push(`layers=${_.values(this.layers[this.datasource]).join(",")}`)
      params.push(`evalscript=${this.evalscript[this.datasource]}`)
    }
  }
  
  const path = params.join('&')
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

function generateImageLink(tiff = false) {
  // isEmpty
  let isEmpty = _.isEmpty(this.selectedResult)
  
  if(isEmpty && tiff) return {imgTiffUrl : ''}
  if(isEmpty && !tiff) return {imgWmsUrl : ''}

  // vars
  let activeLayer = _.find(this.instances, {name: this.selectedResult.name})
  let time = this.selectedResult.properties.rawData.time

  let baseUrl = activeLayer.additionalParams.wmsUrl
  if(tiff) {
    baseUrl = baseUrl.replace("wms", "wcs")
    baseUrl += '?SERVICE=WCS&REQUEST=GetCoverage'
  } else {
    baseUrl += '?SERVICE=WMS&REQUEST=GetMap'
  }
  const url = new URI(baseUrl)

  let res
  if(tiff)
    res = getNativeRes()
  
  // build url
  url.addQuery('SHOWLOGO', false)
  url.addQuery('MAXCC', 100)
  url.addQuery('TIME', `${time}/${time}`)
  url.addQuery('CRS', !tiff ? 'EPSG:3857' : this.selectedCrs) 
  if(this.selectedCrs === 'EPSG:4326' && tiff) {
    url.addQuery('BBOX', this.mapBounds.toBBoxString().split(",").reverse().join(","))
  } else {
    url.addQuery('BBOX', calcBboxFromXY([this.lat, this.lng], this.zoom).join(','))
  }
  if (this.evalscript[this.datasource] !== '' && this.preset[this.datasource] === 'CUSTOM') {
    url.addQuery('EVALSCRIPT', this.evalscript[this.datasource])
    url.addQuery('EVALSOURCE', activeLayer.additionalParams.evalsource)
  }

  if(tiff) {
    url.addQuery('NICENAME', `${activeLayer.name} from ${time}.tiff`)
    url.addQuery('COVERAGE', this.preset[this.datasource] === 'CUSTOM' ? _.values(this.layers[this.datasource]).join(",") : this.preset[this.datasource])
    url.addQuery('RESX', res+"m")
    url.addQuery('RESY', res+"m")
    url.addQuery('FORMAT', 'image/tiff;depth=16')
  } else {
    url.addQuery('NICENAME', `${activeLayer.name} from ${time}.jpg`)
    url.addQuery('LAYERS', this.preset[this.datasource] === 'CUSTOM' ? _.values(this.layers[this.datasource]).join(",") : this.preset[this.datasource])
    url.addQuery('GAIN', this.gain)
    url.addQuery('CLOUDCORRECTION', this.cloudCorrection)
    url.addQuery('WIDTH', this.size[0] - 50)
    url.addQuery('HEIGHT', this.size[1] - 100)
    url.addQuery('FORMAT', 'image/jpeg')
    url.addQuery('BGCOLOR', '00000000')
    url.addQuery('TRANSPARENT', '1')
  }

  // return
  if(tiff) {
    const tiffUrl = url.toString().replace(/%2f/gi, '/').replace(/%2c/gi, ',')
    return {imgTiffUrl: tiffUrl}
  } else {
    const browserUrl = url.toString().replace(/%2f/gi, '/').replace(/%2c/gi, ',')
    let proxyUrl = process.env.REACT_APP_PROXY_URL 
    let imageType = '.jpg' // could also be set to '.jpg' 
    let proxyLink = `${proxyUrl}/${encodeURIComponent(browserUrl)}${imageType}`
    return {imgWmsUrl: proxyLink} 
  }

  // fin.
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

export default {
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
  setTabIndex:          action(SET_TAB_INDEX),
  refresh:              action(REFRESH),
  toggleActiveLayer:    action(TOGGLE_ACTIVE_LAYER),
  generateImageLink:    action(GENERATE_IMAGE_LINK),
  setActiveBaseLayer:   action(SET_ACTIVE_BASE_LAYER),
  setProbaParams:       action(SET_PROBA),
  setProbaLayers:       action(SET_PROBA_LAYERS),
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
  addPinResult:         action(ADD_PIN_RESULT),
  showLogin:            action(SHOW_LOGIN),
  setSelectedCrs:       action(SET_SELECTED_CRS),
  setDownloadableImageType: action(SET_DOWNLOADABLE_IMAGE_TYPE)
}