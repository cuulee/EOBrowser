import React from 'react'
import sgLogo from './logo30.png'

const Header = ({user, onLogout, showLogin, onShowLogin}) => {
  return <header className='logoHeader'>
      {showLogin && <span className="userPanel">
        {user ? 
          <div>Hello, <b>{user.userName}</b>
            <a href="javascript:" onClick={onLogout} title="Logout"><i className="fa fa-power-off"></i></a>
          </div>
          : <a className="btn" onClick={onShowLogin || null}>Login</a>}
      </span>}
      <span className="appTitle">
        <a className="sgLogo" href="http://www.sinergise.com" target="_blank"><img src={sgLogo} alt="Sinergise" /></a>
        EO Browser
      </span>
  </header>
}
export default Header