import React, {PropTypes} from 'react'
import RCSlider from 'rc-slider'

class Pin extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      range: this.props.range,
      isOpacity: true
    }
  }

  componentWillUpdate(nextProps) {
    if (!nextProps.isCompare && this.state.range[1] !== 1) {
      this.setState({range: [0,1]})
    }
    if (nextProps.isOpacity !== this.state.isOpacity) {
      this.setState({
        isOpacity: nextProps.isOpacity,
        range: [0,1]
      })
    }
  }

  onChange = (arr) => {
    if (this.state.isOpacity) {
      this.setState({range: [0, arr[1]]})
    } else {
      this.setState({range: arr})
    }
    this.props.onOpacityChange(arr)
  }
  onRemove = (e, index) => {
    e.stopPropagation()
    this.props.onRemove(index)
  }
  onPinClick = (isCompare, item, index) => {
    if (!isCompare) {
      this.props.onPinClick(item, index, false)
    }
  }

  render() {
    let {rawData, item, isCompare, index, isOpacity} = this.props
    return <div className="pinItem">
      <div onClick={() => this.onPinClick(isCompare, item, index, false)}>
        <span>{rawData.prettyName}: {item.preset}</span> | <span className="pinDate">{rawData.time}</span>
        {!isCompare && <a className="removePin" onClick={(e) => this.onRemove(e, index)}><i className="fa fa-trash"></i></a> }
      </div>
      {isCompare && <div className={"comparePanel " + (isOpacity && 'opacity')}>
        <label>{isOpacity ? 'Opacity' : 'Split position'}:</label><RCSlider min={0} max={1} step={0.01} range={true} value={this.state.range} onChange={this.onChange} />
        <span>{this.state.opacity}</span>
      </div>}
    </div>
  }
}


Pin.propTypes = {
  isOpacity: PropTypes.bool,
  range: PropTypes.array,
  onPinClick: PropTypes.func,
  onCompare: PropTypes.func,
  onOpacityChange: PropTypes.func,
  onRemove: PropTypes.func,
  isCompare: PropTypes.bool,
  index: PropTypes.number,
  rawData: PropTypes.object,
  item: PropTypes.object,
};

export default Pin