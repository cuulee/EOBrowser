import moment                    from 'moment'
import {getProba}                from './mapLayers'
import {getPinsFromLocalStorage} from '../utils/utils'
import {convertFromWgs84}        from '../utils/coords'

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
  maxcc: 100,
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
  mainTabIndex: 0,
  path: '',
  presets: {},
  colCor: '',
  isActiveLayerVisible: true,
  cloudCorrection: 'none',
  gain: 1,
  compareMode: false,
  compareModeType: "opacity",
  pinResults:  getPinsFromLocalStorage(),
  probaLayer: getProba(),
  probaLayers: {},
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
  coordinateSystems: [
    {
      name: 'WGS84',
      code: 'EPSG:4326',
      serialize: function (lat_4326, lng_4326) {
        const precision = 4

        // lat
        let latDirection = 'N'
        let lat = parseFloat(lat_4326)
        if(lat_4326 < 0) {
          latDirection = 'S'
          lat *= -1 
        }

        // lng
        let lngDirection = 'E'
        let lng = parseFloat(lng_4326)
        if(lng_4326 < 0) {
          lngDirection = 'W'
          lng *= -1 
        }

        lat = lat.toFixed(precision)
        lng = lng.toFixed(precision)

        return `${this.code.toUpperCase()} &nbsp;&nbsp;Latitude: ${lat}°${latDirection} &nbsp;Longitude: ${lng}°${lngDirection}`
      },
    },{
      name: 'Popular Web Mercator',
      code: 'EPSG:3857',
      serialize: function(lat_4326, lng_4326) {
        const precision = 4
        let point = convertFromWgs84([lat_4326, lng_4326], this.code)

        
        if(point.x === undefined || point.y === undefined) {
          return 'Error!'
        }

        let x = point.x.toFixed(precision)
        let y = point.y.toFixed(precision)

        return `${this.code.toUpperCase()} &nbsp;&nbsp;X: ${x} &nbsp;Y: ${y}`
      },
    }
  ],
  selectedCrs: 'EPSG:3857',
  downloadableImageType: 'jpg',
  views
}
