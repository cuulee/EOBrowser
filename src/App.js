import React, { Component } from 'react'
import RootMap from './components/Map'
import Tools from './components/Tools'
import SearchBox from './components/SearchBox'
import Login from './components/Login'
import {loadGetCapabilities} from "./utils/ajax"
import {addAdditionalParamsToInstance} from "./utils/utils"
import Rodal from 'rodal'
import 'rodal/lib/rodal.css'
import NotificationPanel from './components/NotificationPanel'
import _ from 'lodash'
import Store from './store'
import {connect} from 'react-redux'

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isLoaded: false,
      toolsVisible: true,
      error: "",
      newLocation: false,
      isCompare: false,
      user: {}
    }
  }

  onResize = () => {
    Store.setSize([window.innerWidth,window.innerHeight])
  }

  fetchLayers() {
    window.addEventListener('hashchange', this.handleNewHash, false)
    let promises = []
    addAdditionalParamsToInstance(Store.current.instances)
    Store.current.instances.forEach(instance => {
        promises.push(loadGetCapabilities(instance))
    })
    let datasource = _.last(Store.current.instances).name;
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
    let params = path.split('/')
    _.forEach(params, (val) => {
      let [key, value] = val.split('=')
      parsedObj[key] = value
    })
    _.merge(Store.current, parsedObj)
    if (this._map !== undefined)
      //handle map position change
      this._map.refs.wrappedInstance.updatePosition()
  }

  onTabSelect = (i) => {
    let isVisualization = i > 1
    if (this.state.newLocation) {
      this._map.refs.wrappedInstance.togglePolygons(false)
      return
    }
    this._map.refs.wrappedInstance.togglePolygons(!isVisualization)
    this._map.refs.wrappedInstance.addPinLayers(i === 3 && this.state.isCompare, i)
  }

  onResultClick = (i, activate, geom, useOwnPreset) => {
    this._map.refs.wrappedInstance.activateTile(i, activate, geom, useOwnPreset)
  }
  onZoomTo = () => {
    this._map.refs.wrappedInstance.zoomToActivePolygon()
  }
  onCompareChange = (isCompare) => {
    this.setState({isCompare: isCompare}, () => {
      //this._map.refs.wrappedInstance.addPinLayers(isCompare)
    })
  }
  onOpacityChange = (opacity, index) => {
    this._map.refs.wrappedInstance.setOverlayParams(opacity, index)
  }

  onClearData = () => {
    this._map.refs.wrappedInstance.clearPolygons()
  }

  onLogout = (res) => {
    localStorage.setItem("sentinelUser","")
    this.setState({user: {}})
  }

  onLogin = (user, instances) => {
    Store.setInstances(instances, user)
    this.setState({'user': user})
    this.fetchLayers()
  }

  getContent() {
    if (this.state.isLoaded) {
      return (<div>
        <RootMap
          ref={e => {this._map = e}}
          location={this.state.location}
          mapId="mapId" />

        <SearchBox onLocationPicked={this.setMapLocation} />
        <a id="toggleSettings" onClick={() => this.setState({toolsVisible: !this.state.toolsVisible})}>
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
          onTabSelect={this.onTabSelect}
          onZoomTo={this.onZoomTo}
          onCompareChange={this.onCompareChange}
          onOpacityChange={this.onOpacityChange}
        />
        {(this.state.error) && (
          <Rodal animation="slideUp" visible={this.state.error !== ''} width={500} height='auto' onClose={() => this.setState({error: ''})}>
            <NotificationPanel msg={`An error occured: ${this.state.error}`} type='error'/>
          </Rodal>)}
      </div>)
    } else {
      return (<div id="loading"><i className="fa fa-cog fa-spin fa-3x fa-fw"></i>Loading ... </div>)
    }
  }

  render() {
    return _.isEmpty(this.state.user) ? <Login onLogin={this.onLogin} /> : this.getContent()
  }
}

export default connect(store => store)(App);
