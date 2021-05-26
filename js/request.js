// initialize storage
var queriedChannels = [];
var savedChannels = [];
var params = [];
var stackingParams = [];
var savedCSV = "";
var paramsCSV = "";
var stackingCSV = "";
var id;

// default cross-correlation parameters
var fs = 10.0;
var freqmin = 0.1;
var freqmax = 0.2;
var ccstep = 450;
var cclen = 1800;
var maxlag = 60.0;

// default stacking parameters
var phaseSmoothing = 2;

// enable information box and phase-weighted stacking input toggling
$(document).ready(function(){
  $('[data-toggle="tooltip"]').tooltip();

  $("select").change(function(){
        $(this).find("option:selected").each(function(){
            var val = $(this).attr("value");
            if(val == "phase-weighted"){
                $("#phaseContainer").show();
            } else{
                $("#phaseContainer").hide();
            }
        });
    }).change();
});


/**
 * Clears all objects on map and saved channels (refresh previous queries)
 */
function clearAll() {
   $("#displayedStations tbody tr").remove();
   markersLayer.clearLayers();
   rectangleLayer.clearLayers();
   queriedChannels = [];
}

/**
 * Reads XML files from IRIS to display and save queried stations
 * @param xml xml file of seismic station information from IRIS
 */
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

/**
 * Select all queried seismic stations
 */
function selectAll() {
  var inputs = document.getElementsByTagName("input");
   for(var i = 0; i < inputs.length; i++) {
       if(inputs[i].type == "checkbox") {
           if(!inputs[i].checked) {
             inputs[i].checked = true;
           }
       }
   }
}

/**
 * Deselect all queried seismic stations
 */
function deselectAll() {
  var inputs = document.getElementsByTagName("input");
   for(var i = 0; i < inputs.length; i++) {
       if(inputs[i].type == "checkbox") {
           if(inputs[i].checked) {
             inputs[i].checked = false;
           }
       }
   }
}

/**
 * Save selected seismic stations
 */
function save() {
  var selectedIndices = $.map($("input:checked").closest("tr"), function(tr) { return $(tr).index(); });
  savedChannels = selectedIndices.map(i => queriedChannels[i]);
  $("#numSaved").html(savedChannels.length);
  savedChannels.unshift(["Network", "Station", "Location", "Channel", "StartDate", "EndDate"]);
  channelsText = savedChannels.map(e => e.join(",")).join("\n");
  savedCSV = encodeURI("data:text/csv;charset=utf-8," + channelsText);
}

/**
 * Clear saved seismic stations
 */
function clear() {
  savedChannels = [];
  $("#numSaved").html(0);
}

/**
 * Download a csv file of saved seismic stations
 */
function downloadStations() {
  var link = document.createElement("a");
  link.setAttribute("href", savedCSV);
  link.setAttribute("download", "stations.csv");
  document.body.appendChild(link);
  link.click();
}

/**
 * Upload saved seismic stations and cross-correlation parameters, and launch the cross-correlation process on AWS
 */
function launch() {
  params = []; // generate an xcor parameter variable
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
  // Generate a random folder id for S3/EC2 upload/download
  id = Math.round(100000*Math.random());
  // Put the xcor params into the params variable
  params.push([fs, freqmin, freqmax, ccstep, cclen, maxlag]);
  params.unshift(["fs", "freqmin", "freqmax", "cc_step", "cc_len", "maxlag"]);
  paramsText = params.map(e => e.join(",")).join("\n");
  paramsCSV = encodeURI("data:text/csv;charset=utf-8," + paramsText);
  AWS.config.credentials.refresh(function(){
    s3.upload({ // Upload the xcor parameter file (params.csv) to S3
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
    s3.upload({ // Upload the selected station file (stations.csv) to S3
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
}

/**
 * Download cross-correlation files after processing on EC2
 */
function downloadXcor() {
  AWS.config.credentials.refresh(function(){
    s3.getObject({
        Key: "processed/" + id + ".zip",
        },
        function(err, data) {
          if(err != null) {
            alert("Your cross-correlation job is not yet ready. Thank you for your patience.");
          }
          else {
            alert("Loaded " + data.ContentLength + " bytes");
            console.log(data);
            //var link = document.createElement("a");
            //link.setAttribute("href", data.Body);
            //link.setAttribute("download", id + ".zip");
            //document.body.appendChild(link);
            //link.click();
            console.log(data.ContentLength);
            var blob = new Blob([data.Body], {type: "application/zip"});
            console.log(blob.size);
            saveAs(blob, id + ".zip");
          }
        });
    });
}

/**
 * Download selected cross-correlation parameters
 */
function downloadParams() {
  var link = document.createElement("a");
  link.setAttribute("href", paramsCSV);
  link.setAttribute("download", "xcor_params.csv");
  document.body.appendChild(link);
  link.click();
};

/**
 * Download selected stacking parameters
 */
function downloadStackingParams() {
  params = [];
  if(document.getElementById("stack").value) {
    stack = document.getElementById("stack").value;
    if(stack == "phase-weighted") {
      if(document.getElementById("phase").value) {
        phaseSmoothing = document.getElementById("phase").value;
      }
    }
    else {
      phaseSmoothing = "";
    }
  }
  if(document.getElementById("stackAll").value) {
    stackAll = $('#stackAll').is(":checked");
  }
  params.push([stack, phaseSmoothing, stackAll]);
  params.unshift(["type", "phase_smooth", "stack_all"]);
  paramsText = params.map(e => e.join(",")).join("\n");
  stackingCSV = encodeURI("data:text/csv;charset=utf-8," + paramsText);
  var link = document.createElement("a");
  link.setAttribute("href", stackingCSV);
  link.setAttribute("download", "stacking_params.csv");
  document.body.appendChild(link);
  link.click();
};

/**
 * Query the IRIS database based on user input under Station Options
 */
function queryIRIS() {
  var url = "http://service.iris.edu/fdsnws/station/1/query?level=channel&minlat=" + minLat + "&maxlat=" + maxLat + "&minlon=" + minLong + "&maxlon=" + maxLong;

  // Build the IRIS url query
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
}

$(document).on("click", "#download_params", function(){
  downloadParams();
});

$(document).on("click", "#download_stacking", function(){
  downloadStackingParams();
});

$(document).on("click", "#update", function(){
  queryIRIS();
});

$(document).on("click", "#selectAll", function(){
  selectAll();
});

$(document).on("click", "#deselectAll", function(){
  deselectAll();
});

$(document).on("click", "#save", function(){
  save();
});

$(document).on("click", "#clear", function(){
  clear();
});

$(document).on("click", "#download_stations", function(){
  downloadStations();
});

$(document).on("click", "#download_xcor", function() {
  downloadXcor();
});

// XCor tab: If the "Save and Launch" button is clicked
$(document).on("click", "#launch", function(){
  launch();
});
