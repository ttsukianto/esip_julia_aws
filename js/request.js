var queriedStations = [];
var savedStations = [];
var fs = 10.0;
var freqmin = 0.1;
var freqmax = 0.2;
var ccstep = 450;
var cclen = 1800;
var maxlag = 60.0;

function clearAll() {
   $("#displayedStations tbody tr").remove();
   markersLayer.clearLayers();
   rectangleLayer.clearLayers();
   queriedStations = [];
}

function parseXml(xml){
  // First, clear all previous query markers from map
  clearAll();
  $(xml).find("Network").each(function(){
    var network = $(this).attr("code");
    $(this).find("Station").each(function(){
      var currentStation = [];
      currentStation.push(network);
      // Get attributes from XML file
      var station = $(this).attr("code");
      currentStation.push(station);
      var startDate = $(this).attr("startDate");
      currentStation.push(startDate);
      var endDate = $(this).attr("endDate");
      currentStation.push(endDate);
      var latitude = $(this).find("Latitude").text();
      currentStation.push(parseFloat(latitude));
      var longitude = $(this).find("Longitude").text();
      currentStation.push(parseFloat(longitude));
      var elevation = $(this).find("Elevation").text();
      currentStation.push(parseFloat(elevation));
      // Create map popup
      var popupText = "<dl><dt>Network</dt>"
             + "<dd>" + network + "</dd>"
             + "<dt>Station</dt>"
             + "<dd>" + station + "</dd>"
             + "<dt>Start Date</dt>"
             + "<dd>" + startDate + "</dd>"
             + "<dt>End Date</dt>"
             + "<dd>" + endDate + "</dd>"
             + "<dt>Latitude</dt>"
             + "<dd>" + latitude + "</dd>"
             + "<dt>Longitude</dt>"
             + "<dd>" + longitude + "</dd>"
             + "<dt>Elevation</dt>"
             + "<dd>" + elevation + "</dd>"
             + "</dl>";
      // Add popup to map
      var stationMarker = L.marker([$(this).find("Latitude").text(),$(this).find("Longitude").text()]).addTo(map);
      stationMarker.bindPopup(popupText);
      markersLayer.addLayer(stationMarker);
      // Add current station to displayed table
      var currentRow = document.querySelector("#displayedStations tbody").insertRow(-1);
      var checkbox = document.createElement("INPUT");
      checkbox.setAttribute("type", "checkbox");
      currentRow.insertCell(0).append(checkbox);
      currentRow.insertCell(1).innerHTML = network;
      currentRow.insertCell(2).innerHTML = station;
      currentRow.insertCell(3).innerHTML = latitude;
      currentRow.insertCell(4).innerHTML = longitude;
      currentRow.insertCell(5).innerHTML = startDate;
      currentRow.insertCell(6).innerHTML = endDate;
      document.querySelector("#displayedStations tbody").appendChild(currentRow);
      queriedStations.push(currentStation);
    });
  });
  $("#numQueried").html(queriedStations.length);
  map.fitBounds(markersLayer.getBounds());
}

$(document).on("click", "#selectAll", function(){
  var inputs = document.getElementsByTagName("input");
   for(var i = 0; i < inputs.length; i++) {
       if(inputs[i].type == "checkbox") {
           if(!inputs[i].checked) {
             inputs[i].checked = true;
           }
       }
   }
});

$(document).on("click", "#deselectAll", function(){
  var inputs = document.getElementsByTagName("input");
   for(var i = 0; i < inputs.length; i++) {
       if(inputs[i].type == "checkbox") {
           if(inputs[i].checked) {
             inputs[i].checked = false;
           }
       }
   }
});

$(document).on("click", "#save", function(){
  var selectedIndices = $.map($("input:checked").closest("tr"), function(tr) { return $(tr).index(); });
  savedStations = selectedIndices.map(i => queriedStations[i]);
  $("#numSaved").html(savedStations.length);
});

$(document).on("click", "#clear", function(){
  savedStations = [];
  $("#numSaved").html(0);
});

$(document).on("click", "#launch", function(){
  if(document.getElementById("fs").value) {
    fs = document.getElementById("fs").value;
  }
  if(document.getElementById("freqmin").value) {
    freqmin = document.getElementById("freqmin").value;
  }
  if(document.getElementById("freqmax").value) {
    freqmax = document.getElementById("freqmax").value;
  }
  if(document.getElementById("ccstep").value) {
    ccstep = document.getElementById("ccstep").value;
  }
  if(document.getElementById("cclen").value) {
    cclen = document.getElementById("cclen").value;
  }
  if(document.getElementById("maxlag").value) {
    maxlag = document.getElementById("maxlag").value;
  }
});


$(document).on("click", "#update", function(){
  var url = "http://service.iris.edu/fdsnws/station/1/query?minlat=" + minLat + "&maxlat=" + maxLat + "&minlon=" + minLong + "&maxlon=" + maxLong;

  if(document.getElementById("network").value) { // Networks
    var network = document.getElementById("network").value;
    url = url + "&network=" + network;
  }
  if(document.getElementById("station").value) { // Stations
    var station = document.getElementById("station").value;
    url = url + "&station=" + station;
  }
  if(document.getElementById("location").value) { // Locations
    var location = document.getElementById("location").value;
    url = url + "&location=" + location;
  }
  if(document.getElementById("channel").value) { // Channels
    var channel = document.getElementById("channel").value;
    url = url + "&channel=" + channel;
  }
  if(document.getElementById("start-date").value) { // Start Date
    var start = document.getElementById("start-date").value;
    url = url + "&starttime=" + start;
  }
  if(document.getElementById("end-date").value) { // End Date
    var end = document.getElementById("end-date").value;
    url = url + "&endtime=" + end;
  }

  console.log(url) // Verifying if the URL is correct

  $.ajax({ // Query IRIS
    type: "GET",
    url: url,
    dataType: "xml",
    success: parseXml
  });
});
