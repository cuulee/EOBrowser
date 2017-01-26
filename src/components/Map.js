import React, {PropTypes} from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import _ from 'lodash'
import NProgress from 'nprogress'
import {queryAvailableDates} from '../utils/ajax'
import {getCoordsFromBounds, createMapLayer} from '../utils/utils'
import './ext/leaflet-clip-wms-layer'
import Store from '../store'
import {connect} from 'react-redux'
import 'nprogress/nprogress.css'
import gju from 'geojson-utils'
import errorTileBg from './brokenImage.png'


const styles = {
  map: {
    width: '100%',
    bottom: '0px',
    top: '0px',
    position: 'absolute',
    margin: 0
  },
  layers: {
    position: 'absolute',
    right: '10px',
    top: '50px'
  }
}

let compareLayerLbl = 'compareLayer'
let activeLayerLbl = 'activeLayer'
class RootMap extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      activeLayers: [],
      isLoaded: false,
      query: this.props.formQuery,
      showClip: false,
      location: [],
      instances: {}
    }

    this.mainMap = null
    this.activeLayer = null
    this.allResults = []
    this.compareLayers = []
    this.progress = null
  }

  componentDidMount() {
    const {mapId, lat, lng, zoom} = this.props

    this.progress = NProgress.configure({
      showSpinner: false,
      parent: `#${mapId}`
    });

    //construct baselayers object for control
    let osm = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright" target="_blank">OpenStreetMap</a>',
      name: 'Open Street Map'
    })
    var baseMaps = {
      "Open Stree Map": osm,
    };

    this.mainMap  = L.map(mapId, {
      center: [lat, lng],
      zoom: zoom,
      minZoom: 3,
      layers: [osm]
    })
    this.mainMap.createPane(compareLayerLbl)
    this.mainMap.createPane(activeLayerLbl)
    this.mainMap.getPane(compareLayerLbl).style.zIndex = 650;
    this.mainMap.getPane(activeLayerLbl).style.zIndex = 640;
    this.mainMap.getPane(activeLayerLbl).style.pointerEvents = 'none';
    this.mainMap.getPane(compareLayerLbl).style.pointerEvents = 'none';

    L.control.layers(null, baseMaps).addTo(this.mainMap)

    this.mainMap.zoomControl.setPosition('bottomright')
    this.mainMap.on('moveend', _.throttle(() => {
      Store.setMapBounds(this.mainMap.getBounds(), this.mainMap.getPixelBounds())
      this.handleMoveEnd()
    }), 4000)
    this.mainMap.on('move', () => {
      Store.setLat(this.mainMap.getCenter().lat)
      Store.setLng(this.mainMap.getCenter().wrap().lng)
      Store.setZoom(this.mainMap.getZoom())
    })

    L.control.scale({
      updateWhenIdle: true,
      imperial: false,
      position: "bottomleft"
    }).addTo(this.mainMap)

    this.mainMap.setView([Store.current.lat, Store.current.lng], Store.current.zoom)
    Store.setMapBounds(this.mainMap.getBounds(), this.mainMap.getPixelBounds())
    this.setState({isLoaded: true})
    this.handleMoveEnd()
  }

  componentDidUpdate(prevProps, prevState) {
    if (_.get(this, 'props.action.type') === 'REFRESH') {
      this.visualizeLayer()
    }
    if (!_.isEqual(Store.current.proba, prevProps.proba)) {
      this.updateProba()
    }
    if (Store.current.compareMode !== prevProps.compareMode) {
      this.addPinLayers(Store.current.compareMode)
    }
    if (Store.current.compareMode && prevProps.compareModeType !== Store.current.compareModeType) {
      this.compareLayers.forEach(this.resetLayerParams)
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if (!_.isEqual(this.state.location, nextProps.location) && this.mainMap && nextProps.location) {
      this.setState({location: nextProps.location}, () => this.mainMap.panTo(nextProps.location))
    }
  }

  componentWillUnmount() {
    if (this.mainMap) {
      this.mainMap.remove()
    }
  }

  resetLayerParams(layer) {
    layer.setClip(L.bounds([ 0,0], [window.innerWidth, window.innerHeight]))
    layer.setOpacity(1)
  }

  updatePosition() {
    this.mainMap.setView([Store.current.lat, Store.current.lng], Store.current.zoom);
  }

  showPolygons(data) {
    this.clearPolygons()
    Object.keys(Store.current.searchResults).map(ds => this.allResults = _.concat([...this.allResults], [...Store.current.searchResults[ds]]))
    this.polyHighlight = L.geoJSON(this.allResults, {
      style: Store.current.defaultPolyStyle,
      onEachFeature: this.onEachPolygon,
    })
    this.polyHighlight.addTo(this.mainMap)
    if (Store.current.searchParams.queryBounds !== undefined) {
      this.boundPoly = L.polyline(getCoordsFromBounds(Store.current.searchParams.queryBounds, true), {color: '#c1d82d', dasharray: '5,5', weight: 3, fillColor: 'none'}).addTo(this.mainMap);
    }
  }

  resetHighlight = () => {
    this.polyHighlight.setStyle(Store.current.defaultPolyStyle)
  }

  highlightFeature = (e) => {
    this.resetHighlight(e);
    let layer = e.target;
    layer.setStyle(Store.current.highlightPolyStyle)
    if (e.originalEvent.type === 'click') {
      let obj = {}
      let allResults = []
      Store.current.datasources.forEach(ds => obj[ds] = []) //we prepare object with all searched datasources
      let p = [e.latlng.lng, e.latlng.lat]
      this.allResults.forEach(layer => {
        if (gju.pointInPolygon({
          type: 'Point',
          coordinates: p
        }, layer.geometry)) {
          obj[layer.properties.rawData.datasource].push(layer)
          allResults.push(layer)
        }
      })
      if (allResults.length >= 1) {
        layer.closePopup()
        Store.setFilterResults(obj)
      }
    }
  }

  onEachPolygon = (feature, layer) => {
    let popupContent = feature.properties.popupContent
    layer.bindPopup(popupContent, {
      maxWidth: 400
    });
    layer.on({
      mouseover: this.highlightFeature, 
      mouseout: this.resetHighlight,
      click: this.highlightFeature
    });
  }

  clearPolygons = () => {
    if (this.polyHighlight !== undefined)
      try {
        this.polyHighlight.clearLayers()
      } catch (e) {
        console.warn("failed clearing polygons")
      }
    this.boundPoly && this.mainMap.removeLayer(this.boundPoly)
    this.allResults = []
  }

  togglePolygons = (isVisible) => {
    let showClip = !isVisible
    if (this.state.showClip !== showClip) {
      this.setState({showClip: showClip}, () => {
        this.activeLayer && !this.state.showClip && this.mainMap.removeLayer(this.activeLayer)
      })
    }
    if (this.polyHighlight !== undefined) {
      if (!isVisible) {
        this.mainMap.removeLayer(this.polyHighlight)
        if (this.mainMap.hasLayer(this.activeLayer)) {
          this.mainMap.removeLayer(this.activeLayer)
        }
      } else {
        this.mainMap.addLayer(this.polyHighlight)
      }
    }
    this.boundPoly && this.mainMap.removeLayer(this.boundPoly)
  }

  zoomToActivePolygon = () => {
    let {selectedResult: result} = Store.current
    let map = this.mainMap
    let activeLayerZoom = this.activeLayer.options.minZoom
    if (Number(Store.current.zoom) < Number(activeLayerZoom)) {
      Store.setZoom(activeLayerZoom)
    }
    let center = new L.LatLngBounds(result.geometry.coordinates[0]).getCenter();
    map.setView([center.lng, center.lat])
  }

  activateTile = (i, activate, geom, useOwnPreset) => {
    this.resetHighlight()
    let layersArray = Object.keys(this.polyHighlight._layers)
    if (activate) {
      let itemPreset = ''
      let {datasource: ds} = geom.properties.rawData
      Store.setDatasource(ds)
      let item = Store.current.pinResults[i]
      let isCustom = item && item.preset === 'CUSTOM'
      if (useOwnPreset) {
        itemPreset = item.preset
        if (isCustom) {
          Store.setLayers(ds, item.layers)
          item.evalscript && item.evalscript !=='' && Store.setEvalScript(ds, item.evalscript)
        }
      }
      let preset = useOwnPreset ? itemPreset : Object.keys(Store.current.presets[ds])[0]
      Store.setPreset(ds, preset)
      geom.preset = preset
      if (!isCustom) {
        geom.name = Store.current.datasource
      }
      Store.setSelectedResult(geom)
      this.togglePolygons(false)
      return
    }
    this.polyHighlight._layers[layersArray[i]].setStyle(Store.current.highlightPolyStyle)
  }

  isCustom(obj) {
    return this.getActivePreset(obj) === 'CUSTOM'
  }

  getActivePreset(obj) {
    return obj ? obj.preset : Store.current.preset[Store.current.selectedResult.name]
  }

  getLayersString(obj) {
    return this.isCustom(obj) ? _.values(obj ? obj.layers : Store.current.layers[Store.current.selectedResult.name]).join(",") : this.getActivePreset(obj)
  }

  updateProba() {
    let proba = Store.current.probaLayer
    let {show} = this.props.proba
    if (show && !this.state.showClip) {
      delete(proba.wmtsParams.additionalParams);
      let params = {
        time: this.props.proba.date,
        layer: this.props.proba.activeLayer
      }
      proba.setParams(params)
      if (!this.mainMap.hasLayer(proba)) {
        this.mainMap.addLayer(proba)
        proba.bringToFront()
      }
    } else {
      this.mainMap.removeLayer(proba)
    }
  }

  visualizeLayer() {
    this.addPinLayers(false)
    if (_.isEmpty(Store.current.selectedResult)) {
      return
    }
    if (this.activeLayer !== null) {
      this.mainMap.removeLayer(this.activeLayer)
    }
    let layer = createMapLayer(_.find(Store.current.instances, {name: Store.current.selectedResult.name}), activeLayerLbl, this.progress)
    this.activeLayer = layer
    if (this.state.showClip) {
      this.activeLayer.setParams(this.getUpdateParams())
      if (!this.mainMap.hasLayer(this.activeLayer)) {
        this.activeLayer.options.pane = activeLayerLbl
        this.activeLayer.addTo(this.mainMap)
      }
    }
  }

  // App.js handles in onCompareChange
  addPinLayers = (isCompare, tabIndex) => {
    if (isCompare) {
      this.mainMap.removeLayer(this.activeLayer)
      let pins = [...Store.current.pinResults]
      pins.reverse().forEach(item => {
        let {instances} = Store.current
        let layer = createMapLayer(_.find(instances, {name: item.name}), compareLayerLbl, this.progress)
        layer.setParams(this.getUpdateParams(layer.options, item))
        layer.options.pane = compareLayerLbl
        layer.addTo(this.mainMap)
        this.compareLayers.push(layer)
      })
    } else {
      this.compareLayers.forEach(l => this.mainMap.removeLayer(l))
      this.compareLayers = []
      if (this.activeLayer && tabIndex === 2) {
        this.activeLayer.options.pane = activeLayerLbl
        this.activeLayer.addTo(this.mainMap)
      }
      Store.setCompareMode(false)
    }
  }

  setOverlayParams = (arr, index) => {
    let mapIndex = Store.current.pinResults.length - (index + 1)
    if (Store.current.compareModeType === 'opacity') {
      this.compareLayers[mapIndex].setOpacity(arr[1])
    } else {
      this.compareLayers[mapIndex].setClip(L.bounds([ window.innerWidth * arr[0], 0 ], [window.innerWidth * arr[1], window.innerHeight]))
    }
  }

  getUpdateParams(options, item) {
    let {datasource, selectedResult, compareMode} = Store.current
    let rawData = selectedResult.properties.rawData
    let activeLayer = this.activeLayer
    let obj = {}
    let time = rawData.time
    let evalS = ''
    let evalSource = ''
    obj.format = 'image/png'
    obj.errorTileUrl = errorTileBg
    obj.pane = compareMode ? compareLayerLbl : activeLayerLbl
    obj.transparent = true
    obj.maxcc = Store.current.maxcc
    obj.layers = this.getLayersString(item)
    if (this.isCustom() && !compareMode) {
      let storeEvalScript = Store.current.evalscript[datasource]
      if (storeEvalScript !== '' && storeEvalScript !== undefined) {
        evalS = storeEvalScript
        evalSource = activeLayer.options.additionalParams.evalsource
      }
      obj.evalscript = evalS
      obj.evalsource = evalSource
    } else {
        delete activeLayer.wmsParams.evalscript
    }
    if (item) {
      if (this.isCustom(item)) {
        if (item.evalscript) {
            obj.evalscript = item.evalscript
        }
      } else {
        delete activeLayer.wmsParams.evalscript
      }
      time = item.properties.rawData.time
      obj.evalsource = options.additionalParams.evalsource
      obj.layers = item.preset
      if (item.preset === 'CUSTOM') {
        if (item.evalscript) {
            obj.evalscript = item.evalscript
        }
        obj.layers = Object.values(item.layers).join(",")
      }
    }

    obj.time = `${time}/${time}`
    delete obj.additionalParams
    return obj
  }

  handleMoveEnd() {
    if (Store.current.datasources.length === 1 && Store.current.zoom > 6) {
      queryAvailableDates()
    } else {
      //it will be too much requests to query through all datasources for available dates
      Store.setAvailableDates([])
    }
  }

  render() {
    return <div style={styles.map} id={this.props.mapId}>
      <a id="aboutSentinel" target="_blank" href="http://www.sentinel-hub.com">About Sentinel Hub</a>
    </div>
  }
}
RootMap.propTypes = {
  location: PropTypes.array,
  mapId: PropTypes.string.isRequired,
}

export default connect(store => store, null, null, { withRef: true })(RootMap)
