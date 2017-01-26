import React, {PropTypes} from 'react'
import {map} from 'lodash'
import AdvancedHolder from './advanced/AdvancedHolder'
import WMSImage from './WMSImage'
import _ from 'lodash'

class LayerDatasourcePicker extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      base64Urls: this.props.base64Urls || {}
    }
  }

  saveBase64(presetName, base64) {
    let { datasource } = this.props
    //check if previous base64url is the same, then do nothing
    if (_.get(this.state.base64Urls, "datasource.presetName") === base64) return
    let obj = _.merge(this.state.base64Urls, {[datasource]: { [presetName]: base64}})
    this.setState({base64Urls: obj})
    this.props.onWriteBase64(obj)
  }

  getSimpleHolder() {
    let {preset, presets} = this.props
    return (<div className="layerDatasourcePicker">
      {
        (_.get(this, 'props.channels.length') > 0 && <a key={0} onClick={() => {
            this.props.onActivate('CUSTOM')
          }} className={(preset === 'CUSTOM') ? "active" : ""}>
            <i className='icon fa fa-paint-brush'></i>Custom<small>Create custom rendering</small>
          </a>)
      }

      {
        map(presets, (obj, key) => {
          return <a key={key} onClick={() => { this.props.onActivate(key) }} className={(preset === key) ? "active" : ""}>
            <WMSImage
              onBase64Gen={(b) => {}}
              alt={obj.name}
              src={`images/presets/${key}.jpg`}/>
            {obj.name}
            <small>{obj.desc}</small>
          </a>
        })
      }
    </div>)
  }

  render() {
    let isBasic = this.props.isBasicMode
    return (<div>
      <div style={{display: isBasic ? 'block' : 'none'}}>{this.getSimpleHolder()}</div>
      {_.get(this, 'props.channels.length') > 0 && (
        <AdvancedHolder
          isScript={this.props.isScript}
          layers={this.props.layers}
          cmValue={this.props.cmValue}
          onBack={this.props.onBack}
          onDrag={this.props.onDrag}
          onCMupdate={this.props.onCMupdate}
          onToggleMode={this.props.onToggleMode}
          channels={this.props.channels}
          style={{display: !isBasic ? 'block' : 'none'}}/>)}
    </div>)
  }
}

LayerDatasourcePicker.propTypes = {
  base64Urls: PropTypes.object,
  isScript: PropTypes.bool.isRequired,
  datasource: PropTypes.string,
  preset: PropTypes.string,
  cmValue: PropTypes.string,
  presets: PropTypes.object,
  channels: PropTypes.array,
  layers: PropTypes.object,
  onActivate: PropTypes.func,
  onDrag: PropTypes.func,
  onBack: PropTypes.func,
  onToggleMode: PropTypes.func,
  onCMupdate: PropTypes.func,
  onWriteBase64: PropTypes.func,
  isBasicMode: PropTypes.bool
};
export default LayerDatasourcePicker
