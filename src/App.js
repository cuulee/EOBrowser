import React, { Component } from 'react'
import RootMap from './components/Map'
import Tools from './components/Tools'
import SearchBox from './components/SearchBox'
import Login from './components/Login'
import {loadGetCapabilities, loadProbaCapabilities} from "./utils/ajax"
import {addAdditionalParamsToInstance, getPolyfill} from "./utils/utils"
import Rodal from 'rodal'
import 'rodal/lib/rodal.css'
import NotificationPanel from './components/NotificationPanel'
import DummyIcon from './components/DummyIcon'
import _ from 'lodash'
import Store from './store'
import {connect} from 'react-redux'
import moment from 'moment'

import './App.scss'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isLoaded: true,
      toolsVisible: true,
      error: "",
      newLocation: false,
      isCompare: false,
      user: null,
    }
    getPolyfill()
  }

  onResize = () => {
    Store.setSize([window.innerWidth,window.innerHeight])
  }

  fetchLayers() {
    if (!Store.current.instances || Store.current.instances.length === 0) return
    window.addEventListener('hashchange', this.handleNewHash, false)
    let promises = []
    addAdditionalParamsToInstance(Store.current.instances)
    Store.current.instances.forEach(instance => {
        promises.push(loadGetCapabilities(instance))
    })
    let datasource = _.find(Store.current.instances, {name: 'Sentinel-2'}).name;
    if (!datasource) {
      datasource = _.last(Store.current.instances).name
    }
    Store.setDatasource(datasource) //we turn on last available datasource
    Store.setDatasources([datasource])
    Promise.all(promises).then(() => {
      this.handleNewHash()
      this.setState({isLoaded: true, isModal: false})
    }, e => {
      this.setState({error: e.message, isLoaded: true, isModal: false})
      this.handleNewHash()
    })
  }

  setMapLocation = (data) => {
    this.setState({newLocation: true, location: [data.location.lat, data.location.lng]})
  }

  onFinishSearch = (res) => {
    this._map.refs.wrappedInstance.clearPolygons()
    if (res === undefined || res.length === 0) {
      return
    }
    this._map.refs.wrappedInstance.showPolygons(res)
    this.setState({newLocation: false})
  }

  handleNewHash = () => {
    let path = window.location.hash.replace(/^#\/?|\/$/g, '');
    let parsedObj = {}
    let resultObj = {
      properties: {
          rawData: {}
      }
    }
    let datasource = ''
    const hasAndSeparator = path.includes("&")
    // falback for previous separations
    let params = path.split(hasAndSeparator ? '&' : '/')
    _.forEach(params, (val) => {
      let [key, value] = val.split('=')

      if(_.includes(['lat', 'lng', 'zoom'],key)) {
        parsedObj[key] = value
      }
      if (path.includes('datasource')) {
        switch (key) {
          case 'datasource':
            datasource = decodeURIComponent(value)
            resultObj['name'] = datasource
            parsedObj['datasource'] = datasource
            break;
          case 'preset':
            resultObj['preset'] = value
            parsedObj['preset'] = {
              [datasource]: value
            }
            break;
          case 'time':
            resultObj.properties.rawData.time = value
            break;
          case 'layers':
            const [r,g,b] = value.split(","),
                  layers= { r,g,b }
            resultObj['layers'] = layers
            parsedObj['layers'] = {
              [datasource]: layers
            }
            break;
          case 'evalscript':
            if (hasAndSeparator) {
              let evalScript = value 
              if (evalScript.includes("=")) {
                evalScript = evalScript.replace("=", "")
              }
              let valid = true 
              try { 
                atob(evalScript) 
              } catch(e){ 
                valid = false 
              } 
      
              if(valid) { 
                const evalS = value + "="
                resultObj[key] = evalS
                parsedObj.evalscript = {}
                parsedObj['evalscript'] = {
                  [datasource]: evalS
                }
              } 
            }
            break;
          default:
            resultObj[key] = value;
        }
      }
    })
    if (this.canActivateResult(resultObj)) {
      resultObj.map = parsedObj
      Store.setSelectedResult(resultObj)
      Store.setTabIndex(2)
    } 

    _.merge(Store.current, parsedObj)
    if (this._map !== undefined)
      //handle map position change
      this._map.refs.wrappedInstance.updatePosition()
  }

  // check if valid instance, if is first time entry or activated preset has changed
  canActivateResult(resultObj) {
    const datasource = resultObj.name
    if (!datasource) return false
    let instance = _.find(Store.current.instances, (value) => value.name === datasource)
    return instance && (!this.state.isLoaded || Store.current.preset[datasource] && (Store.current.preset[datasource] !== resultObj.preset))
  }

  onResultClick = (i, activate, geom, useOwnPreset) => {
    this._map.refs.wrappedInstance.activateTile(i, activate, geom, useOwnPreset)
  }
  onZoomToPin = (item) => {
    this._map.refs.wrappedInstance.onZoomToPin(item)
  }
  onZoomTo = () => {
    this._map.refs.wrappedInstance.zoomToActivePolygon()
  }
  onCompareChange = (isCompare) => {
    this.setState({isCompare: isCompare})
  }
  onOpacityChange = (opacity, index) => {
    this._map.refs.wrappedInstance.setOverlayParams(opacity, index)
  }

  onClearData = () => {
    this._map.refs.wrappedInstance.clearPolygons()
  }

  onLogout = (res) => {
    this.onLogin(null, [])
    localStorage.setItem("sentinelUser","")
    Store.setInstances(null, null)
    Store.setDownloadableImageType('jpg')
    Store.setSelectedCrs('EPSG:3857')
  }

  cleanupInstanceNames = (instances) => {
    const validInstances = []
    instances.forEach(instance => {
      if (instance.name.toLowerCase().includes("eo_browser")) {
        instance.name = instance.name.replace("EO_Browser-", "")
        validInstances.push(instance)
      }
    })
    return validInstances
  }

  onLogin = (user, instances) => {
    const cleanInstances = this.cleanupInstanceNames(instances)
    Store.setInstances(cleanInstances, user)
    this.setState({user: user})
    this.fetchLayers()
    Store.showLogin(false)
  }

  componentWillMount() {
    loadProbaCapabilities()
    this.fetchLayers()
  }

  hideTools() {
    this.setState({toolsVisible: false})
  }

  getContent() {
    if (this.state.isLoaded) {
      return (<div>
        <RootMap
          ref={e => {this._map = e}}
          location={this.state.location}
          mapId="mapId" />
        
        <div id="Controls" className={!this.state.toolsVisible && "hidden"}>
          <div id="ControlsContent">
            <div className="pull-right full-size">
              <DummyIcon />
              <div className="clear-both-700"></div>
              <SearchBox onLocationPicked={this.setMapLocation} toolsVisible={this.state.toolsVisible} hideTools={this.hideTools}/>
            </div>
          </div>
        </div>

        <a id="toggleSettings" onClick={() => this.setState({toolsVisible: !this.state.toolsVisible})} className={this.state.toolsVisible ? '' : 'hidden'}>
          <i className={'fa fa-' + (this.state.toolsVisible ? 'chevron-left' : 'cogs')}></i>
        </a>
        <Tools
          user={this.state.user}
          onLogout={this.onLogout}
          onResize={this.onResize}
          className={!this.state.toolsVisible && ('hidden')}
          onFinishSearch={this.onFinishSearch}
          onResultClick={this.onResultClick}
          onClearData={this.onClearData}
          selectedTile={this.state.selectedTile}
          onZoomTo={this.onZoomTo}
          onCompareChange={this.onCompareChange}
          onOpacityChange={this.onOpacityChange}
          onZoomToPin={this.onZoomToPin}
        />
        {(this.state.error) && (
          <Rodal animation="slideUp" visible={this.state.error !== ''} width={500} height='auto' onClose={() => this.setState({error: ''})}>
            <NotificationPanel msg={`An error occured: ${this.state.error}`} type='error'/>
          </Rodal>)}
          <Rodal 
            animation="slideUp" 
            visible={Store.current.showLogin} 
            width={400} 
            height={280} 
            onClose={() => Store.showLogin(false)}>
            <Login isAws={this.state.isAws} visible={Store.current.showLogin} onLogin={this.onLogin} />
          </Rodal>
      </div>)
    } else {
      return (<div id="loading"><i className="fa fa-cog fa-spin fa-3x fa-fw"></i>Loading ... </div>)
    }
  }

  render() {
    return this.getContent()
  }
}

export default connect(store => store)(App);