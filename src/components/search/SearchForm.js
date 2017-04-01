import React, {PropTypes} from 'react'
import moment from 'moment'
import DatePicker from '../DatePicker'
import './SearchForm.scss'
import NotificationPanel from '../NotificationPanel'
import ProbaLayer from './ProbaPanel'
import {Checkbox, CheckboxGroup} from 'react-checkbox-group'
import _ from 'lodash'

export default class SearchForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: {
        cloudCoverPercentage: 100,
        timeFrom: moment().subtract(1, 'months'),
        timeTo: moment(),
        additionalData: "",
      },
      firstSearch: true,
      instances: [this.props.instances],
      selectedInstances: [this.props.datasource],
      datasource: this.props.datasource
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.datasource !== nextProps.datasource) {
      this.setState({
        datasource: nextProps.datasource
      })
    }
    if (this.state.firstSearch !== nextProps.firstSearch) {
      this.setState({firstSearch: nextProps.firstSearch})
    }
    if (this.state.mapZoom !== nextProps.mapZoom) {
      this.setState({mapZoom: nextProps.mapZoom})
    }
  }

  setTimeFrom(e) {
    this.setState({query: {...this.state.query, timeFrom: moment(e)}},
      this.updateChangeListener)
  }

  setTimeTo(e) {
    this.setState({query: {...this.state.query, timeTo: moment(e)}},
      this.updateChangeListener)
  }

  updateChangeListener = () => {
    this.props.onChange && this.props.onChange(this.state.query, this.state.selectedInstances)
  }

  changeDSSelection = (vals) => {
    this.setState({selectedInstances: vals}, this.updateChangeListener)
  }

  render() {
    let {instances, mapZoom, loading, probaLayer, probaLayers} = this.props
    let maxDate       = moment()
    let from          = this.state.query.timeFrom.format("YYYY-MM-DD")
    let to            = this.state.query.timeTo.format("YYYY-MM-DD")
    let zoomSmall     = mapZoom < 5
    let preventSearch = loading || zoomSmall || this.state.instances.length === 0

    return (<div className="searchForm">
        <div>
          <p>Find images from these satellites:</p>
          {instances && instances.length > 0 ? <div className="searchDatasourceSelect">
            <CheckboxGroup
              className="checkboxGroup"
              name="fruits"
              value={this.state.selectedInstances}
              onChange={this.changeDSSelection}>
              {instances.map((inst, i) => {
                if (inst === undefined) return
                let name = inst.name
                return <label key={i}><Checkbox value={name}/>{name}</label>
              }
              )}
            </CheckboxGroup>
          </div> : <NotificationPanel msg={!instances ? 'Login to load user configurations.' : 'No valid instances. Please contact Sentinel Hub.'} type='info' />}
          <br/>
        </div>
        <div>
          <label>Cloud coverage</label>
          <input
            type="number"
            placeholder="20"
            min="0"
            max="100"
            style={{width: '60px', marginLeft: '5px'}}
            defaultValue={this.state.query.cloudCoverPercentage}
            onChange={(e) => this.setState({
              query: {
                ...this.state.query,
                cloudCoverPercentage: e.target.value
              }
            }, this.updateChangeListener)}/> % <small>(where available)</small>
          <br/>
        </div>
        <label>Select time range</label>
        <DatePicker
          key='dateFrom'
          ref='dateFrom'
          className="inlineDatepicker"
          maxDate={maxDate}
          onNavClick={this.props.onDatePickerNavClick}
          defaultValue={from}
          onExpand={() => this.props.onExpandDate(true)}
          onSelect={e => this.setTimeFrom(e)}/>
        <span className="datePickerSeparator">-</span>
        <DatePicker
          key='dateTo'
          ref='dateTo'
          maxDate={maxDate}
          onNavClick={this.props.onDatePickerNavClick}
          defaulValue={to}
          onExpand={() => this.props.onExpandDate(false)}
          className="inlineDatepicker move"
          onSelect={e => this.setTimeTo(e)}/>
        <br/>
        {/* We provide href=javascript: so it gets focus */}
        <a
          href="javascript:"
          onClick={() => {
            if (preventSearch) return
            this.setState({firstSearch: false})
            this.props.doSearch(this.state.query, this.state.selectedInstances)
          }}
          disabled={preventSearch}
          className="btn">
          {this.props.loading ? <i className="fa fa-spinner fa-spin fa-fw"></i> : 'Search'}
        </a>
        {zoomSmall && !this.props.loading && <NotificationPanel msg={`Zoom in to query`} type='error'/>}
        {this.props.error !== '' && <NotificationPanel msg={`An error occurred: ${this.props.error}`} type='error'/>}
        {(this.props.empty && !this.props.loading && !this.state.firstSearch) &&
        <NotificationPanel msg="No results found. Try with different parameters." type='info'/>}
        {!_.isEmpty(probaLayers) && <ProbaLayer
          zoom={mapZoom}
          probaLayer={probaLayer}
          probaLayers={probaLayers}
          onChange={this.props.changeProba}
        />}
      </div>
    );
  }
}

SearchForm.propTypes = {
  instances: PropTypes.array,
  probaLayer: PropTypes.object,
  probaLayers: PropTypes.object,
  doSearch: PropTypes.func,
  onChange: PropTypes.func,
  onExpandDate: PropTypes.func,
  onDatePickerNavClick: PropTypes.func,
  changeProba: PropTypes.func,
  error: PropTypes.string,
  preset: PropTypes.string,
  firstSearch: PropTypes.bool,
  empty: PropTypes.bool,
  mapZoom: PropTypes.number,
  loading: PropTypes.bool,
};
