import React from 'react'
import NotificationPanel from '../NotificationPanel'
import DatePicker from '../DatePicker'
import moment from 'moment'
import Toggle from 'react-toggle'

class ProbaLayer extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      show: false,
      zoom: this.props.zoom,
      date: moment().subtract(2, "days").format("YYYY-MM-DD"),
      activeLayer: this.props.layer.wmtsParams.additionalParams.layers[0]
    }
  }

  componentWillReceiveProps(props) {
    if (this.state.zoom !== props.zoom) {
      this.setState({zoom: props.zoom})
    }
  }

  getProbaLayers = () => (
      <select defaultValue={this.state.activeLayer}
              onChange={this.changeDSSelection}>
        {this.props.layer.options.additionalParams.layers.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
  )

  changeDSSelection = (e) => {
    this.setState({activeLayer: e.target.value}, this.update)
  }
  update = () => {
    this.props.onChange && this.props.onChange(this.state)
  }

  changeDate = (e) => {
    this.setState({date: e}, this.update)
  }


  render() {
    let {options} = this.props.layer
    return <div className="probaPanel">
      <b>Show Proba-V</b>
      <Toggle
        checked={this.state.show}
        onChange={e => this.setState({show: Boolean(e.target.checked)}, this.update)}
      /><br />
      <label>Layer: </label>{this.getProbaLayers()}<br />
      <label>Date: </label>
      <DatePicker
        noHighlight={true}
        key='dateTo'
        ref='dateTo'
        defaultValue={this.state.date}
        minDate={options.additionalParams.dateRange[0]}
        maxDate={options.additionalParams.dateRange[1]}
        className="inlineDatepicker"
        onSelect={this.changeDate}/>
      {this.state.zoom > options.maxZoom && this.state.show && <NotificationPanel msg="Zoom out to view Proba-V." type="info" />}
    </div>
  }
}
ProbaLayer.PropTypes = {
  zoom: React.PropTypes.number.isRequired,
  layer: React.PropTypes.object.isRequired,
  onChange: React.PropTypes.func.isRequired
}

export default ProbaLayer