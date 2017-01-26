import React from 'react'
import logo from '../logo.png'

const Header = ({withBg, user, onLogout}) => (
  <header className={`logoHeader ${withBg && 'withBg'}`}>
    {user && user.userName &&
      <span className="userPanel">
        Hello, <b>{user.userName}</b>
        <a href="javascript:" onClick={onLogout} title="Logout"><i className="fa fa-power-off"></i></a>
      </span>}
    <a href="http://www.esa.int/" target="_blank"><img src={logo} alt="ESA EO Browser" />EO Browser</a>
  </header>
)
export default Header