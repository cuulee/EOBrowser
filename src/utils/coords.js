import proj4 from 'proj4'

export function wgs84ToMercator(point) {
    var sourceCRS = proj4.Proj('EPSG:4326');
    var destCRS = proj4.Proj('EPSG:3857');
    var pt = new proj4.toPoint([point[1], point[0]]);
    proj4.transform(sourceCRS, destCRS, pt);
    return pt;
}

export function calcBboxFromXY(point, zoomLevel, destCrsCode) {
    let xy = wgs84ToMercator(point)
    var scale = 40075016 / (512 * Math.pow(2, (Number(zoomLevel) - 1))); // does this makes sense in other CRS ?
    let arr = [];
    let imgH = window.innerHeight - 100
    let imgW = window.innerWidth - 100
    arr.push(Math.floor(Number(xy.x) - 0.5 * imgW * scale));
    arr.push(Math.floor(Number(xy.y) - 0.5 * imgH * scale));
    arr.push(Math.floor(Number(xy.x) + 0.5 * imgW * scale));
    arr.push(Math.floor(Number(xy.y) + 0.5 * imgH * scale));
    return arr;
}

export function convertFromWgs84(point, destinationCrs) {
    // point [lat_4326, lng_4326]
    // WGS84 aka EPSG:4326
    let lat_4326 = parseFloat(point[0])
    let lng_4326 = parseFloat(point[1])

    let sourceCrs = proj4.Proj('EPSG:4326');
    let destCrs = proj4.Proj(destinationCrs);

    let pt = new proj4.toPoint([lng_4326, lat_4326]);
    proj4.transform(sourceCrs, destCrs, pt);
    
    return pt
}
