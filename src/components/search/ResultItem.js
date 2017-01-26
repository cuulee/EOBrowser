import React, {PropTypes} from 'react'
import request from 'superagent'

const PolySvg = () => (<svg height="16px" version="1.1" viewBox="0 0 20 20" width="20px" className="umbrella" xmlns="http://www.w3.org/2000/svg">
  <g fillRule="evenodd" stroke="none" strokeWidth="2" transform="translate(-336.000000, -480.000000)">
    <path d="M344,480 L351.986694,486.039185 L347.973511,495.993042 L340.019287,495.993042 L336.026611,486.039185 Z M344,481 L337.023285,486.284286 L340.516876,494.993912 L347.476822,494.993912 L350.988358,486.284286 Z M344,481"/>
  </g>
</svg>)

class ResultItem extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      linkVisible: false,
      scihubLink: ""
    }
  }

  toggleLinksPanel = (id, queryScihub) => {
    this.setState({linkVisible: !this.state.linkVisible})
    if (this.state.scihubLink === '' && queryScihub) {
      request.get(`http://services.sentinel-hub.com/index/s2/v3/tiles/${id}`).end((err, res) => {
        if (res && res.ok) {
          let product = res.body.product["@ref"]
          this.setState({scihubLink: `http://scihub.copernicus.eu/dhus/odata/v1/Products('${product.split("/").splice(-1)[0]}')/$value`})
        } else if (err) {
          this.setState({scihubError: err.message})
        }
      })
    }
  }

  render() {
    let { geom } = this.props
    let item = geom.properties.rawData
    let sourcePath = item.sourcePath
    let index = geom.properties.index
    return (<div
      className="resultItem"
      onMouseOver={() => this.props.onResultClick(index, false)}>
      {item.path !== '' ? <img src={item.path} role="presentation"/> : <div className="noImage">No preview available</div> }
      <div className="details">
        <div title="Sensing time"><i className="fa fa-calendar"></i>{item.time}</div>
        <div title="Cloud coverage"><i className="fa fa-cloud"></i>{item.cloudCoverage} %</div>
        {item.area && <div title="Surface area"><PolySvg/>{item.area} km<sup>2</sup></div>}
        {item.sunElevation && <div title="Sun elevation"><i className="fa fa-sun-o"></i>{item.sunElevation.toFixed(1)} %</div>}
        {sourcePath &&
          <a
            className={`pathLinkIcon ${this.state.linkVisible && 'active'}`}
            onClick={() => this.toggleLinksPanel(item.id, item.datasource.includes('Sentinel'))}>
              <i className="fa fa-link"></i>
          </a>
        }
        <a className='btn' onClick={() => this.props.onResultClick(index, true, geom)}>Visualize</a>

      </div>
      {this.state.linkVisible && <div className="showLinkPanel">
        EO Cloud path:
        <input ref="linkUrl" className="urlInput" defaultValue={sourcePath} readOnly={true} onFocus={() => this.refs.linkUrl.select()}/>
        {this.state.scihubLink !== '' && <div>SciHub link: <a className="scihubLink" href={this.state.scihubLink} target="_blank">{this.state.scihubLink}</a></div>}
      </div>}
    </div>)
  }
}

ResultItem.PropTypes = {
  onResultClick: PropTypes.func
}
export default ResultItem