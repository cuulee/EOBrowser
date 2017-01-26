import moment from 'moment'
import {getProba} from './mapLayers'

const views = {
    PRESETS: "1",
    BANDS: "2",
    SCRIPT: "3"
}

module.exports = {
  layers: {},
  startLocation: '',
  doRefresh: true,
  datasource: '',
  datasources: [],
  isLoaded: true,
  isSearching: false,
  searchResults: {},
  searchFilterResults: {},
  searchParams: {},
  lat: 41.90,
  lng: 12.50,
  zoom: 10,
  size: [0, 0],
  priority: 'mostRecent',
  mosaic: 'mostRecent',
  evalscript: '',
  opacity: 100,
  maxcc: 20,
  imgWmsUrl: "",
  mapBounds: {},
  proba: {
    show: false
  },
  minDate: moment("1984-03-01"),
  maxDate: moment(),
  dateFrom: moment().subtract(1, "months"),
  dateTo: moment(),
  dateFormat: "YYYY-MM-DD",
  availableDays: [],
  preset: {},
  currView: views.PRESETS,
  channels: {},
  path: '',
  presets: {},
  colCor: '',
  cloudCorrection: 'none',
  gain: 1,
  compareMode: false,
  compareModeType: "opacity",
  pinResults: [],
  probaLayer: getProba(),
  defaultPolyStyle: {
    weight: 1,
    color: "#398ade",
    opacity: 0.8,
    fillColor: "#398ade",
    fillOpacity: 0.15
  },
  highlightPolyStyle: {
    weight: 2,
    color: "#57de71",
    opacity: 1,
    fillColor: "#57de71",
    fillOpacity: 0.3
  },
  views
}
