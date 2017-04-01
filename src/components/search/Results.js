import React, {PropTypes} from 'react'
import './Results.scss'
import ResultsInnerPanel from './ResultsInnerPanel'
import _ from 'lodash'

class ResultsPanel extends React.Component {

  renderDatasourceResults = (ds, i) => {
    let items = _.get(this.props.data, ds)
    if (!items || items.length === 0) {
      return null
    }
    return items.length > 0 && <ResultsInnerPanel
        key={i}
        isSearching={this.props.isSearching}
        datasource={ds}
        searchParams={this.props.searchParams}
        showClear={this.props.showClear}
        onResultClick={this.props.onResultClick}
        onLoadMore={this.props.onLoadMore}
        data={this.props.data}
      />
  }

  render() {
    return (
      <div className="resultsPanel">
        <b>Results</b>{this.props.showClear && <a style={{float: 'right'}} onClick={this.props.onClearData}>Clear data</a>}
        {this.props.datasources && this.props.datasources.map(this.renderDatasourceResults)}
      </div>
    );
  }
}

ResultsPanel.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  datasource: PropTypes.string,
  datasources: PropTypes.array,
  onResultClick: PropTypes.func,
  searchParams: PropTypes.object,
  showClear: PropTypes.bool,
  isSearching: PropTypes.bool,
  onLoadMore: PropTypes.func,
  onClearData: PropTypes.func,
};

export default ResultsPanel