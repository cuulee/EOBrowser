import React from 'react'
import Codemirror from 'react-codemirror';
import 'codemirror/mode/javascript/javascript'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/dracula.css'

class CodeMirror extends React.Component {

  render() {
    var options = {
      lineNumbers: true,
      mode: "javascript",
      lint: true
    }
    return <div style={{clear: 'both'}}>
      <Codemirror value={this.props.value} onChange={(newCode) => this.props.onUpdate(newCode)} options={options}/>
      <div className="scriptBtnPanel">
        <button onClick={this.props.onRefresh} className="btn"><i className="fa fa-refresh"></i>Refresh</button>
      </div>
    </div>
  }
}
CodeMirror.propTypes = {
  onUpdate: React.PropTypes.func,
  value: React.PropTypes.string,
  onRefresh: React.PropTypes.func
};
export default CodeMirror