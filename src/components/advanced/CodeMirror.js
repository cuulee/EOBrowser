import React from 'react'
import Codemirror from 'react-codemirror';
import 'codemirror/mode/javascript/javascript'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/dracula.css'

class CodeMirror extends React.Component {

  state = {
    code: this.props.value
  }
  b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
  }

  render() {
    var options = {
      lineNumbers: true,
      mode: "javascript",
      lint: true
    }
    return <div style={{clear: 'both'}}>
      <Codemirror value={this.state.code} onChange={(newCode) => this.setState({code: newCode})} options={options}/>
      <div className="scriptBtnPanel">
        <button onClick={() => this.props.onRefresh(this.b64EncodeUnicode(this.state.code))} className="btn"><i className="fa fa-refresh"></i>Refresh</button>
      </div>
    </div>
  }
}
CodeMirror.propTypes = {
  value: React.PropTypes.string,
  onRefresh: React.PropTypes.func
};
export default CodeMirror