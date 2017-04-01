import React, {PropTypes} from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import _ from 'lodash'
import NProgress from 'nprogress'
import {queryAvailableDates} from '../utils/ajax'
import {getCoordsFromBounds, createMapLayer, getActivePreset, evalSourcesMap, isCustom, getLayersString} from '../utils/utils'
import './ext/leaflet-clip-wms-layer'
import Store from '../store'
import {connect} from 'react-redux'
import 'nprogress/nprogress.css'
import gju from 'geojson-utils'

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
      "Open Street Map": osm,
    };

    this.mainMap  = L.map(mapId, {
      center: [lat, lng],
      zoom: zoom,
      minZoom: 3,
      layers: [osm],
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
    }), 4000)
    this.mainMap.on('move', () => {
      Store.setLat(this.mainMap.getCenter().lat)
      Store.setLng(this.mainMap.getCenter().wrap().lng)
      Store.setZoom(this.mainMap.getZoom())
    })
    this.mainMap.on('resize', () => {
      this.resetAllLayers()
    })

    L.control.scale({
      updateWhenIdle: true,
      imperial: false,
      position: "bottomleft"
    }).addTo(this.mainMap)

    this.mainMap.setView([Store.current.lat, Store.current.lng], Store.current.zoom)
    Store.setMapBounds(this.mainMap.getBounds(), this.mainMap.getPixelBounds())
    this.setState({isLoaded: true})

    this.visualizeLayer()
  }

  addRemoveActiveLayer(show) {
    this.activeLayer && (!show ? this.mainMap.removeLayer(this.activeLayer) : this.activeLayer.addTo(this.mainMap))
  }

  componentDidUpdate(prevProps, prevState) {
    const {mainTabIndex} = Store.current
    if (_.get(this, 'props.action.type') === 'REFRESH') {
      this.visualizeLayer()
    }
    // check tab switching
    if (prevProps.mainTabIndex !== mainTabIndex) {
      this.addRemoveActiveLayer(mainTabIndex === 2)
      this.togglePolygons(mainTabIndex === 1)
      this.addPinLayers()
    }
    if (_.get(this, 'props.action.type') === 'TOGGLE_ACTIVE_LAYER') {
      this.addRemoveActiveLayer(Store.current.isActiveLayerVisible)
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

  resetAllLayers() {
    this.mainMap.eachLayer(layer => {
      if (layer.options.clip && !Store.current.compareMode) {
        this.resetLayerParams(layer)
      }
    })
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
    if(this.polyHighlight) this.resetHighlight()

    let layersArray = []
    if(this.polyHighlight && this.polyHighlight._layers != undefined)
      layersArray = Object.keys(this.polyHighlight._layers)
    
    if (activate) {
      let itemPreset = ''
      let {datasource: ds} = geom.properties.rawData
      Store.setDatasource(ds)
      let item = Store.current.pinResults[i]
      if (useOwnPreset) {
        itemPreset = item.preset
        if (isCustom(item)) {
          Store.setLayers(ds, item.layers)
          item.evalscript && item.evalscript !=='' && Store.setEvalScript(ds, item.evalscript)
        }
      }
      let preset = useOwnPreset ? itemPreset : Object.keys(Store.current.presets[ds])[0]
      Store.setPreset(ds, preset)
      geom.preset = preset
      geom.name = Store.current.datasource
      this.togglePolygons(false)
      return
    }
    
    if(this.polyHighlight && this.polyHighlight._layers != undefined)
      this.polyHighlight._layers[layersArray[i]].setStyle(Store.current.highlightPolyStyle)
  }

  onZoomToPin(item) {
    if(item && item.map)
      this.mainMap.setView(L.latLng(item.map.latitude, item.map.longitude), item.map.zoom, { animation: true });
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
    const layerFromInstance = _.find(Store.current.instances, {name: Store.current.selectedResult.name})
    if (!layerFromInstance) {
      Store.setSelectedResult({})
      Store.setSearchResults([])
      this.clearPolygons()
      return // selected layer was not found in user instances
    }
    let layer = createMapLayer(layerFromInstance, activeLayerLbl, this.progress)
    this.activeLayer = layer
    if (Store.current.mainTabIndex === 2) {
      this.activeLayer.setParams(this.getUpdateParams())
      if (!this.mainMap.hasLayer(this.activeLayer)) {
        this.activeLayer.options.pane = activeLayerLbl
        this.activeLayer.addTo(this.mainMap)
        this.resetAllLayers()
      }
    }
  }

  // App.js handles in onCompareChange
  addPinLayers = () => {
    const {mainTabIndex: tabIndex, compareMode: isCompare} = Store.current
    if (isCompare) {
      this.activeLayer != undefined ? this.mainMap.removeLayer(this.activeLayer) : '';
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
        this.resetAllLayers()
      }
      Store.setCompareMode(false)
    }
  }

  setOverlayParams = (arr, index) => {
    //if not in compare mode, don't do anything
    if (!Store.current.compareMode) return
    let mapIndex = Store.current.pinResults.length - (index + 1)
    if (Store.current.compareModeType === 'opacity') {
      this.compareLayers[mapIndex].setOpacity(arr[1])
    } else {
      this.compareLayers[mapIndex].setClip(L.bounds([ window.innerWidth * arr[0], 0 ], [window.innerWidth * arr[1], window.innerHeight]))
    }
  }

  getUpdateParams(options, item) {
    let {datasource, selectedResult, compareMode, evalscript} = Store.current
    let rawData = item ? item.properties.rawData : selectedResult.properties.rawData
    let activeLayer = this.activeLayer
    let obj = {}
    let time = rawData.time
    let evalS = ''
    let evalSource = ''
    obj.format = 'image/png'
    obj.pane = compareMode ? compareLayerLbl : activeLayerLbl
    obj.transparent = true
    obj.maxcc = 100
    obj.layers = getLayersString(item)
    if (item) {
      if (isCustom(item)) {
        if (item.evalscript) {
            obj.evalscript = item.evalscript
        }
      } else {
        if (activeLayer) {
          delete activeLayer.wmsParams.evalscript
        }
      }
      time = item.properties.rawData.time
      obj.evalsource = evalSourcesMap[item.name]
    } else {
      if (isCustom() && !compareMode) {
        obj.evalscript = evalscript[datasource]
        obj.evalsource = evalSourcesMap[selectedResult.name]
      } else {
          delete activeLayer.wmsParams.evalscript
      }
    }

    obj.time = `${time}/${time}`
    delete obj.additionalParams
    return _.cloneDeep(obj)
  }

  render() {
    return <div style={styles.map} id={this.props.mapId}>
      <div id="aboutSentinel">
        <a href="http://www.sentinel-hub.com/apps/eo_browser" target="_blank">About EO Browser</a>
        <a href="mailto:info@sentinel-hub.com?Subject=EO%20Browser%20Feedback">Contact us</a>
        <a href="http://www.sentinel-hub.com/apps/wms" target="_blank">Get data</a>
      </div>
    </div>
  }
}
RootMap.propTypes = {
  location: PropTypes.array,
  mapId: PropTypes.string.isRequired,
}

export default connect(store => store, null, null, { withRef: true })(RootMap)
