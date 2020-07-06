'use strict';

var roomName = document.getElementById("roomName");
var leaveRoom = document.getElementById("leaveButton");
var startButton = document.getElementById("start");
var connectionList = document.getElementById("connectionList");
var users = document.getElementById("users");
var username = document.getElementById("username");
var chatReceive = document.getElementById("chatReceive");
var chatBox = document.getElementById("chatBox");
var chatSend = document.getElementById("chatSend");
var chatDiv = document.getElementById("chatSection");
var openButton = document.getElementById("open");
var files = document.getElementById("files");
var received = document.getElementById("received");

username.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init();
    }
  });

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init();
    }
  });

chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      sendChat();
    }
  });

var localStream; // This is our local audio stream
var room; // This is the name of our conference room
var socket; // This is the SocketIO connection to the signalling server
var ourID; // This is our unique ID
var connections = {}; // The key is the socket id, and the value is {name: username, stream: mediastream, connection: PeerConnection}
const maxChatLength = 20; // The chat will only hold this many messages at a time
var textFile = null // This stores any downloaded file

const pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

// Our local media constraints
const constraints = {
  audio: true
};

// Our share screen constraints
const screenShareConstraints = {
  video: {
    cursor: "always"
  },
  audio: false
}

function init() {

  if (username.value === '') {
    alert('Please enter a username');
    return;
  }

  if (roomName.value === '') {
    alert('Please enter a room name');
    return;
  }

  room = roomName.value;
  username.readOnly = true;
  roomName.readOnly = true;
  openChat();
  socket = io('ws://localhost:3000'); // We will change this to a server in the future

  // We created and joined a room
  socket.on('created', function(connectionInfo) {
    console.log('Created room ' + connectionInfo.room);
    ourID = connectionInfo.id;

    init3D(); // Renders the 3D environment
  });

  // The room we tried to join is full
  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
    alert('Room ' + room + ' is full');
  });

  // A new user joined the room
  socket.on('join', function (startInfo) {
    if (startInfo.id === ourID) return;

    connections[startInfo.id] = {};
    connections[startInfo.id].name = startInfo.name;

    console.log('User ', startInfo.name, ' joined room ', room);

    sendOffer(startInfo.id); // Send the user your local description in order to create a connection
    newUserJoined(startInfo.id, startInfo.name); // Add the new user to the 3D environment
  });

  // We joined a conference
  socket.on('joined', function(connectionInfo) {
    console.log('We joined: ' + connectionInfo.room);
    ourID = connectionInfo.id;

    init3D(); // Renders the 3D environment
  });

  // A user moved in the 3D space
  socket.on('pos', function(data) {
    if (data.id === ourID) return; // If we moved: do nothing
    changeUserPosition(data.id, data.x, data.y, data.z); // Change position of user
  });

  // A user left the conference
  socket.on('left', function(id) {
    console.log("User " + connections[id].name + " left");
    removeConnectionHTMLList(id);
    userLeft(id) // Removes the user from the 3D environment
    if (connections[id].connection) connections[id].connection.close();
    if (connections[id].dataChannel) connections[id].dataChannel.close();
    delete connections[id];
  });

  // We have received a PeerConnection offer
  socket.on('offer', function(message) {
    let id = message.id;
    let name = message.name;
    let offerDescription = message.offer;

    if (id === ourID) return;

    connections[id] = {};
    connections[id].name = name;

    sendAnswer(id, offerDescription);
    appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
    newUserJoined(id, name); // Add new user to 3D environment
  });

  // We have received an answer to our PeerConnection offer
  socket.on('answer', function(message) {
    let id = message.id;
    let answerDescription = message.answer;

    if (id === ourID) return;

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));
    appendConnectionHTMLList(id);
  });

  // We have received an ICE candidate from a user we are connecting to
  socket.on('candidate', function(message) {

    let id = message.id;
    let answerDescription = message.candidateData;
    if (id === ourID) return;

    var candidate = new RTCIceCandidate({
      sdpMLineIndex: answerDescription.label,
      candidate: answerDescription.candidate
    });
    connections[id].connection.addIceCandidate(candidate);
  });

  // Gets the audio stream from our microphone
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).then(gotLocalStream).catch(function(e) {
    if (e.name === "NotAllowedError") {
      alert('Unfortunately, access to the microphone is necessary in order to use the program. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
      leave();
    } else {
      console.log(e);
      alert('Unable to access local media: ' + e.name);
      leave();
    }
  });

  if (location.hostname !== 'localhost') { // If we are not hosting locally
    requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
  }
}

// Sends an offer to a new user with our local PeerConnection description
function sendOffer(id) {
  console.log('>>>>>> Creating peer connection to user ' + connections[id].name);
  connections[id].connection = createPeerConnection(id);

  createDataChannel(id);

  connections[id].connection.addStream(localStream);
  connections[id].connection.createOffer().then(function(description) {
    connections[id].connection.setLocalDescription(description);
    socket.emit('offer', {
      id: id,
      name: username.value,
      offer: description
    });

  }, function (e) {
    console.log("Failed to create offer: " + e);
    return;
  });
}

// Sends a reply to an offer with our local PeerConnection description
function sendAnswer(id, offerDescription) {
  if (connections[id].signalingState == "stable") return;

  console.log('>>>>>> Creating RTCPeerConnection to user ' + connections[id].name);
  connections[id].connection = createPeerConnection(id);
  connections[id].connection.addStream(localStream);

  console.log('>>>>>> Sending answer to connection to user ' + connections[id].name);

  connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription));
  connections[id].connection.createAnswer().then(function(description) {
    connections[id].connection.setLocalDescription(description);
    socket.emit('answer', {
      id: id,
      answer: description
    });
  }, function (e) {
    console.log("Failed to create answer: " + e);
    return;
  });
}

// Function which tells other users our new 3D position
function changePos(x, y, z) {
  let jsonPos = JSON.stringify({x: x, y: y, z: z});
  for (let id in connections) {
    connections[id].dataChannel.send(jsonPos);
  }
}

// Called when we have got a local media stream
function gotLocalStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;

  if (room !== '') { // Check that the room does not already exist
    let startInfo = {
      room: room, // The room we want to join
      name: username.value // Our username
    };
    socket.emit('join', startInfo);
    console.log('Attempting to join ', room);
  }
}

function createPeerConnection(id) {
  let pc;

  try {
    if (connections[id] == undefined) {
      connections[id] = {};
    }

    pc = new RTCPeerConnection(null);
    pc.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('candidate', {
          id: id,
          info: {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
          }
        });
      } else {
        console.log('End of candidates.');
      }
    };
    pc.ontrack = function (event) {
      console.log('Remote stream added.');
      connections[id].audio = event.streams[0]; // TODO: verify that this will always be zero
      userGotMedia(id, event.streams[0]); // Adds track to 3D environment
    };
    pc.onremovestream = function (event) {
      // Here we might need to update something in 3D.js, but I'm not sure
      console.log("Lost a stream from " + connections[id].name);
    };
    pc.ondatachannel = function (event) {
      event.channel.addEventListener("open", () => {
        connections[id].dataChannel = event.channel;
        console.log("Datachannel established to " + connections[id].name);
      });

      event.channel.addEventListener("close", () => {
        console.log("A DataChannel closed");
      });

      event.channel.addEventListener("message", (message) => {
        dataChannelReceive(id, message.data); // Called when we receive a DataChannel message
      });
    };

    console.log('>>>>>> Created RTCPeerConnection');

  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection.');
    return;
  }
  return pc;
}

// Creates a new data channel to the user with the given id
function createDataChannel(id) {
  var tempConnection = connections[id].connection.createDataChannel("Chat");
  tempConnection.addEventListener("open", () => {
    connections[id].dataChannel = tempConnection
    console.log("Datachannel established to " + connections[id].name);
    changePos(findUser(myID).getxPosition(), findUser(myID).getyPosition(), findUser(myID).getzPosition());
  });

  tempConnection.addEventListener("close", () => {
    console.log("A DataChannel closed");
  });

  tempConnection.addEventListener("message", (event) => {
    dataChannelReceive(id, event.data); // Called when we receive a DataChannel message
  });
}

// Transmit local ICE candidates
function handleIceCandidate(event) {
  if (event.candidate) {

    socket.emit('candidate', {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

// Tries to find a TURN server
function requestTurn(turnURL) {
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      return;
    }
  }

  console.log('Getting TURN server from ', turnURL);
  // No TURN server. Get one from computeengineondemand.appspot.com:
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) { // If there are no errors returned fromt the HTTP request
      var turnServer = JSON.parse(xhr.responseText); // Make the received String into JSON
      console.log('Got TURN server: ', turnServer);
      pcConfig.iceServers.push({ // Add new TURN server to our config
        'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
                'credential': turnServer.password
      });
    }
  };
  xhr.open('GET', turnURL, true);
  xhr.send();
}

// Adds a username to the list of connections on the HTML page
function appendConnectionHTMLList(id) {
  let item = document.createElement("li");
  item.id = id;
  item.innerHTML = connections[id].name;
  connectionList.appendChild(item);
}

// Removes a user from the list of connections on the HTML page
function removeConnectionHTMLList(id) {
  let children = connectionList.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].id == id) {
      connectionList.removeChild(children[i]);
      return;
    }
  }
}

// Handles receiving a message on a DataChannel
function dataChannelReceive(id, data) {

  console.log(data);
  if (id === ourID) return;

  let message;
  try {
    message = JSON.parse(data);
  } catch (e) {
    receiveFile(id, data);
    return;
  }

  if (message.type == "pos") {
    changeUserPosition(id, message.x, message.y, message.z); // Change position of user
  } else if (message.type == "file") {
    clearFileList(id); // Remove previous file options
    for (let i in message.files) {
      updateFileList(id, message.files[i]);
    }
  } else if (message.type == "request") {
    sendFile(id, message.option);
  } else if (message.type == "chat") {
    addChat(connections[id].name, message.message, message.whisper);
  }
}

// Adds the given message to the chat box, including the user that sent it and the received time
function addChat(name, message, whisper) {
  var today = new Date();
  let hour = today.getHours();
  let minute = today.getMinutes();
  let second = today.getSeconds();
  if (hour < 10) hour = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  if (second < 10) second = '0' + second;
  var time = hour + ":" + minute + ":" + second;

  if (whisper) {
    message = '<whisper>' + message + '</whisper>';
    name = name + '->' + username.value;
  }

  let newMessage = document.createElement("li");
  newMessage.innerHTML = '<time>' + time + '</time> | <chatName>' + name + '</chatName>: ' + message;
  chatReceive.appendChild(newMessage);
  if (chatReceive.children.length > maxChatLength) {
    chatReceive.removeChild(chatReceive.childNodes[0]); // Limits the number of messages
  }

  chatReceive.scrollTop = chatReceive.scrollHeight; // Maintains the scroll at the bottom
}

// Emits a chat message to all other connected users
function sendChat() {

  if (chatSend.value == '') return;

  let message = chatSend.value.trim();

  if (message.charAt(0) == '@') {
    let space = message.indexOf(' ');
    let target = message.slice(1, space);

    let messageWhisper = message.slice(space + 1, message.length);

    let messageJSON = JSON.stringify({type: "chat", message: messageWhisper, whisper: true});

    for (let id in connections) {
      if (connections[id].name == target) {
        connections[id].dataChannel.send(messageJSON);
        addChat(username.value + '->' + target, '<whisper>' + messageWhisper + '</whisper>');
        chatSend.value = ''; // Clear the text box
        return
      }
    }
  }

  let messageJSON = JSON.stringify({type: "chat", message: message, whisper: false});

  for (let id in connections) {
    connections[id].dataChannel.send(messageJSON);
  }

  addChat(username.value, chatSend.value);
  chatSend.value = ''; // Clear the text box
}

function advertiseFile() {
  let files = document.getElementById("sendFile").files;

  let fileDetailsList = [];

  for (let i in files) {
    if (files[i].name && files[i].size) {
      fileDetailsList.push({
        fileName: files[i].name,
        size: files[i].size
      });
    }
  }

  let filesJSON = {
    type: "file",
    files: fileDetailsList
  };

  for (let id in connections) {
    connections[id].dataChannel.send(JSON.stringify(filesJSON));
  }
}

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function clearFileList(id) {
  if (document.getElementById(connections[id].name + 'Files')) {
    document.getElementById(connections[id].name + 'Files').outerHTML = ''; // Clears their list of files
  }
}

function updateFileList(id, message) {
  document.getElementById("remoteFiles").hidden = false;
  let file = document.getElementById(message.fileName + '-' + connections[id].name);
  if (!file) {
    file = document.createElement("option");
    file.id = message.fileName;
  }

  file.value = message.fileName;
  file.innerHTML = message.fileName + ' (' + formatBytes(message.size) + ')';

  let files = document.getElementById("files");
  let userFiles = document.getElementById(connections[id].name + 'Files');

  if (!userFiles) {
    userFiles = document.createElement("userFiles");
    userFiles.id = connections[id].name + 'Files';

    let label = document.createElement("label");
    label.for = connections[id].name;
    label.innerHTML = connections[id].name;
    userFiles.appendChild(label);

    let select = document.createElement("select");
    userFiles.appendChild(select);

    let request = document.createElement("button");
    request.innerHTML = "Request File";
    request.onclick = function () {
      requestFile(id, select.value);
    }

    userFiles.appendChild(request);
    files.appendChild(userFiles);
  }

  userFiles.childNodes[1].appendChild(file);
}

async function shareScreen(e) {

  // TODO: We should only allow this if someone else is not sharing their screen!

  let vid = document.getElementById("screenTest");

  try {
    vid.srcObject = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints);
    e.onclick = function () {
      stopShareScreen(e);
    };
    e.value = "Stop Sharing Screen";
  } catch(err) {
    console.error("Error: " + err);
  }
}

function requestFile(id, option) {
  connections[id].dataChannel.send(JSON.stringify({
    type: "request",
    option: option
  }));

  document.getElementById("download").name = option;
}

function stopShareScreen(e) {

  e.onclick = function () {
    shareScreen(e);
  };
  e.value = "Share Screen";

  let tracks = document.getElementById("screenTest").srcObject.getTracks();

  tracks.forEach(track => track.stop());
  document.getElementById("screenTest").srcObject = null;
}

function sendFile(id, option) {
  let fileReader = new FileReader();
  let files = document.getElementById("sendFile").files;
  for (let i in files) {
    if (files[i].name == option) {

      fileReader.readAsArrayBuffer(files[i]);

      fileReader.onload = function (e) {
        let binary = e.target.result;
        let blob = new File([binary], files[i]);
        connections[id].dataChannel.send(blob);
      }
      return;
    }
  }
}

function receiveFile(id, data) {

  // If we are replacing a previously generated file we need to
  // manually revoke the object URL to avoid memory leaks.
  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile);
  }

  textFile = window.URL.createObjectURL(data);

  // The file can be retrieved via a link
  document.getElementById("download").href = textFile;
  document.getElementById("download").hidden = false;
  document.getElementById("download").innerHTML = connections[id].name + ': ' + document.getElementById("download").name

  received.style.display = "inline-block";
}

function open3D() {
  document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);

  chatDiv.hidden = true;
  chatDiv.style.display = "none";
  files.hidden = true;
  files.style.display = "none";
  received.style.display = "none";

  let sceneDiv = document.getElementById("scene");
  if (sceneDiv) {
    sceneDiv.hidden = false;
    sceneDiv.style.display = "inline-block";
  }

  openButton.onclick = function() { openChat() };
  openButton.value = "Open Chat";
}

function openChat() {
  document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);

  chatDiv.hidden = false;
  chatDiv.style.display = "inline-block";

  files.hidden = false;
  files.style.display = "inline-block";

  users.hidden = false;
  users.style.display = "inline-block";
  startButton.hidden = true;
  leaveButton.hidden = false;
  connectionList.hidden = false;
  chatBox.hidden = false;
  chatBox.style.display = "inline-block";
  received.style.display = "inline-block";

  let sceneDiv = document.getElementById("scene");
  if (sceneDiv) {
    sceneDiv.hidden = true;
    sceneDiv.style.display = "none";
  }

  openButton.onclick = function() {open3D()};
  openButton.value = "Open 3D";
}

// Leaves the conference, resets variable values and closes connections
function leave() {

  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile);
  }

  files.hidden = true;
  files.style.display = "none";
  roomName.readOnly = false;
  username.readOnly = false;
  startButton.hidden = false;
  leaveButton.hidden = true;
  chatBox.hidden = true;
  chatBox.style.display = "none";
  localStream = null;
  users.hidden = true;
  users.style.display = "none";
  connectionList.innerHTML = '';
  document.getElementById("open").hidden = true;
  for (let id in connections) {
    connections[id].connection.close();
    connections[id].dataChannel.close();
  }
  connections = {};

  leave3D(); // Closes the 3D environment

  stop();

  if (room) {
    socket.emit('left');
    room = null;
  }
}
