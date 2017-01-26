import React from 'react'
import {DateField, MonthView} from 'react-date-picker';
import Store from '../store'
import onClickOutside from 'react-onclickoutside'
import 'react-date-picker/index.css'
import moment from 'moment'

class MyDatePicker extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isDateVisible: false,
      dateString: ''
    }
  }

  handleClickOutside() {
    this.setState({isDateVisible: false});
  }

  onDay = (props) => {
    if (this.props.noHighlight) {
      return props
    }
    if (Store.current.availableDays.includes(props.dateMoment.format(Store.current.dateFormat))) {
      props.className += ' hasData'
    }
    return props
  }

  onDayPicked = (e) => {
    this.setState({isDateVisible: false})
    document.activeElement.blur() //lose focus so you can pick datepicker again
    this.props.onSelect(e)
  }

  onKeyDown = (e) => {
    this.setState({dateString: e})
  }
  onChange = () => {
    if (this.state.dateString.match(/^(\d{4})\-(\d{1,2})\-(\d{1,2})$/)) {
      let date = moment(this.state.dateString)
      if (date.isValid()) {
        this.onDayPicked(date)
        this.setState({isDateVisible: false})
        this.props.onSelect(date)
      }
    }
  }

  render() {
    return (<div id={this.props.id}
                 className={this.props.className || ((this.state.isDateVisible && 'active') + ' floatItem')}>
      <i className={`fa fa-${this.props.icon || 'calendar'}`} onClick={() => {
        this.setState({isDateVisible: !this.state.isDateVisible})
      }}></i>
      <span>
                <DateField
                  ref="dateInput"
                  dateFormat="YYYY-MM-DD"
                  onFocus={() => this.setState({isDateVisible: true})}
                  onBlur={this.onChange}
                  onChange={this.onKeyDown}
                  updateOnDateClick={true}
                  showClock={false}
                  strict={false}
                  clearIcon={false}
                  expanded={this.state.isDateVisible}
                  minDate={this.props.minDate || Store.current.minDate}
                  maxDate={this.props.maxDate || Store.current.maxDate}
                  defaultValue={this.props.defaultValue || Store.current.dateTo}
                >
                        <MonthView
                          onChange={this.onDayPicked}
                          theme={null}
                          onRenderDay={this.onDay}
                          highlightWeekends={true}
                          highlightToday={true}
                          weekNumbers={false}
                          highlightRangeOnMouseMove={false}
                          weekStartDay={1}
                          footer={false}/>
                </DateField>
            </span>
    </div>)
  }
}
MyDatePicker.PropTypes = {
  onSelect: React.PropTypes.func,
  noHighlight: React.PropTypes.bool,
  defaultValue: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.object])
}
export default onClickOutside(MyDatePicker)


