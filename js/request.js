// initialize storage
var queriedChannels = [];
var savedChannels = [];
var params = [];
var stackingParams = [];
var savedCSV = "";
var paramsCSV = "";
var stackingCSV = "";
var id;
var fileList;
var ready = false;
var numFiles = 0;

// default cross-correlation parameters
var fs = 10.0;
var freqmin = 0.1;
var freqmax = 0.2;
var ccstep = 450;
var cclen = 1800;
var maxlag = 60.0;
var start;
var end;
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
  $("#start-date").datepicker({});
  $("#end-date").datepicker({});
  $("#refresh").hide();
  $("#processingMessage").hide();
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
    var prevStation = "";
    $(this).find("Station").each(function(){
      // Get attributes from XML file
      var station = $(this).attr("code");
      var stationStartDate = $(this).attr("startDate");
      var stationEndDate = $(this).attr("endDate");
      var latitude = $(this).find("> Latitude").text();
      var longitude = $(this).find("> Longitude").text();
      var elevation = $(this).find("> Elevation").text();

      if(prevStation === "") {
        prevStation = station;
      }
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
      var prevChannel = "";
      var currentChannel = [];
      var location = "";
      var channel = "";
      var channelStartDate = "";
      var channelEndDate = "";
      $(this).find("Channel").each(function() {
        channel = $(this).attr("code");
        // if new channel
        if(prevChannel !== channel) {
          // if not first channel, update end date
          if(prevChannel !== "") {
            queriedChannels[queriedChannels.length-1][5] = channelEndDate;
          }
          currentChannel = [];
          currentChannel.push(network);
          currentChannel.push(station);
          location = $(this).attr("locationCode");
          currentChannel.push(location);
          currentChannel.push(channel);
          channelStartDate = $(this).attr("startDate");
          if(start == null) {
            currentChannel.push(channelStartDate);
          }
          else if(new Date(channelStartDate) > new Date(start)) {
            currentChannel.push(channelStartDate + "T00:00:00");
          }
          else {
            channelStartDate = start;
            currentChannel.push(start + "T00:00:00");
          }
          channelEndDate = $(this).attr("endDate");
          if(end == null) {
            currentChannel.push(channelEndDate);
          }
          else if(new Date(channelEndDate) < new Date(end)) {
            currentChannel.push(channelEndDate + "T00:00:00");
          }
          else {
            channelEndDate = end;
            currentChannel.push(end + "T00:00:00");
          }
          var currentRow = document.querySelector("#displayedStations tbody").insertRow(-1);
          var checkbox = document.createElement("INPUT");
          checkbox.setAttribute("type", "checkbox");
          checkbox.setAttribute("class", "queryBox");
          currentRow.insertCell(0).append(checkbox);
          currentRow.insertCell(1).innerHTML = network;
          currentRow.insertCell(2).innerHTML = station;
          currentRow.insertCell(3).innerHTML = location;
          currentRow.insertCell(4).innerHTML = channel;
          if(start == null) {
            currentRow.insertCell(5).innerHTML = channelStartDate;
          }
          else {
            currentRow.insertCell(5).innerHTML = channelStartDate + "T00:00:00";
          }
          if(end == null) {
            currentRow.insertCell(6).innerHTML = channelEndDate;
          }
          else {
            currentRow.insertCell(6).innerHTML = channelEndDate + "T00:00:00";
          }
          document.querySelector("#displayedStations tbody").appendChild(currentRow);
          queriedChannels.push(currentChannel);
        }

        channelEndDate = $(this).attr("endDate");
        if(channelEndDate > end) {
          channelEndDate = end;
        }
        console.log(station + " " + channel + " " + $(this).attr("startDate") + "-" + channelEndDate);
        prevChannel = channel;
      }); // End per-channel loop
    }); // End per-station loop
  }); // End per-network loop
  $("#numQueried").html(queriedChannels.length);
  //console.log(queriedChannels);
  map.fitBounds(markersLayer.getBounds());
}

/**
 * Select all queried seismic stations/correlation files
 */
function selectAll(className) {
  var inputs = document.getElementsByClassName(className);
   for(var i = 0; i < inputs.length; i++) {
     if(!inputs[i].checked) {
       inputs[i].checked = true;
     }
   }
}

/**
 * Deselect all queried seismic stations/correlation files
 */
function deselectAll(className) {
  var inputs = document.getElementsByClassName(className);
   for(var i = 0; i < inputs.length; i++) {
     if(inputs[i].checked) {
       inputs[i].checked = false;
     }
   }
}

/**
 * Save selected seismic stations
 */
function save() {
  var selectedIndices = $.map($("input[class=queryBox]:checked").closest("tr"), function(tr) { return $(tr).index(); });
  savedChannels = selectedIndices.map(i => queriedChannels[i]);
  $("#numSaved").html(savedChannels.length);
  savedChannels.unshift(["Network", "Station", "Location", "Channel", "StartDate", "EndDate"]);
  channelsText = savedChannels.map(e => e.join(",")).join("\n");
  //console.log(queriedChannels);
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
  $("#refresh").show();
  $("#processingMessage").show();
  refreshAuto();
}


/**
 * Download cross-correlation files after processing on EC2
 */
function downloadXcor() {
  var selectedIndices = $.map($("input[class=fileBox]:checked").closest("tr"), function(tr) { return $(tr).index(); });
  var savedFiles = selectedIndices.map(i => fileList[i]);
  for(i = 0; i < savedFiles.length; i++) {
    AWS.config.credentials.refresh(function(){
      s3.getObject({
          Key: fileList[i]
          },
          function(err, data) {
            if(err == null) {
              console.log(data);
              var blob = new Blob([data.Body], {type: "binary/octet-stream"});
              saveAs(blob, fileList[i]);
            }
          });
      });
  }
}

function sleep(time) {
   return new Promise(resolve => setTimeout(resolve, time));
}

async function refreshAuto() {
  while(!ready) {
    refreshFiles();
    await sleep(10000);
  }
}

function refreshFiles() {
  AWS.config.credentials.refresh(function(){
    s3.getObject({
        Key: "processed/" + id + "/files.txt"
        },
        function(err, data) {
          if(err == null) {
            if(!ready) {
              fileList = data.Body.toString().split("\n");
              for(i = numFiles; i < fileList.length; i++) {
                if(fileList[numFiles] === "done") {
                  console.log("Processing complete");
                  ready = true;
                  break;
                }
                if(fileList[numFiles].length > 0) {
                  var currentRow = document.querySelector("#displayedFiles tbody").insertRow(-1);
                  var checkbox = document.createElement("INPUT");
                  checkbox.setAttribute("type", "checkbox");
                  checkbox.setAttribute("class", "fileBox");
                  currentRow.insertCell(0).append(checkbox);
                  currentRow.insertCell(1).innerHTML = fileList[numFiles];
                  document.querySelector("#displayedFiles tbody").appendChild(currentRow);
                  numFiles++;
                }
              }
            }
          }
          else {
            console.log("Processed files are not ready yet");
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
    network = network.replace(/\s+/g, "").trim();
    url = url + "&network=" + network;
  }
  if(document.getElementById("station").value) { // Stations
    var station = document.getElementById("station").value;
    station = station.replace(/\s+/g, "").trim();
    url = url + "&station=" + station;
  }
  if(document.getElementById("location").value) { // Locations
    var location = document.getElementById("location").value;
    location = location.replace(/\s+/g, "").trim();
    url = url + "&location=" + location;
  }
  if(document.getElementById("channel").value) { // Channels
    var channel = document.getElementById("channel").value;
    channel = channel.replace(/\s+/g, "").trim();
    url = url + "&channel=" + channel;
  }
  if(document.getElementById("start-date").value) { // Start Date
    start = document.getElementById("start-date").value;
    url = url + "&starttime=" + start;
  }
  if(document.getElementById("end-date").value) { // End Date
    end = document.getElementById("end-date").value;
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
  selectAll("queryBox");
});

$(document).on("click", "#deselectAll", function(){
  deselectAll("queryBox");
});

$(document).on("click", "#selectAllFiles", function(){
  selectAll("fileBox");
});

$(document).on("click", "#deselectAllFiles", function(){
  deselectAll("fileBox");
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

$(document).on("click", "#refresh", function() {
  refreshFiles();
});

// XCor tab: If the "Save and Launch" button is clicked
$(document).on("click", "#launch", function(){
  launch();
});