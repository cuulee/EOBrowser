import React from 'react'
import ReactDOM from 'react-dom'
import LayerDatasourcePicker from './LayerDatasourcePicker'
import NotificationPanel from './NotificationPanel'
import Header from './Header'
import PinPanel from './PinPanel'
import ResultsPanel from './search/Results'
import SearchForm from './search/SearchForm'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import Store from '../store'
import esaLogo from './esa.png'
import {queryIndex, logout} from '../utils/ajax'
import {getMultipliedLayers, getActivePreset, b64EncodeUnicode, b64DecodeUnicode} from '../utils/utils'
import AddPin from './AddPin'
import {connect} from 'react-redux'
import moment from 'moment'
import _ from 'lodash'
import Rodal from 'rodal'
import 'react-toggle/style.css'
import 'rc-slider/assets/index.css'

import DownloadPanel from './DownloadPanel'

import './Tools.scss'

class Tools extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tabHeight: window.innerHeight,
      searchError: '',
      queryParams: '',
      isSearching: false,
      showResultsDialog: false,
      downloadingTiff: false,
      firstSearch:true,
      resultsFound: false
    };
  }

  handleResize = () => {
    let downloadPanelNode = null
    
    try {
      downloadPanelNode = ReactDOM.findDOMNode(this.downloadPanel)
    } catch(e) {}
    
    let footer = downloadPanelNode !== null ? downloadPanelNode.offsetHeight : 0

    // which tab is item
    // footer is only !=0 if we are on tab 2 - Visualization
    const {mainTabIndex} = Store.current

    if(mainTabIndex !== 2) {
      footer = 0
    }

    let bottomMargin = 32
    if(window.innerWidth < 701) {
      bottomMargin = 47
    }

    this.setState({                    // dynamic                                                          + logo + margin-top + dynamic footer + margin-bottom
      tabHeight: window.innerHeight - (ReactDOM.findDOMNode(this.refs.tabsPanel.refs.tablist).offsetHeight + 48 + 10 + footer + 34 + bottomMargin),
    });
    this.props.onResize()
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEmpty(nextProps.searchFilterResults) && !this.state.showResultsDialog) {
      this.setState({showResultsDialog: true})
    }
  }

  componentDidUpdate(nextProps) {
    if (this.tabPanel) {
      this.tabPanel.style.maxHeight = this.state.tabHeight + "px"
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize)
  }

  storeBase64 = (obj) => {
    let newObj = _.merge(Store.current.base64Urls, obj)
    Store.setBase64Urls(newObj)
    try {
      localStorage.setItem('base64Urls', JSON.stringify(Store.current.base64Urls))
    } catch (e) {
      //writing unsuccessful
    }
  }
  getBase64Urls() {
    try {
      const base64Urls = localStorage.getItem('base64Urls')
      if (base64Urls === null) {
        return
      }
      Store.setBase64Urls(JSON.parse(base64Urls))
    } catch (e) {
      //no local storage bsae64urls
    }
  }

  isScriptView(datasource) {
    return Store.current.currView[datasource] === Store.current.views.SCRIPT
  }

  handleSelect = (index, last) => {
    setTimeout(() => {
      this.handleResize()
    }, 200)
    Store.setTabIndex(index)
    index !== 3 && Store.setCompareMode(false)
  }

  doSearch = (queryParams, datasources) => {
    Store.clearSearchResults()
    Store.setSearchingIsOn(false)
    Store.setDatasources(datasources)
    this.setState({isSearching: true, resultsFound: false})
    Store.setMaxcc(queryParams.cloudCoverPercentage)
    Store.setDate(queryParams.timeTo)
    Store.setDateFrom(queryParams.timeFrom)
    let query = {
      ...queryParams,
      firstSearch: true,
      multiplyOffset: 0,
      queryBounds: queryParams.queryBounds
    }
    let querySources = datasources.map(ds => queryIndex(false, ds, query))
    Promise.all(querySources.map(this.reflect)).then(obj => {
      let success = obj.filter(x => x.status === "resolved").map(x => x.data)
      success.forEach(i => {
        Store.setSearchResults(i.results, i.datasource, i.params)
        if (i.results.length > 0) {
          Store.setTabIndex(1)
          this.setState({resultsFound: true})
        }
      })
      this.setState({
        queryParams: queryParams,
        isSearching: false,
        searchError: '',
        firstSearch: false
      })
      Store.setSearchingIsOn(true)
      document.getElementById("react-tabs-3").scrollTop = 0 //we need to reset scroll to top once we perform search
      this.props.onFinishSearch(Store.current.searchResults)
    }, e => {
      this.setState({searchError: e.message, isSearching: false})
      Store.setSearchingIsOn(true)
      this.props.onFinishSearch()
    });
  }

  reflect(promise){
    return promise.then(
      v => ({data:v, status: "resolved" }),
      e => ({data:e, status: "rejected" })
    );
  }

  toggleMode(datasource) {
    let {layers, views, evalscript} = Store.current
    Store.setCurrentView(datasource, this.isScriptView(datasource) ? views.BANDS : views.SCRIPT)
    let isEvalScriptFromLayers = evalscript[datasource] === b64EncodeUnicode("return [" + getMultipliedLayers(layers[datasource]) + "]") || evalscript[datasource] === undefined
    if (this.isScriptView(datasource) && isEvalScriptFromLayers) {
      Store.setEvalScript(datasource, b64EncodeUnicode("return [" + getMultipliedLayers(layers[datasource]) + "]"))
      if (!isEvalScriptFromLayers) {
        Store.refresh()
      }
    }
  }

  clearData = () => {
    Store.clearSearchResults()
    Store.setSelectedResult({})
    Store.setTabIndex(0)
    this.setState({isSearching: false, firstSearch: true, resultsFound: false})
    this.props.onClearData()
  }

  loadMore = (ds) => {
    this.setState({isSearching: true})
    let query = Store.current.searchParams[ds]
    query.firstSearch = false
    query.multiplyOffset++
    queryIndex(false, ds, query).then(res => {
        this.setState({isSearching: false})
        Store.setSearchResults(res.results, ds, res.params)
        this.props.onFinishSearch(Store.current.searchResults)
    }, e => {
      console.error(e.message)
      this.setState({isSearching: false})
    })
  }

  clearFilterData = () => {
    this.setState({showResultsDialog: false})
    Store.setFilterResults({})
  }

  onSearchFormUpdate = (query, datasources) => {
    Store.setDateFrom(query.timeFrom)
    Store.setDate(query.timeTo)
    Store.setDatasources(datasources)
    Store.setMaxcc(query.cloudCoverPercentage)
  }

  onClickResult = (i, activate, geom, useOwnPreset) => {
    this.props.onResultClick(i, activate, geom, useOwnPreset)
    if (activate && geom !== undefined) {
      this.clearFilterData()
      Store.setSelectedResult(geom)
      Store.setTabIndex(2)
      this.setState({tabIndex: 2})
    }
  }

  activateResult = (newPreset) => {
    let {selectedResult, datasource, preset} = Store.current
    let newItem = _.cloneDeep(selectedResult)
    newItem.preset = newPreset
    Store.setPreset(datasource, newPreset)
    Store.setSelectedResult(newItem)
  }

  isCustom() {
    return getActivePreset() === 'CUSTOM'
  }

  onComparePins = () => {
    let isCompare = !Store.current.compareMode
    Store.setCompareMode(isCompare)
  }

  getTileInfo() {
    const {isActiveLayerVisible, pinResults, selectedResult} = Store.current
    let data = _.get(Store.current, 'selectedResult.properties.rawData')
    return <div className="visualizationInfoPanel">
      <div className="tileActions">
        {selectedResult.geometry && <a onClick={this.props.onZoomTo} title="Zoom to tile"><i className="fa fa-search"></i></a>}
        <AddPin onAddToPin={this.onAddToPin} pin={selectedResult} />
        <a onClick={() => Store.toggleActiveLayer(!isActiveLayerVisible)}>
        <i 
          title={isActiveLayerVisible ? 'Hide layer' : 'Show layer'} 
          className={`fa fa-eye${isActiveLayerVisible ? '-slash' : ''}`} />
        </a>
      </div>
      <b className="leaveMeAlone">Satellite:</b> {selectedResult.name}<br />
      <b className="leaveMeAlone">Date:</b> {data.time}
    </div>
  }

  downloadFullTiff = (allow) => {
    if (allow) {
      Store.generateImageLink(true)
      this.setState({downloadingTiff: true})
      window.open(Store.current.imgTiffUrl, "_blank")
    } else {
      Store.generateImageLink(false)
      window.open(Store.current.imgWmsUrl, "_blank")
    }
  }

  onAddToPin = () => {
    Store.setTabIndex(3)
  }
  clearPins = () => {
    Store.clearPins()
    Store.setCompareMode(false)
    const selectResult = Store.current.selectedResult
    this.setState({tabIndex: selectResult ? 2 : 3})
  }

  // here we pass either from-to date or @param isFirst as first parameter to indicate where to query 
  queryActiveMonth = (dateFrom,dateTo) => {
    if (!Store.current.instances) return
    if (dateTo) {
      queryIndex(true, Store.current.datasources[0], {from: dateFrom, to: dateTo})
    } else {
      const newDateFrom = moment(Store.current[dateFrom ? 'dateFrom' : 'dateTo']).startOf('month').format("YYYY-MM-DD"),
            newDateTo = moment(Store.current[dateFrom ? 'dateFrom' : 'dateTo']).endOf('month').format("YYYY-MM-DD")
      queryIndex(true, Store.current.datasources[0], {from: newDateFrom, to: newDateTo})
    }
  }

  render() {
    let tabs = [['search', 'Search'], ['list', 'Results'], ['paint-brush', 'Visualization'], ['pinsPanel', 'Pins'] ];
    let {
      datasource, zoom, datasources, instances, probaLayer, layers, channels,currView, views, probaLayers,
      searchParams, searchResults, selectedResult, preset,presets, evalscript, searchFilterResults,
      compareMode, compareModeType, pinResults, mainTabIndex, size } = Store.current
    let evalS = evalscript[datasource] || ""
    let hasSelectedResult = !_.isEmpty(selectedResult)
    let showNotification = mainTabIndex === 2 && hasSelectedResult
    let minZoom = hasSelectedResult && selectedResult.properties.rawData.additionalParams ? selectedResult.properties.rawData.additionalParams.minZoom : 1,
        maxZoom = 16
    if (datasource === 'proba-v') {
      showNotification = true
    }
    let currentZoom = Number(zoom)
    const [wWidth, wHeight] = size

    let panels = [
      <SearchForm
        onChange={this.onSearchFormUpdate}
        preset={preset[datasource]}
        datasource={datasource}
        probaLayer={probaLayer}
        probaLayers={probaLayers}
        changeProba={Store.setProbaParams}
        mapZoom={currentZoom}
        onDatePickerNavClick={this.queryActiveMonth}
        doSearch={(params, ds) => this.doSearch(params, ds, true)}
        loading={this.state.isSearching}
        onExpandDate={isFirst => this.queryActiveMonth(isFirst)}
        error={this.state.searchError}
        empty={!this.state.resultsFound}
        instances={instances}
        firstSearch={this.state.firstSearch}
      />,
      <ResultsPanel
        showClear={true}
        data={searchResults}
        datasource={datasource}
        datasources={datasources}
        isSearching={this.state.isSearching}
        searchParams={searchParams}
        onResultClick={this.onClickResult}
        onLoadMore={this.loadMore}
        onClearData={this.clearData}
      />,
      <div>
        {hasSelectedResult && (<div>{this.getTileInfo()}
        <LayerDatasourcePicker
          isScript={this.isScriptView(datasource)}
          base64Urls={Store.current.base64Urls}
          datasource={datasource}
          layers={layers[datasource]}
          channels={channels[datasource]}
          isBasicMode={currView[datasource] === views.PRESETS}
          presets={presets[datasource]}
          cmValue={b64DecodeUnicode(evalS)}
          onBack={() => Store.setCurrentView(datasource, views.PRESETS)}
          onWriteBase64={this.storeBase64}
          onCMRefresh={(newCode) => {
              const hasEqual = newCode.includes("=")
              Store.setEvalScript(datasource, hasEqual ? newCode : newCode + "=") 
            }
          }
          onActivate={this.activateResult}
          onDrag={(layers) => Store.setLayers(datasource, layers)}
          onToggleMode={() => this.toggleMode(datasource)}
        /></div>)}
      </div>,
      <PinPanel
          zoom={Number(zoom)}
          isCompare={compareMode}
          isOpacity={compareModeType === 'opacity'}
          onPinClick={(item,i, zoom) => this.onClickResult(i, true, item, true)}
          onCompare={this.onComparePins}
          onClearPins={this.clearPins}
          onRemove={(i) => Store.removePin(i)}
          onZoomToPin={this.props.onZoomToPin}
          onOpacityChange={this.props.onOpacityChange}
          onToggleCompareMode={e => Store.setCompareModeType(e)}
          items={pinResults} />

  ];

    Tabs.setUseDefaultStyles(false);

    return <div id="tools" className={this.props.className}>
      <Header showLogin={true}
            user={this.props.user}
            onShowLogin={() => Store.showLogin(true)}
            onLogout={() => logout().then(this.props.onLogout)}
      />
      <Tabs
        selectedIndex={mainTabIndex}
        onSelect={this.handleSelect}
        forceRenderTabPanel={true}
        ref="tabsPanel">
        <TabList>
            <Tab key={1}>
              <i className={`fa fa-search`}></i>Search
            </Tab>
            <Tab key={2} style={{display: !this.state.resultsFound ? 'none' : 'block'}}>
              <i className={`fa fa-sliders`}></i>Results
            </Tab>
            <Tab key={3} style={{display: hasSelectedResult ? 'block' : 'none'}}>
              <i className={`fa fa-paint-brush`}></i>Visualization
            </Tab>
            <Tab key={4}>
              <i className={`fa fa-thumb-tack`}></i>My pins
            </Tab>
        </TabList>
        {panels.map((panel, i) => (
          <TabPanel
            id={`tabPanel-${i}`}
            key={i}
            className={tabs[i][0]}
            style={{maxHeight: this.state.tabHeight, overflow: (i === 0 && wHeight > 660 && wWidth > 600) ? 'visible' : 'auto'}}>
            {panel}
          </TabPanel>) )}
      </Tabs>
      {showNotification && currentZoom < minZoom && <NotificationPanel msg='Zoom in to view data' type='info' />}
      {showNotification && currentZoom > maxZoom && <NotificationPanel msg='Zoom out to view data' type='info' />}
      
      {showNotification && 
       hasSelectedResult && 
       <DownloadPanel ref={(downloadPanel) => { this.downloadPanel = downloadPanel }} downloadFunc={this.downloadFullTiff}/>}

      <div className="poweredby">
        Powered by <a href="http://www.sinergise.com" target="_blank">Sinergise</a> with contributions from European Space Agency
        <a className="esa" href="http://www.esa.int/" target="_blank"><img src={esaLogo} alt="ESA" /></a>
      </div>
      <Rodal
        animation="slideUp"
        width={400}
        height={100}
        onClose={() => this.setState({downloadingTiff: false})}
        visible={this.state.downloadingTiff}>
        <NotificationPanel type="info" msg="TIFF is generating. Please wait to finish."/>
        <center><a className="btn" onClick={() => this.setState({downloadingTiff: false})}>Close</a> </center>
      </Rodal>
      <Rodal
        animation="slideUp" 
        visible={this.state.showResultsDialog} 
        width={600} height={400} 
        onClose={this.clearFilterData}>
        <ResultsPanel
          key={2}
          data={searchFilterResults}
          datasources={datasources}
          searchParams={{}}
          isSearching={false}
          showClear={false}
          inPopup={true}
          onResultClick={this.onClickResult}
        />
      </Rodal>
    </div>
  }
}

Tools.propTypes = {
  onResize: React.PropTypes.func,
  doGenerate: React.PropTypes.func,
  onFinishSearch: React.PropTypes.func,
  onResultClick: React.PropTypes.func,
  onClearData: React.PropTypes.func,
  onZoomTo: React.PropTypes.func,
  onCompareChange: React.PropTypes.func,
  onOpacityChange: React.PropTypes.func,
  onTabSelect: React.PropTypes.func,
};

export default connect(store => store, null, null, { withRef: true })(Tools)