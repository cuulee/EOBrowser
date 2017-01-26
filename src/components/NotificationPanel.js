import React, {PropTypes} from 'react'
const NotificationPanel = ({type, msg, html}) => {
    let icon = ''
    switch (type) {
      case 'error':
        icon = 'exclamation-circle'
        break
      case 'ok':
        icon = 'check-circle'
        break
      case 'warning':
        icon = 'exclamation-triangle'
        break
      case 'info':
        icon = 'info-circle'
        break
      case 'loading':
        icon = 'spinner fa-spin fa-fw'
        break
      default:
        break
    }

    return <div className="notification">
      <i className={`fa fa-${icon}`} style={{marginRight: '6px'}}></i>
      {html && <span dangerouslySetInnerHTML={{__html: msg }}></span>}
      {!html && msg}
    </div>
  }
 NotificationPanel.propTypes = {
    type: PropTypes.oneOf(['error','ok', 'info', 'warning', 'loading']).isRequired,
    msg: PropTypes.string.isRequired,
    html: PropTypes.bool
}
export default NotificationPanel;