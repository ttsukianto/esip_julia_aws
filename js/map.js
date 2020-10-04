//default map parameters
var map = L.map('map').setView([39.8283, -98.5795], 7);
var drawnItems = new L.FeatureGroup();
var drawControl = new L.Control.Draw({
  draw: {
    polygon: false,
    polyline: false,
    circle: false,
    marker: false
  },
  edit: false
});
var markersLayer = new L.FeatureGroup();
var maxLat = 90;
var minLat = -90;
var maxLong = 180;
var minLong = -180;
var rectangleLayer = new L.LayerGroup();

/**
 * Initialize basic Leaflet map to plot seismic station locations from IRIS query
 */
function initializeMap() {
    L.esri.basemapLayer('Topographic').addTo(map);
    map.addLayer(drawnItems);
    map.addControl(drawControl);
    markersLayer.addTo(map);
    rectangleLayer.addTo(map);
}

initializeMap();

map.on('draw:created', function (e) {

    var type = e.layerType,
        layer = e.layer;

    if (type === 'rectangle') {
        maxLat = layer.getLatLngs()[0][1].lat;
        minLat = layer.getLatLngs()[0][0].lat;
        maxLong = layer.getLatLngs()[0][2].lng;
        minLong = layer.getLatLngs()[0][0].lng;
        rectangleLayer.addLayer(layer);
    }
});
