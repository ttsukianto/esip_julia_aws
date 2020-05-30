var queriedChannels = [];
var savedChannels = [];
var params = [];
var savedCSV = "";
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
   queriedChannels = [];
}

function parseXml(xml){
  // First, clear all previous query markers from map
  clearAll();
  $(xml).find("Network").each(function(){
    var network = $(this).attr("code");
    $(this).find("Station").each(function(){
      // Get attributes from XML file
      var station = $(this).attr("code");
      var stationStartDate = $(this).attr("startDate");
      var stationEndDate = $(this).attr("endDate");
      var latitude = $(this).find("> Latitude").text();
      var longitude = $(this).find("> Longitude").text();
      var elevation = $(this).find("> Elevation").text();
      // Create map popup
      var popupText = "<dl><dt>Network</dt>"
             + "<dd>" + network + "</dd>"
             + "<dt>Station</dt>"
             + "<dd>" + station + "</dd>"
             + "<dt>Start Date</dt>"
             + "<dd>" + stationStartDate + "</dd>"
             + "<dt>End Date</dt>"
             + "<dd>" + stationEndDate + "</dd>"
             + "<dt>Latitude</dt>"
             + "<dd>" + latitude + "</dd>"
             + "<dt>Longitude</dt>"
             + "<dd>" + longitude + "</dd>"
             + "<dt>Elevation</dt>"
             + "<dd>" + elevation + "</dd>"
             + "</dl>";
      // Add popup to map
      var stationMarker = L.marker([latitude, longitude]).addTo(map);
      stationMarker.bindPopup(popupText);
      markersLayer.addLayer(stationMarker);
      // Add current station channel to displayed table
      $(this).find("Channel").each(function() {
        var currentChannel = [];
        currentChannel.push(network);
        currentChannel.push(station);
        var location = $(this).attr("locationCode");
        currentChannel.push(location);
        var channel = $(this).attr("code");
        currentChannel.push(channel);
        var channelStartDate = $(this).attr("startDate");
        currentChannel.push(channelStartDate);
        var channelEndDate = $(this).attr("endDate");
        currentChannel.push(channelEndDate);
        var currentRow = document.querySelector("#displayedStations tbody").insertRow(-1);
        var checkbox = document.createElement("INPUT");
        checkbox.setAttribute("type", "checkbox");
        currentRow.insertCell(0).append(checkbox);
        currentRow.insertCell(1).innerHTML = network;
        currentRow.insertCell(2).innerHTML = station;
        currentRow.insertCell(3).innerHTML = location;
        currentRow.insertCell(4).innerHTML = channel;
        currentRow.insertCell(5).innerHTML = channelStartDate;
        currentRow.insertCell(6).innerHTML = channelEndDate;
        document.querySelector("#displayedStations tbody").appendChild(currentRow);
        queriedChannels.push(currentChannel);
      }); // End per-channel loop
    }); // End per-station loop
  }); // End per-network loop
  $("#numQueried").html(queriedChannels.length);
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
  savedChannels = selectedIndices.map(i => queriedChannels[i]);
  $("#numSaved").html(savedChannels.length);
  savedChannels.unshift(["Network", "Station", "Location", "Channel", "StartDate", "EndDate"]);
  channelsText = savedChannels.map(e => e.join(",")).join("\n");
  savedCSV = encodeURI("data:text/csv;charset=utf-8," + channelsText);
});

$(document).on("click", "#clear", function(){
  savedChannels = [];
  $("#numSaved").html(0);
});

$(document).on("click", "#download_stations", function(){
  var link = document.createElement("a");
  link.setAttribute("href", savedCSV);
  link.setAttribute("download", "stations.csv");
  document.body.appendChild(link);
  link.click();
});

$(document).on("click", "#launch", function(){
  params = [];
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
  id = Math.round(100000*Math.random());
  params.push([fs, freqmin, freqmax, ccstep, cclen, maxlag]);
  params.unshift(["fs", "freqmin", "freqmax", "cc_step", "cc_len", "maxlag"]);
  paramsText = params.map(e => e.join(",")).join("\n");
  paramsCSV = encodeURI("data:text/csv;charset=utf-8," + paramsText);
  AWS.config.credentials.refresh(function(){
    s3.upload({
        Key: "incoming/" + id + "/params.csv",
        Body: paramsText,
        },
        function(err, data) {
          if(err) {
            console.log("Error", err.message);
          }
        }).on('httpUploadProgress', function (progress) {
          var uploaded = parseInt((progress.loaded * 100) / progress.total);
          $("progress").attr('value', uploaded);
        });
    s3.upload({
        Key: "incoming/" + id + "/stations.csv",
        Body: channelsText,
        },
        function(err, data) {
          if(err) {
            console.log("Error", err.message);
          }
        }).on('httpUploadProgress', function (progress) {
          var uploaded = parseInt((progress.loaded * 100) / progress.total);
          $("progress").attr('value', uploaded);
        });
  });
});

$(document).on("click", "#download_params", function(){
  var link = document.createElement("a");
  link.setAttribute("href", paramsCSV);
  link.setAttribute("download", "xcor_params.csv");
  document.body.appendChild(link);
  link.click();
});


$(document).on("click", "#update", function(){
  var url = "http://service.iris.edu/fdsnws/station/1/query?level=channel&minlat=" + minLat + "&maxlat=" + maxLat + "&minlon=" + minLong + "&maxlon=" + maxLong;

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

  $.ajax({ // Query IRIS
    type: "GET",
    url: url,
    dataType: "xml",
    success: parseXml
  });
});
