import React, {PropTypes} from 'react'
import NotificationPanel from './NotificationPanel'
import Pin from './Pin'
import {RadioGroup, Radio} from 'react-radio-group'

class PinPanel extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pins: []
    }
  }
  
  componentDidMount() {
    window.addEventListener('resize', this.handleResize.bind(this), false)
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, false)
  }

  handleResize() {   
    // for each pin trigger change
    let pins = this.state.pins
    pins.forEach(item => {
      item.onChange(null)
    })
  }

  handlePinMount(pin) {
    let pins = this.state.pins
    pins.push(pin)

    this.setState({pins})
  }

  handlePinUnmount(pin) {
    let pins = this.state.pins
    let index = pins.indexOf(pin)

    pins.splice(index, 1)
    this.setState({pins})
  }

  render() {
    let {items, isCompare, isOpacity, onToggleCompareMode, onRemove, onCompare, onClearPins} = this.props
    return <div className={`pinPanel ${!isCompare && 'normalMode'}`}>
      {items.length === 0 ?
        <NotificationPanel type="info" msg="No pins. Find your scene and pin it to save it for later."/> :
        <div>
          <div className="comparisonHeader">
            <a style={{float: 'right'}} onClick={onClearPins}><i className="fa fa-trash"></i>Clear pins</a>
            <a onClick={onCompare}><i className={`fa fa-${isCompare ? 'check-circle-o' : 'exchange'}`}></i>{isCompare ? 'Finish comparison' : 'Compare' }</a>
            {isCompare && <div className="compareTogglePanel">
              Split mode:
              <RadioGroup className="radioGroup" name="compareMode" selectedValue={isOpacity ? "opacity" : "split"} onChange={onToggleCompareMode}>
                <label><Radio value="opacity" />Opacity</label>
                <label><Radio value="split" />Split</label>
              </RadioGroup>
              </div>}
          </div>
          {items.map((item, i) => {
            // if we add pin from results, we have different structure, otherwise we have all the data
            let rawData = item.properties ? item.properties.rawData : item
            return <Pin
              ref={'pin' + i}
              range={[0,1]}
              rawData={rawData}
              item={item}
              index={i}
              key={i}
              isOpacity={isOpacity}
              onRemove={onRemove}
              onZoomToPin={this.props.onZoomToPin}
              isCompare={isCompare}
              onPinClick={() => this.props.onPinClick(item, i, false)}
              onOpacityChange={(e) => this.props.onOpacityChange(e, i)}
              onComponentDidMount={this.handlePinMount.bind(this)}
              onComponentWillUnmount={this.handlePinUnmount.bind(this)}
              />
          })
          }
        </div>
      }
    </div>
  }
}

PinPanel.propTypes = {
  zoom: PropTypes.number,
  isCompare: PropTypes.bool,
  isOpacity: PropTypes.bool,
  items: PropTypes.array,
  onPinClick: PropTypes.func,
  onRemove: PropTypes.func,
  onCompare: PropTypes.func,
  onClearPins: PropTypes.func,
  onOpacityChange: PropTypes.func,
  onToggleCompareMode: PropTypes.func,
};

export default PinPanel