import React, {PropTypes} from 'react'
import md5 from 'js-md5'
import request from 'superagent'
import NotificationPanel from './NotificationPanel'
import Header from './Header'

class Login extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      username: '',
      pass: '',
      inLogin: false,
      error: '',
      getInstances: false,
      rememberMe: false
    }
  }

  componentWillMount() {
    let user = localStorage.getItem("sentinelUser")
    if (user) {
      user = JSON.parse(user)
      this.setState({username: user.userName, passMD5: user.passwordMD5}, () => this.doLogin(true))
    }
  }

  keyDown = (e) => {
    if (e.key === 'Enter') {
      this.doLogin(false)
    }
  }

  doLogin = (fromLocal) => {
    const {isAws} = this.props
    this.setState({inLogin: true, error: '', getInstances: false})
    let pass = fromLocal ? this.state.passMD5 : md5(this.state.pass)
    !this.state.inLogin && request.get(`http://services.sentinel-hub.com/wms/configuration/v1/sessions/login?user=${this.state.username}&pass=${pass}`)
      .end((err, res) => {
        if (res && res.ok) {
          let user = res.body.user
          this.setState({getInstances: true})
          request.get(`http://services.sentinel-hub.com/wms/configuration/v1/instances?scope=BASIC&userId=${user.id}`)
            .end((err, res) => {
              this.setState({inLogin: false, error: ''})
              if (res && res.ok) {
                if (this.state.rememberMe) {
                  user.doRemember = true
                  localStorage.setItem("sentinelUser", JSON.stringify(user))
                }
                this.props.onLogin(user, res.body)
              }
              if (err) {
                this.setState({error: err.message, inLogin: false, getInstances: false})
              }
            })
        } else if (err) {
          this.setState({error: err.message, inLogin: false, getInstances: false})
        }
      })
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.visible) {
      	this._userBox.focus()
    }
  }
  
  render() {
    return <div className="loginWrap">
      <div className="loginPanel">
        <form method="post" action="javascript:" onKeyDown={this.keyDown} onSubmit={e => {
          e.preventDefault();
          this.doLogin(false)
        }}>
          <label>Username: </label><input autoComplete="on" name="username" type="text" ref={e => this._userBox = e}
                                          onChange={e => this.setState({username: e.target.value})}
                                          value={this.state.username}/>
          <label>Password: </label><input autoComplete="on" name="password" type="password"
                                          onChange={e => this.setState({pass: e.target.value})}
                                          value={this.state.pass}/>
          {this.state.inLogin &&
          <NotificationPanel msg={`${this.state.getInstances ? 'Getting instances' : 'Logging in'}. Please wait ...`}
                             type="loading"/>}
          <div />
          <input type="checkbox" id="rememberMe" name="rememberMe" checked={this.state.rememberMe}
                 onChange={e => this.setState({rememberMe: e.target.checked})}/>
          <label htmlFor="rememberMe">Remember me</label>
          {this.state.error !== '' && !this.state.inLogin &&
          <NotificationPanel msg={this.state.error} html type="error"/>}
          <button type="submit" className="btn" disabled={this.state.inLogin}>Login</button>
        </form>
      </div>
    </div>
  }
}

Login.PropTypes = {
  onLogin: PropTypes.func.isRequired,
  isAws: PropTypes.func
}
export default Login