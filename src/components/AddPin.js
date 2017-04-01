import React, { Component, PropTypes } from "react";
import { hasPinSaved } from "../utils/utils";
import Store from "../store";
import {connect} from 'react-redux'
import cloneDeep from 'lodash/cloneDeep'

class AddPin extends Component {

  buildPinObject = () => {
    // if you reference pin from props, reference is linked to selected result in store
    const pin = cloneDeep(this.props.pin)
    const {lat, lng, zoom, preset, datasource: storeDatasource} = Store.current
    const datasource = pin.properties.rawData.datasource || storeDatasource
    pin.map = {
      latitude: lat,
      longitude: lng,
      zoom: zoom
    }
    pin.preset = preset[datasource]
    pin.name = datasource

    if (preset[datasource] === "CUSTOM") {
      pin.layers = Store.current.layers[datasource]
      pin.evalscript = Store.current.evalscript[datasource];
    }
    return pin
  }

  render() {
    const pin = this.buildPinObject();
    return !hasPinSaved(pin)
      ? <a
          className="addToPin"
          onClick={() => {
            // this.props.onAddToPin && this.props.onAddToPin();
            Store.addPinResult(pin);
            Store.setTabIndex(3)
          }}
          title="Pin to your favourite items"
        >
          <i className="fa fa-thumb-tack" />
        </a>
      : null;
  }
}

AddPin.propTypes = {
  pin: React.PropTypes.object.isRequired,
  onAddToPin: React.PropTypes.func
};

export default connect(s => s)(AddPin);
