var map = L.map('map').setView([37.75, -122.23], 10);
L.esri.basemapLayer('Topographic').addTo(map);
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);
var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    }
});
map.addControl(drawControl);
