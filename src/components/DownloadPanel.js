import React from 'react'
import Store from '../store'
import Toggle from 'react-toggle'
import NotificationPanel from './NotificationPanel'
import _ from 'lodash'

import './DownloadPanel.scss'

export default class DownloadPanel extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            crsSerializationVisible: false
        }
    }

    // handle
    handleImageTypeToggle() {
        const {downloadableImageType} = Store.current

        if(downloadableImageType === 'jpg') {
            Store.setDownloadableImageType('tiff')
            return
        }

        Store.setDownloadableImageType('jpg')
    }

    handleCrsChange(e) {
        let value = e.target.value

        Store.setSelectedCrs(value)
    }


    // figure out state and generate message
    getImageTypeToggleState() {
        const {downloadableImageType} = Store.current

        return downloadableImageType !== 'jpg'
    }

    isUserLoggedIn() {
        const {user} = Store.current

        let loggedIn = !_.isEmpty(user)

        return loggedIn
    }

    shouldIShowTiffErrorIcon() {
        const {downloadableImageType}= Store.current
        let tiffConditionsMet = this.areTiffConditionsMet()

        return downloadableImageType === 'tiff' && !tiffConditionsMet
    }

    areTiffConditionsMet() {
        const {squaresPerMtr, downloadableImageType} = Store.current

        if (!squaresPerMtr) return false

        // tiff limitations
        // height and width of the bounding box should be at most 5000x5000
        const [imgw, imgh] = squaresPerMtr

        return imgw <= 5000 && imgh <= 5000
    }

    whyAreTiffConditionsNotMet() {
        let conditionsMet = this.areTiffConditionsMet()

        if(!conditionsMet) return 'Tiff image resolution can be upmost 5000 by 5000 pixels.\nThe bounding box you are seeing exceeds that.\nPlease zoom in.'
        
        return null;
    }

    // -> coordinate system
    shouldCrsSerializationBeVisble() {
        let expanded = this.state.crsSerializationVisible

        return expanded && this.crsSerializationExists()
    }

    crsSerializationExists() {
        return this.getCrsSerialization() !== null
    }

    getCrsSerialization() {
        const {coordinateSystems, selectedCrs, lat, lng} = Store.current
        let crs = coordinateSystems.find(value => value.code === selectedCrs)

        let crsSerialization = null
        if(crs !== undefined)
            crsSerialization = crs.serialize(lat, lng)

        return crsSerialization
    }

    toggleSerialization(value) {
        this.setState({crsSerializationVisible: value})
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 200)
    }

    // -> download button
    isDownloadButtonEnabled() {
        const {downloadableImageType} = Store.current

        if(downloadableImageType === 'jpg') return true

        return this.areTiffConditionsMet()        
    }

    whyIsDownloadButtonDisabled() {
        let downloadButtonEnabled = this.isDownloadButtonEnabled()

        if(!downloadButtonEnabled) 
            return 'Download button is disabled because tiff image resolution can be upmost 5000 by 5000 pixels.\nThe bounding box you are seeing exceeds that.\nPlease zoom in.'

        return ''
    }

    // image download
    handleImageDownload() {
        const {downloadableImageType} = Store.current

        if(downloadableImageType === 'tiff') {
            this.props.downloadFunc(true) // tiff
            return
        }
        
        this.props.downloadFunc(false) // jpg
    }   

    // render
    render() {
        const {coordinateSystems, selectedCrs}  = Store.current

        return (
            <footer className="DownloadPanel">
                {/* Image type */}
                {this.isUserLoggedIn() && (
                    <div className="item">
                        <div className="pull-left half-size">
                            Image type
                        </div>
                        <div className="pull-right half-size">
                            {/* jpg/tiff Toggle */}
                            {this.shouldIShowTiffErrorIcon() && (
                                <span className="pull-right">
                                    <i className="fa fa-exclamation-triangle toggleInfo"
                                       title={this.whyAreTiffConditionsNotMet()}></i>
                                </span>
                            )}
                            <div className="pull-right">
                                <label>
                                    <span>jpg</span>
                                    <Toggle
                                        checked={this.getImageTypeToggleState()}
                                        icons={false}
                                        onChange={this.handleImageTypeToggle} />
                                    <span>tiff</span>
                                </label>
                            </div>
                        </div>

                        <div className="clear-fix"></div>
                    </div>
                )}
                
                {/* Coordinate system */}
                {this.getImageTypeToggleState() && <div className="item">
                    <div className="pull-left half-size">
                        Coordinate system
                    </div>
                    <div className="pull-right half-size">
                        <div className="pull-right">
                            {/* Serialization toggle */}
                            <span className="pull-right crsInfo">
                                {!this.state.crsSerializationVisible && (
                                    <i className="fa fa-plus-circle"
                                       title="Expand"
                                       onClick={this.toggleSerialization.bind(this, true)}></i>
                                )}
                                {this.state.crsSerializationVisible && (
                                    <i className="fa fa-minus-circle"
                                       title="Collapse"
                                       onClick={this.toggleSerialization.bind(this, false)}></i>
                                )}
                            </span>

                            <select value={selectedCrs}
                                    onChange={this.handleCrsChange}
                                    className="crsSelect"
                            >
                                {coordinateSystems.map(value => (
                                    <option key={value.code}
                                            value={value.code}
                                    >
                                        {value.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="clear-fix"></div>
                </div>}

                {/* Coordinates in new system - serialized */}
                {this.shouldCrsSerializationBeVisble() && (
                    <div className="item notificationBox">
                        <NotificationPanel msg={this.getCrsSerialization()} type="nothing" html={true}/>
                    </div>
                )}
                
                {/* Button */}
                <div className="item">
                    <button className="btn full-size"
                            title={this.isDownloadButtonEnabled() ? 'Download image' : this.whyIsDownloadButtonDisabled()}
                            onClick={this.handleImageDownload.bind(this)}
                            disabled={!this.isDownloadButtonEnabled()}
                    >
                        <i className="fa fa-image"></i>
                        Download image
                    </button>
                </div>
                
            </footer>
        )
    }
}