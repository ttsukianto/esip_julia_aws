$(document).on("click", "#update", function(){
  var url = "http://service.iris.edu/fdsnws/station/1/query?";
  var requestedParams = 0;
  //var start = document.getElementById("start").value;
  //var end = document.getElementById("end").value;

  if(document.getElementById("network").value) {
    var network = document.getElementById("network").value;
    if(requestedParams != 0) {
      url = url + "&network=" + network;
    }
    else {
      url = url + "network=" + network;
    }
    requestedParams++;
  }
  if(document.getElementById("station").value) {
    var station = document.getElementById("station").value;
    if(requestedParams != 0) {
      url = url + "&station=" + station;
    }
    else {
      url = url + "station=" + station;
    }
    requestedParams++;
  }
  if(document.getElementById("location").value) {
    var location = document.getElementById("location").value;
    if(requestedParams != 0) {
      url = url + "&location=" + location;
    }
    else {
      url = url + "location=" + location;
    }
    requestedParams++;
  }
  if(document.getElementById("channel").value) {
    var channel = document.getElementById("channel").value;
    if(requestedParams != 0) {
      url = url + "&channel=" + channel;
    }
    else {
      url = url + "channel=" + channel;
    }
    requestedParams++;
  }
  console.log(url)
  $.get(url, function(data, status){
    alert("Data: " + data + "\nStatus: " + status);
  });
});
