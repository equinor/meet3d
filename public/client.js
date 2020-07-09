'use strict';

var remoteStreamList = [];

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
var shareButton = document.getElementById("shareButton");
var screenShare = document.getElementById("screenTest");
var notification = document.getElementById("notification");
var sceneDiv = document.getElementById("3D");

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
var textFile = null; // This stores any downloaded file
var sharing = false;
var shareUser = null;
var screenCapture = null; // The stream containing the video capture of our screen
var unreadMessages = 0;

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
  audio: true,
  video: true
};

// Our share screen constraints
const screenShareConstraints = {
  video: {
    cursor: "always"
  },
  audio: false
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
  } else if (message.type == "share") {
    if (message.sharing) {
      shareButton.hidden = true;
      if (!chatDiv.hidden) {
        screenShare.hidden = false;
      }
      shareUser = id;
    } else {
      shareUser = null;
      screenShare.hidden = true;
      shareButton.hidden = false;
    }
    sharing = message.sharing;
  }
}

// Adds the given message to the chat box, including the user that sent it and the received time
function addChat(name, message, whisper) {
  let today = new Date();
  let hour = today.getHours();
  let minute = today.getMinutes();
  let second = today.getSeconds();
  if (hour < 10) hour = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  if (second < 10) second = '0' + second;
  let time = hour + ":" + minute + ":" + second;

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

  if (sceneDiv.style.display != "none") {
    unreadMessages++;
    notification.innerHTML = "You have " + unreadMessages + " unread message(s)."
  }
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
    label.innerHTML = connections[id].name + ': ';
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
    files.appendChild(document.createElement("br"));
  }

  userFiles.childNodes[1].appendChild(file);
}

function requestFile(id, option) {
  connections[id].dataChannel.send(JSON.stringify({
    type: "request",
    option: option
  }));

  document.getElementById("download").name = option;
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

async function shareScreen() {

  if (shareUser) {
    return; // Someone else is sharing their screen
  }

  try {
    screenCapture = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints);
    shareButton.onclick = function () {
      stopShareScreen();
    };
    shareButton.value = "Stop Sharing Screen";
  } catch(e) {
    if (e.name === "NotAllowedError") {
      alert('Unfortunately, access to the microphone is necessary in order to use the program. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
    } else {
      console.log(e);
      alert('Unable to access local media: ' + e.name);
    }
    return;
  }

  if (!chatDiv.hidden) {
    screenShare.hidden = false;
  }

  shareUser = ourID;

  screenShare.srcObject = screenCapture;

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: true
  })

  sharing = true;

  if (!document.getElementById(screenCapture.id)){
    let remoteStream = document.createElement("video");
    remoteStream.id = screenCapture.id;
    remoteStreamList.push(remoteStream.id);
    remoteStream.autoplay = true;
    remoteStream.srcObject = screenCapture;
    document.getElementById("video").appendChild(remoteStream);
    addWalls();
  }

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON);
  }

  setTimeout(function() { // Wait 1 second
    for (let id in connections) {
      connections[id].connection.addTrack(screenCapture.getVideoTracks()[0]);
    }
  }, 1000);
}

function stopShareScreen() {

  shareButton.onclick = function () { shareScreen() };
  shareButton.value = "Share Screen";

  let tracks = screenShare.srcObject.getTracks();

  tracks.forEach(track => track.stop());
  screenShare.srcObject = null;
  screenShare.hidden = true;

  sharing = false;

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: false // Indicates that we are no longer sharing
  })

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON);
  }
}

// Function which tells other users our new 3D position
function changePos(x, y, z) {
  let jsonPos = JSON.stringify({type: "pos", x: x, y: y, z: z});
  for (let id in connections) {
    connections[id].dataChannel.send(jsonPos);
  }
}

function initChat() {
  openChat();

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

  if ((sharing && shareUser == ourID) || !sharing) {
    shareButton.hidden = false;
  }

  if (sharing) {
    screenShare.hidden = false;
  }

  sceneDiv.style.display = "none";
}

function openChat() {
  document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);

  chatDiv.style.display = "inline-block";

  sceneDiv.style.display = "none";

  unreadMessages = 0;
  notification.innerHTML = "";

  openButton.onclick = function() { open3D() };
  openButton.value = "Open 3D";
}

function open3D() {
  document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);

  chatDiv.style.display = "none";

  sceneDiv.style.display = "inline-block";

  openButton.onclick = function() { openChat() };
  openButton.value = "Open Chat";
}

// Make 'c'-keypress swap between chat and 3D-space
function initSwapView() {
  document.addEventListener("keyup", swapViewOnC);

  chatSend.onfocus = function() { document.removeEventListener("keyup", swapViewOnC) };
  chatSend.onblur = function() { document.addEventListener("keyup", swapViewOnC) };
}

function swapViewOnC(event) {
  if (event.key == 'c') {
    if (openButton.value == "Open 3D") {
      open3D();
    } else if (openButton.value == "Open Chat") {
      openChat();
    } else {
      console.log("Could not swap view: openButton.value = " + openButton.value);
    }
  }
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
  shareButton.hidden = true;
  received.style.display = "none";
  chatBox.hidden = true;
  chatBox.style.display = "none";
  localStream = null;
  users.hidden = true;
  users.style.display = "none";
  connectionList.innerHTML = '';
  openButton.hidden = true;
  for (let id in connections) {
    connections[id].connection.close();
    connections[id].dataChannel.close();
  }
  connections = {};

  stopShareScreen();

  leave3D(); // Closes the 3D environment

  stop();

  if (room) {
    socket.emit('left');
    room = null;
  }
}
