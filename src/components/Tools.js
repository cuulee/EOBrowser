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
import {queryIndex, logout} from '../utils/ajax'
import {getMultipliedLayers} from '../utils/utils'
import {connect} from 'react-redux'
import _ from 'lodash'
import Rodal from 'rodal'
import 'react-toggle/style.css'
import 'rc-slider/assets/index.css'
import 'style!css!sass!./Tools.scss';

class Tools extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tabHeight: window.innerHeight,
      tabIndex: 0,
      searchError: '',
      queryParams: '',
      isSearching: false,
      showResultsDialog: false,
      downloadingTiff: false,
      firstSearch:true,
      resultsFound: false
    };
    this.mouseOverLink = false;
  }

  handleResize = () => {
    let footer = this.refs.footer !== undefined ? this.refs.footer.offsetHeight : 0
    this.setState({
      tabHeight: window.innerHeight - (ReactDOM.findDOMNode(this.refs.tabsPanel.refs.tablist).offsetHeight + 45 + footer + 70),
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
    this.setState({tabIndex: index})
    this.props.onTabSelect(index)
  }

  doSearch = (queryParams, datasources) => {
    Store.clearSearchResults()
    Store.setSelectedResult([])
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
          this.setState({resultsFound: true, tabIndex: 1})
        }
      })
      this.setState({
        queryParams: queryParams,
        isSearching: false,
        searchError: '',
        firstSearch: false
      })
      Store.setSearchingIsOn(true)
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
    let isEvalScriptFromLayers = evalscript[datasource] === btoa("return [" + getMultipliedLayers(layers[datasource]) + "]") || evalscript[datasource] === undefined
    if (this.isScriptView(datasource) && isEvalScriptFromLayers) {
      Store.setEvalScript(datasource, btoa("return [" + getMultipliedLayers(layers[datasource]) + "]"))
      if (!isEvalScriptFromLayers) {
        Store.refresh()
      }
    }
  }

  clearData = () => {
    Store.clearSearchResults()
    Store.setSelectedResult({})
    this.setState({tabIndex: 0, isSearching: false, firstSearch: true, resultsFound: false})
    this.props.onClearData()
  }

  loadMore = (ds) => {
    let query = Store.current.searchParams[ds]
    query.firstSearch = false
    query.multiplyOffset++
    queryIndex(false, ds, query).then(res => {
        Store.setSearchResults(res.results, ds, res.params)
        this.props.onFinishSearch(Store.current.searchResults)
    }, e => console.error(e.message))
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
      this.setState({tabIndex: 2})
    }
  }

  activateResult = (newPreset) => {
    let {selectedResult, datasource, preset} = Store.current
    let newItem = _.clone(selectedResult)
    newItem.preset = preset[datasource]
    Store.setPreset(datasource, newPreset)
    Store.setSelectedResult(newItem)
  }

  isCustom() {
    return this.getActivePreset() === 'CUSTOM'
  }

  getActivePreset() {
    return Store.current.preset[Store.current.datasource]
  }

  onComparePins = () => {
    let isCompare = !Store.current.compareMode
    Store.setCompareMode(isCompare)
  }

  getTileInfo() {
    let data = _.get(Store.current, 'selectedResult.properties.rawData')
    return <div className="visualizationInfoPanel">
      <div className="tileActions">
        <a onClick={this.props.onZoomTo} title="Zoom to tile"><i className="fa fa-search"></i></a>
        {!_.includes(Store.current.pinResults, Store.current.selectedResult) && <a onClick={this.addToPins} title="Pin to your favourite items"><i className="fa fa-thumb-tack"></i></a>}
      </div>
      <b>Satellite:</b> {data.prettyName}<br />
      <b> Date:</b> {data.time}
    </div>
  }

  downloadFullTiff = (allow) => {
    if (allow) {
      Store.generateFullTile()
      this.setState({downloadingTiff: true})
      window.open(Store.current.imgTiffUrl, "_blank")
    } else {
      Store.generateWmsUrl()
      window.open(Store.current.imgWmsUrl, "_blank")
    }
  }
  generateDownloadPanel()  {
    let {squaresPerMtr, zoom} = Store.current
    let disabledFullRes = squaresPerMtr > 20000000
    return (<footer>
      <button onClick={() => this.downloadFullTiff(false)} className="btn"><i className="fa fa-image"></i>Download image</button>
      <button
        disabled={disabledFullRes}
        title={zoom <= 11 && "Zoom in since full resolution tiff can only be generated for tiles below 5000x5000 resolution"}
        onClick={() => this.downloadFullTiff(!disabledFullRes)} className="btn"><i className="fa fa-image"></i>Download FULL-RES image</button>
    </footer>)
  }

  addToPins = () => {
    Store.addPinResult()
    this.setState({tabIndex: 3})
  }
  clearPins = () => {
    Store.clearPins()
    Store.setCompareMode(false)
    this.setState({tabIndex: 2})
  }

  render() {
    let tabs = [['search', 'Search'], ['sliders', 'Results'], ['paint-brush', 'Visualization'], ['pinsPanel', 'Pins'] ];
    let {
      datasource, zoom, datasources, instances, probaLayer, layers, channels,currView, views,
      searchParams, searchResults, selectedResult, preset,presets, evalscript, searchFilterResults,
      compareMode, compareModeType, pinResults } = Store.current
    let evalS = evalscript[datasource] || ""
    let hasSelectedResult = !_.isEmpty(selectedResult)
    let showNotification = this.state.tabIndex === 2 && hasSelectedResult
    let minZoom = hasSelectedResult ? selectedResult.properties.rawData.additionalParams.minZoom : 1,
        maxZoom = 16
    if (datasource === 'proba-v') {
      showNotification = true
    }
    let currentZoom = Number(zoom)

    let panels = [
      <SearchForm
        onChange={this.onSearchFormUpdate}
        preset={preset[datasource]}
        datasource={datasource}
        probaLayer={probaLayer}
        changeProba={Store.setProbaParams}
        mapZoom={currentZoom}
        doSearch={(params, ds) => this.doSearch(params, ds, true)}
        loading={this.state.isSearching}
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
          preset={preset[datasource]}
          cmValue={atob(evalS.replace(/==/g, ''))}
          onBack={() => Store.setCurrentView(datasource, views.PRESETS)}
          onWriteBase64={this.storeBase64}
          onCMupdate={(newCode) => Store.setEvalScript(datasource, btoa(newCode))}
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
          onOpacityChange={this.props.onOpacityChange}
          onToggleCompareMode={e => Store.setCompareModeType(e)}
          items={pinResults} />

  ];

    Tabs.setUseDefaultStyles(false);
    return <div id="tools" className={this.props.className}>
      <Header withBg
            user={this.props.user}
              onLogout={() => logout().then(this.props.onLogout)}
      />
      <Tabs
        selectedIndex={this.state.tabIndex}
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
            key={i}
            className={tabs[i][0]}
            style={{maxHeight: this.state.tabHeight, overflow: i === 0 ? 'visible' : 'auto'}}>
            {panel}
          </TabPanel>) )}
      </Tabs>
      {showNotification && currentZoom < minZoom && <NotificationPanel msg='Zoom in to view data' type='info' />}
      {showNotification && currentZoom > maxZoom && <NotificationPanel msg='Zoom out to view data' type='info' />}
      {showNotification && hasSelectedResult && this.generateDownloadPanel()}
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

export default connect(store => store)(Tools)