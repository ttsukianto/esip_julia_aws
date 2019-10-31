

function parseXml(xml){
  markersLayer.clearLayers();
  $(xml).find("Network").each(function(){
    var network = $(this).attr("code");
    $(this).find("Station").each(function(){
      var popupText = "<dl><dt>Network</dt>"
             + "<dd>" + network + "</dd>"
             + "<dt>Station</dt>"
             + "<dd>" + $(this).attr("code") + "</dd>"
             + "<dt>Start Date</dt>"
             + "<dd>" + $(this).attr("startDate") + "</dd>"
             + "<dt>End Date</dt>"
             + "<dd>" + $(this).attr("endDate") + "</dd>"
             + "<dt>Latitude</dt>"
             + "<dd>" + $(this).find("Latitude").text() + "</dd>"
             + "<dt>Longitude</dt>"
             + "<dd>" + $(this).find("Longitude").text() + "</dd>"
             + "<dt>Elevation</dt>"
             + "<dd>" + $(this).find("Elevation").text() + "</dd>"
             + "</dl>";
      var stationMarker = L.marker([$(this).find("Latitude").text(),$(this).find("Longitude").text()]).addTo(map);
      stationMarker.bindPopup(popupText);
      markersLayer.addLayer(stationMarker);
    });
  });
}

$(document).on("click", "#update", function(){
  var url = "http://service.iris.edu/fdsnws/station/1/query?";
  var requestedParams = 0;

  if(document.getElementById("network").value) { // Networks
    var network = document.getElementById("network").value;
    if(requestedParams != 0) {
      url = url + "&network=" + network;
    }
    else {
      url = url + "network=" + network;
    }
    requestedParams++;
  }
  if(document.getElementById("station").value) { // Stations
    var station = document.getElementById("station").value;
    if(requestedParams != 0) {
      url = url + "&station=" + station;
    }
    else {
      url = url + "station=" + station;
    }
    requestedParams++;
  }
  if(document.getElementById("location").value) { // Locations
    var location = document.getElementById("location").value;
    if(requestedParams != 0) {
      url = url + "&location=" + location;
    }
    else {
      url = url + "location=" + location;
    }
    requestedParams++;
  }
  if(document.getElementById("channel").value) { // Channels
    var channel = document.getElementById("channel").value;
    if(requestedParams != 0) {
      url = url + "&channel=" + channel;
    }
    else {
      url = url + "channel=" + channel;
    }
    requestedParams++;
  }
  if(document.getElementById("start-date").value) { // Start Date
    var start = document.getElementById("start-date").value;
    if(requestedParams != 0) {
      url = url + "&starttime=" + start;
    }
    else {
      url = url + "starttime=" + start;
    }
    requestedParams++;
  }
  if(document.getElementById("end-date").value) { // End Date
    var end = document.getElementById("end-date").value;
    if(requestedParams != 0) {
      url = url + "&endtime=" + end;
    }
    else {
      url = url + "endtime=" + end;
    }
    requestedParams++;
  }

  console.log(url) // Verifying if the URL is correct

  $.ajax({ // Query IRIS
    type: "GET",
    url: url,
    dataType: "xml",
    success: parseXml
  });
});
