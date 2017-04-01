import React, {PropTypes} from 'react'
import BandsPanel from './BandsPanel'
import CodeMirror from './CodeMirror'
import Store from '../../store'
import './advanced.scss'


const ToggleModeButton = ({isScript, onToggle}) => (
  <a className={"toggleBandMode" + (isScript ? " script" : "")} onClick={onToggle}>
    <i className="fa fa-hand-paper-o"></i>
    <i className="fa fa-code script"></i>
  </a>
)

class AdvancedHolder extends React.Component {

  render() {
    let isScript = this.props.isScript
    return (<div className="advancedPanel" style={this.props.style}>
      <header>
        <a onClick={this.props.onBack} className="btn secondary"><i
          className="fa fa-arrow-left"></i>Back</a>
        <ToggleModeButton isScript={isScript} onToggle={this.props.onToggleMode}/>
      </header>
      {(isScript) ?
        <CodeMirror
          value={this.props.cmValue}
          onRefresh={this.props.onRefresh}/> :
        <BandsPanel
          channels={this.props.channels}
          layers={this.props.layers}
          onDrag={this.props.onDrag}/>
      }
    </div>)
  }
}

AdvancedHolder.propTypes = {
  style: PropTypes.object,
  isScript: PropTypes.bool.isRequired,
  channels: PropTypes.array,
  cmValue: PropTypes.string,
  layers: PropTypes.object,
  onDrag: PropTypes.func,
  onBack: PropTypes.func,
  onToggleMode: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default AdvancedHolder;
