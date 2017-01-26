import React, {PropTypes} from 'react'
import moment from 'moment'
import DatePicker from '../DatePicker'
import 'style!css!sass!./SearchForm.scss'
import NotificationPanel from '../NotificationPanel'
import ProbaLayer from './ProbaPanel'
import {Checkbox, CheckboxGroup} from 'react-checkbox-group'

export default class SearchForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: {
        cloudCoverPercentage: 20,
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
    let {instances, mapZoom, loading} = this.props
    if (!instances) {
      return null
    }
    let maxDate       = moment()
    let from          = this.state.query.timeFrom.format("YYYY-MM-DD")
    let to            = this.state.query.timeTo.format("YYYY-MM-DD")
    let zoomSmall     = mapZoom < 5
    let preventSearch = loading || zoomSmall || this.state.instances.length === 0

    return (<div className="searchForm">
        <p>Find tiles from various datasources:</p>
        <div className="searchDatasourceSelect">
          <CheckboxGroup
            className="checkboxGroup"
            name="fruits"
            value={this.state.selectedInstances}
            onChange={this.changeDSSelection}>
            {instances.map((inst, i) => {
              let name = inst.name
              return <label key={i}><Checkbox value={name}/>{name}</label>
            }
            )}
          </CheckboxGroup>
        </div>
        <br/>
        <div>
          <label>Cloud coverage</label>
          <input
            type="number"
            placeholder="20"
            min="0"
            max="100"
            style={{width: '80px', marginLeft: '5px'}}
            defaultValue={this.state.query.cloudCoverPercentage}
            onChange={(e) => this.setState({
              query: {
                ...this.state.query,
                cloudCoverPercentage: e.target.value
              }
            }, this.updateChangeListener)}/> %
          <br/>
        </div>
        <label>Select time range</label>
        <DatePicker
          key='dateFrom'
          ref='dateFrom'
          className="inlineDatepicker"
          maxDate={maxDate}
          defaultValue={from}
          onSelect={e => this.setTimeFrom(e)}/>
        <span>-</span>
        <DatePicker
          key='dateTo'
          ref='dateTo'
          maxDate={maxDate}
          defaulValue={to}
          className="inlineDatepicker"
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
          {this.props.loading ? <i className="fa fa-spinner fa-spin fa-fw"></i> : 'Submit'}
        </a>
        {zoomSmall && !this.props.loading && <NotificationPanel msg={`Zoom in to query`} type='error'/>}
        {this.props.error !== '' && <NotificationPanel msg={`An error occurred: ${this.props.error}`} type='error'/>}
        {(this.props.empty && !this.props.loading && !this.state.firstSearch) &&
        <NotificationPanel msg="No results found. Try with different parameters." type='info'/>}
        <ProbaLayer
          zoom={this.props.mapZoom}
          layer={this.props.probaLayer}
          onChange={this.props.changeProba}
        />
      </div>
    );
  }
}

SearchForm.propTypes = {
  instances: PropTypes.array,
  doSearch: PropTypes.func,
  onChange: PropTypes.func,
  changeProba: PropTypes.func,
  error: PropTypes.string,
  preset: PropTypes.string,
  firstSearch: PropTypes.bool,
  empty: PropTypes.bool,
  mapZoom: PropTypes.number,
  loading: PropTypes.bool,
};
