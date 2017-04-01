import React, {PropTypes} from 'react'
import './Results.scss'
import NotificationPanel from '../NotificationPanel'
import ResultItem from './ResultItem'
import _ from 'lodash'

class ResultsInnerPanel extends React.Component {

  renderItems = (data) => {
    if (data === undefined) return null
    return <div>
      {data.map((geom, i) => {
        return (<ResultItem
          key={i}
          geom={geom}
          onMouseOver={this.props.onResultClick}
          onResultClick={this.props.onResultClick}
        />)
      }
    )}
    </div>
  }

  renderWaypoint = (ds, isBig) => {
    if (!this.props.isSearching && _.get(this.props,`searchParams.${ds}.hasMore`)) {
      return (
        <a className={isBig && 'btn'}
          onClick={() => this.props.onLoadMore(ds)}>Load more</a>
      );
    }
  }

  renderHeading = (data, datasource) => {
    if (_.isEmpty(data)) return
    let items = {}
    items = _.get(data, datasource)
    let {prettyName} = data[datasource][0].properties.rawData //we read name from first item
    return <div>
      <div className="resultsHeading">
        {prettyName}: Showing {items.length} {items.length > 1 ? "results": "result"}.
        {this.renderWaypoint(datasource, false)}
        {this.props.isSearching && <a><i className="fa fa-spinner fa-spin fa-fw"></i></a> }
      </div>
    </div>
  }

  render() {
    let {datasource, data} = this.props
    let items = _.get(data, datasource)
    return <div className="resultsInnerPanel">
        {datasource && this.renderHeading(data, datasource)}
        {this.renderItems(items)}
        {this.renderWaypoint(datasource, true)}
        {this.props.isSearching && <NotificationPanel msg="Loading more results ..." type='loading' />}
      </div>
  }
}

ResultsInnerPanel.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  onResultClick: PropTypes.func,
  searchParams: PropTypes.object,
  showClear: PropTypes.bool,
  datasource: PropTypes.string,
  isSearching: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default ResultsInnerPanel