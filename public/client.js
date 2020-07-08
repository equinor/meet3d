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
var shareButton = document.getElementById("shareButton");
var screenShare = document.getElementById("screenShare");
var notification = document.getElementById("notification");
var sceneDiv = document.getElementById("3D");
var videoElement = document.getElementById("remoteVideo")
var cameraButton = document.getElementById("cameraButton");

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
  video: false
};

// Our share screen constraints
const screenShareConstraints = {
  video: {
    cursor: "always"
  },
  audio: false
};

const cameraConstraints = {
  audio: false,
  video: true
};

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
    receiveFile(id, data); // If it is not a JSON then it is a file Blob
    return;
  }

  if (message.type == "pos") { // It is 3D positional data
    changeUserPosition(id, message.x, message.y, message.z); // Change position of user
  } else if (message.type == "file") { // It is a list of advertised files
    clearFileList(id); // Remove previous file options
    for (let i in message.files) {
      updateFileList(id, message.files[i]); // Add each advertised file to the drop-down menu
    }
  } else if (message.type == "request") { // It is a file request
    sendFile(id, message.option);
  } else if (message.type == "chat") { // It is a chat message
    addChat(connections[id].name, message.message, message.whisper);
  } else if (message.type == "share") { // Someone is sharing their screen
    if (message.sharing) { // If the person has started sharing
      shareButton.hidden = true; // Hide the share screen button
      shareUser = id; // Save the ID of the sharing user
    } else { // If they have stopped sharing
      shareUser = null;
      shareButton.hidden = false; // Unhide the share screen button
      screenShare.srcObject = null;
      addWalls(); // Re-add the 3D walls without the video texture
    }
    sharing = message.sharing; // This boolean stores whether or not someone is streaming
  }
}

// Adds the given message to the chat box, including the user that sent it and the received time
function addChat(name, message, whisper) {
  let today = new Date(); // Get the current time
  let hour = today.getHours();
  let minute = today.getMinutes();
  let second = today.getSeconds();

  // Make sure that there are always two digits to each time value
  if (hour < 10) hour = '0' + hour;
  if (minute < 10) minute = '0' + minute;
  if (second < 10) second = '0' + second;
  let time = hour + ":" + minute + ":" + second;

  if (whisper) { // If the message is just to us then let the user know
    message = '<whisper>' + message + '</whisper>';
    name = name + '->' + username.value;
  }

  let newMessage = document.createElement("li"); // Add a new chat element
  newMessage.innerHTML = '<time>' + time + '</time> | <chatName>' + name + '</chatName>: ' + message;
  chatReceive.appendChild(newMessage);
  if (chatReceive.children.length > maxChatLength) {
    chatReceive.removeChild(chatReceive.childNodes[0]); // Limits the number of messages
  }

  chatReceive.scrollTop = chatReceive.scrollHeight; // Maintains the scroll at the bottom

  // Notify how many unread messages there are when the user is in 3D mode
  if (sceneDiv.style.display != "none") {
    unreadMessages++;
    notification.innerHTML = "You have " + unreadMessages + " unread message(s)."
  }
}

// Emits a chat message to all other connected users
function sendChat() {

  if (chatSend.value == '') return; // If there is no text to send, do nothing

  let message = chatSend.value.trim(); // Remove excess white-space of either end of the text

  if (message.charAt(0) == '@') { // Check if someone is sending the message to someone specific
    let space = message.indexOf(' ');
    let target = message.slice(1, space); // This String contains the target user

    let messageWhisper = message.slice(space + 1, message.length); // This is the message to be sent

    let messageJSON = JSON.stringify({type: "chat", message: messageWhisper, whisper: true});

    for (let id in connections) {
      if (connections[id].name == target) { // If the user is the target
        connections[id].dataChannel.send(messageJSON);
        addChat(username.value + '->' + target, '<whisper>' + messageWhisper + '</whisper>');
        chatSend.value = ''; // Clear the text box
        return;
      }
    }
  }

  // If it is not a targeted message, then just send the text itself
  let messageJSON = JSON.stringify( { type: "chat", message: message, whisper: false } );

  for (let id in connections) {
    connections[id].dataChannel.send(messageJSON);
  }

  addChat(username.value, chatSend.value);
  chatSend.value = ''; // Clear the text box
}

// Advertise to the other users which files we can send them
function advertiseFile() {
  let files = document.getElementById("sendFile").files; // Get our selected files

  let fileDetailsList = [];

  for (let i in files) { // For each file
    if (files[i].name && files[i].size) { // If the file has a name and size
      fileDetailsList.push({ // Add the file to the list of advertised files
        fileName: files[i].name,
        size: files[i].size
      });
    }
  }

  let filesJSON = {
    type: "file",
    files: fileDetailsList // Add the list of files to a JSON
  };

  for (let id in connections) {
    connections[id].dataChannel.send(JSON.stringify(filesJSON)); // Send the JSON to all users
  }
}

// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
// This code formats the given number of bytes into a more presentable string which is accurate
// to 2 significant figures.
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Empties the list of advertised files for a user
function clearFileList(id) {
  if (document.getElementById(connections[id].name + 'Files')) {
    document.getElementById(connections[id].name + 'Files').outerHTML = ''; // Clears their list of files
  }
}

// Adds the given new file to the drop-down menu of advertised files for the relevant user
function updateFileList(id, message) {
  document.getElementById("remoteFiles").hidden = false;
  let file = document.getElementById(message.fileName + '-' + connections[id].name);
  if (!file) { // If the file does not already have an option
    file = document.createElement("option"); // Create an option to add to the drop-down menu of files
    file.id = message.fileName;
  }

  file.value = message.fileName;
  file.innerHTML = message.fileName + ' (' + formatBytes(message.size) + ')'; // The displayed option text

  let files = document.getElementById("files");
  let userFiles = document.getElementById(connections[id].name + 'Files');

  if (!userFiles) { // If the user does not have a list of files already
    userFiles = document.createElement("userFiles"); // Create an element for the user
    userFiles.id = connections[id].name + 'Files';

    let label = document.createElement("label"); // This label displays who owns the files
    label.for = connections[id].name;
    label.innerHTML = connections[id].name + ': ';
    userFiles.appendChild(label);

    let select = document.createElement("select"); // This drop-down menu contains the files to choose from
    userFiles.appendChild(select);

    let request = document.createElement("button"); // This button requests the selected file
    request.innerHTML = "Request File";
    request.onclick = function () {
      requestFile(id, select.value);
    }

    userFiles.appendChild(request);
    files.appendChild(userFiles);
    files.appendChild(document.createElement("br")); // Place the next user on the next line
  }

  userFiles.childNodes[1].appendChild(file);
}

// Requests the file given in the 'option'
function requestFile(id, option) {
  connections[id].dataChannel.send(JSON.stringify({
    type: "request",
    option: option // The name of the file
  }));

  document.getElementById("download").name = option;
}

// Transmits the file given in the 'option' to the user with ID 'id'
function sendFile(id, option) {
  let fileReader = new FileReader();
  let files = document.getElementById("sendFile").files; // Gets an array of our selected files
  for (let i in files) {
    if (files[i].name == option) { // Find the requested file

      fileReader.readAsArrayBuffer(files[i]); // Get the file as a byte array

      fileReader.onload = function (e) { // When the files is loaded into memory
        let binary = e.target.result;
        let blob = new File([binary], files[i]); // Make the byte array to a blob
        connections[id].dataChannel.send(blob); // Send the blob
      }
      return;
    }
  }
}

// Generates a URL for a received file which can be used to download it
function receiveFile(id, data) {

  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile); // Avoid memory leaks
  }

  textFile = window.URL.createObjectURL(data); // Make a URL which leads to the file

  // The file can be retrieved via a link
  document.getElementById("download").href = textFile;
  document.getElementById("download").hidden = false;
  document.getElementById("download").innerHTML = connections[id].name + ': ' + document.getElementById("download").name;

  received.style.display = "inline-block";
}

// Shares our screen with the other users, if noone is doing so already
async function shareCamera() {

  if (shareUser) return; // Someone else is sharing their screen

  let cameraCapture;

  try {
    cameraCapture = await navigator.mediaDevices.getUserMedia({audio: false, video: true});
  } catch(e) {
    if (e.name === "NotAllowedError") {
      alert('Unfortunately, access to the microphone is necessary in order to use the program. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
    } else if (e.name === "NotFoundError") {
      alert('No camera was detected.')
    } else {
      console.log(e);
      alert('Unable to access local media: ' + e.name);
    }
    return;
  }

  let cameraStream = document.createElement("video");
  let cameraStreamLi = document.createElement("li");
  cameraStreamLi.id = cameraCapture.id;
  cameraStream.autoplay = true;
  cameraStream.srcObject = cameraCapture;
  cameraStreamLi.appendChild(cameraStream);
  videoElement.children[0].appendChild(cameraStreamLi);
  videoElement.hidden = false;

  cameraButton.value = "Stop Sharing Camera";
  cameraButton.onclick = function () { stopShareCamera(cameraCapture.id) };

  for (let id in connections) {
    connections[id].senderCam = connections[id].connection.addTrack(cameraCapture.getVideoTracks()[0]); // Update our media stream
  }
}

function stopShareCamera(camID) {

  let cameraLi = document.getElementById(camID);

  if (!cameraLi) {
    return; // We are not sharing our camera anyways
  }

  let videoSrc = cameraLi.children[0].srcObject;

  for (let id in connections) {
    connections[id].connection.removeTrack(connections[id].senderCam); // Update our media stream
  }

  cameraButton.onclick = function () { shareCamera() };
  cameraButton.value = "Add video";

  let tracks = videoSrc.getTracks();

  tracks.forEach(track => track.stop()); // Stop all relevant media tracks
  cameraLi.children[0].srcObject = null;
  screenShare.hidden = true;

  cameraLi.innerHTML = '';

  videoElement.children[0].removeChild(cameraLi);
}

// Shares our screen with the other users, if noone is doing so already
async function shareScreen() {

  if (shareUser) return; // Someone else is sharing their screen

  try {
    screenCapture = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints);
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

  shareButton.value = "Stop Sharing Screen";
  shareButton.onclick = function () { stopShareScreen() };
  shareUser = ourID;
  screenShare.srcObject = screenCapture;
  screenShare.autoplay = true;
  sharing = true;
  addWalls(); // Add the stream to the 3D environment

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: true
  })

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON); // Notify everyone that we want to share our screen
  }

  setTimeout(function() { // Wait 1 second
    for (let id in connections) {
      connections[id].connection.addTrack(screenCapture.getVideoTracks()[0]); // Update our media stream
    }
  }, 1000);
}

// Stops us sharing our screen, including notifying others that we have done so
function stopShareScreen() {

  if (!screenShare.srcObject || shareUser !== ourID) {
    return; // We are not sharing our screen anyways
  }

  shareButton.onclick = function () { shareScreen() };
  shareButton.value = "Share Screen";

  let tracks = screenShare.srcObject.getTracks();

  tracks.forEach(track => track.stop()); // Stop all relevant media tracks
  screenShare.srcObject = null;
  screenShare.hidden = true;
  sharing = false;
  addWalls(); // Re-add the 3D walls without the video texture

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: false // Indicates that we are no longer sharing
  });

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON);
  }
}

// Function which tells other users our new 3D position
function changePos(x, y, z) {
  let jsonPos = JSON.stringify({type: "pos", x: x, y: y, z: z});
  for (let id in connections) { // Send it to everyone
    connections[id].dataChannel.send(jsonPos);
  }
}

// Open up the chat window to its initial state
function initChat() {
  openChat();

  files.style.display = "inline-block";

  users.style.display = "inline-block";
  startButton.hidden = true;
  leaveButton.hidden = false;
  connectionList.hidden = false;
  chatBox.style.display = "inline-block";
  received.style.display = "none";
  cameraButton.hidden = false;

  if ((sharing && shareUser == ourID) || !sharing) {
    shareButton.hidden = false;
  }

  sceneDiv.style.display = "none"; // Hide the 3D scene
}

// Open the chat and hide the 3D environment
function openChat() {
  document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);

  chatDiv.style.display = "inline-block";

  sceneDiv.style.display = "none"; // Hide the 3D environment

  unreadMessages = 0;
  notification.innerHTML = "";

  openButton.onclick = function() { open3D() };
  openButton.value = "Open 3D";
}

// Open the 3D environment and hide the chat
function open3D() {
  document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);

  chatDiv.style.display = "none"; // Hide the chat

  sceneDiv.style.display = "inline-block";

  openButton.onclick = function() { openChat() };
  openButton.value = "Open Chat";
}

// Make 'c'-keypress swap between chat and 3D-space
function initSwapView() {
  console.log("initiating swap view");
  document.addEventListener("keyup", swapViewOnC);

  chatSend.onfocus = function() { document.removeEventListener("keyup", swapViewOnC) };
  chatSend.onblur = function() { document.addEventListener("keyup", swapViewOnC) };
}

// Switches between the chat and the 3D environment
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
    window.URL.revokeObjectURL(textFile); // Avoid memory leaks
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
