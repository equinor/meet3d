'use strict';

var roomName = document.getElementById("roomName");
var startButton = document.getElementById("start/leave");
var connectionList = document.getElementById("connectionList");
var users = document.getElementById("users");
var username = document.getElementById("username");
var chatReceive = document.getElementById("chatReceive");
var chatBox = document.getElementById("chatBox");
var chatSend = document.getElementById("chatSend");
var chatDiv = document.getElementById("chatSection");
var changeModeButton = document.getElementById("changeMode");
var files = document.getElementById("files");
var receivedFiles = document.getElementById("receivedFiles");
var screenShare = document.getElementById("screenShare");
var notification = document.getElementById("notification");
var sceneDiv = document.getElementById("3D");
var videoElement = document.getElementById("remoteVideo");
var buttons = document.getElementById("buttons");
var shareButton = document.getElementById("shareButton");

username.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init(document.getElementById("start/leave")); // Join the conference by pressing enter in the username input box
    }
  });

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init(document.getElementById("start/leave")); // Join the conference by pressing enter in the room name input box
    }
  });

chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      sendChat(); // Send chat message by pressing enter in the chat
    }
  });

// These two variables are present in both client.js and connect.js
var ourID; // This is our unique ID
var connections = {}; // The key is the socket id, and the value is {name: username, stream: mediastream, connection: PeerConnection}

var localStream = null; // This is our local media stream
var textFile = null; // This stores any downloaded file
var sharing = false; // Is someone sharing their screen
var shareUser = null; // Which user is sharing their screen
var screenCapture = null; // The stream containing the video capture of our screen
var unreadMessages = 0; // The number of messages we have received whilst not in 'chat mode'
const maxChatLength = 20; // The chat will only hold this many messages at a time

// Our local audio constraints
const audioConstraints = {
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

// Our local camera video constraints
const cameraConstraints = {
  audio: false,
  video: {
    width: 250,
    height: 200,
    resizeMode: "crop-and-scale"
  }
};

/**
 * Initialises the conference by first getting an audio stream from the user
 * and then using that stream to connect to the other users in the given room.
 */
async function init(button) {
  if (username.value === '') { // No username given
    alert('Please enter a username');
    return;
  }

  if (roomName.value === '') { // No room name given
    alert('Please enter a room name');
    return;
  }

  let audio = await shareAudio(null); // We need audio to start
  if (!audio) {
    return;
  }

  button.value = "Leave";
  button.onclick = function() { leave(button) };
  username.readOnly = true; // Do not allow the user to edit their name, but show it
  roomName.readOnly = true; // Do not allow the user to edit the room name, but show it

  initChat(); // Show the chat
  initSignaling(roomName.value, username.value); // Connect to the conference room
}

/**
 * Requests media from the user with the given constraints. Returns the returned
 * track if there was only one medium, or a stream if several were requested.
 */
async function getLocalTrack(constraint) {
  try {
    let stream = await navigator.mediaDevices.getUserMedia(constraint); // Requests the webcamera stream

    if (constraint.video && !constraint.audio) {
      return stream.getVideoTracks()[0];
    } else if (!constraint.video && constraint.audio) {
      return stream.getAudioTracks()[0];
    } else {
      return stream;
    }
  } catch(e) {
    if (e.name === "NotAllowedError") {
      alert('Unfortunately, access to your device is necessary in order to use this feature. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
    } else if (e.name === "NotFoundError") {
      alert('No relevant device was detected.')
    } else {
      console.log(e);
      alert('Unable to access local media: ' + e.name);
    }
    return null;
  }
}

/**
 * Requests media from the user with the given constraints and adds the result
 * to the PeerConnections.
 */
async function addLocalTrack(constraint) {
  let media = await getLocalTrack(constraint);

  if (!media) return null;

  if (!localStream) {
    localStream = new MediaStream([media]);
  } else {
    localStream.addTrack(media);
  }

  let trackID = null;
  for (let id in connections) {
    if (media.kind == "video") {
      connections[id].video = connections[id].connection.addTrack(media, localStream); // Update our media stream
    } else {
      connections[id].audio = connections[id].connection.addTrack(media, localStream); // Update our media stream
    }
  }
  return media;
}

/**
 * Adds all local streams to the PeerConnection to the user with the given ID.
 */
function addLocalTracksToConnection(id) {
  if (localStream.getTracks().length == 0) {
    connections[id].connection.addTrack(null, localStream);
    return;
  }
  for (let i in localStream.getTracks()) {
    let track = localStream.getTracks()[i];
    if (track.kind == "video") {
      connections[id].video = connections[id].connection.addTrack(track, localStream);
    } else if (track.kind == "audio") {
      connections[id].audio = connections[id].connection.addTrack(track, localStream);
    }
  }
}

/**
 * Requests an audio track from the user and then adds it to the local stream.
 */
async function shareAudio(button) {
  let audioTrack = await addLocalTrack(audioConstraints);

  if (!audioTrack) return false;
  return true;
}

/**
 * Shares our camera stream with the other users.
 */
async function shareCamera(button) {
  let cameraCapture = await addLocalTrack(cameraConstraints);

  if (!cameraCapture) return;

  addVideoStream(ourID, cameraCapture); // Adds the video to the side of the screen

  button.value = "Stop Sharing Camera";
  button.onclick = function () { stopShareCamera(button) };
}

/**
 * This function stops us from sharing our webcamera video with other users,
 * and ourselves.
 */
function stopShareCamera(button) {

  let cameraLi = document.getElementById("ourVideo");
  if (!cameraLi) {
    return; // We are not sharing our camera anyways
  }

  for (let id in connections) {
    connections[id].connection.removeTrack(connections[id].video); // Update our media stream for the other users
  }

  button.onclick = function () { shareCamera(button) };
  button.value = "Add video";

  localStream.getVideoTracks()[0].stop();
  localStream.removeTrack(localStream.getVideoTracks()[0]);

  let videoSrc = cameraLi.children[0].srcObject; // Get the stream
  let tracks = videoSrc.getTracks();
  tracks.forEach(track => track.stop()); // Stop the webcamera video track
  cameraLi.children[0].srcObject = null;
  cameraLi.innerHTML = ''; // Delete the video element

  videoElement.children[0].removeChild(cameraLi);
  if (videoElement.children[0].children.length == 0) {
    // There are no videos to show, so resize the 3D scene
    renderer.setSize(window.innerWidth, window.innerHeight - 30);
  }
}

/**
 * Shares our screen with the other users, if noone is doing so already.
 */
async function shareScreen(button) {

  if (shareUser) return; // Someone else is sharing their screen

  try {
    screenCapture = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints); // Ask for the screen capture
  } catch(e) {
    if (e.name === "NotAllowedError") { // We were not given permission to use the screen capture
      alert('Unfortunately, access to the microphone is necessary in order to use the program. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
    } else {
      console.log(e);
      alert('Unable to access local media: ' + e.name);
    }
    return;
  }

  console.log(button)

  button.value = "Stop Sharing Screen";
  button.onclick = function () { stopShareScreen(button) };

  shareUser = ourID; // We are the one sharing our screen
  screenShare.srcObject = screenCapture;
  sharing = true;
  addWalls(); // Add the stream to the 3D environment

  addScreenCapture(null);
}

/**
 * Adds our screen capture stream to the PeerConnection with the user with ID
 * 'id', or to all connections if 'id' is null.
 */
function addScreenCapture(id) {
  if (sharing && shareUser == ourID) {

    let shareJSON = JSON.stringify({
      type: "share",
      sharing: true
    });

    if (id) {
      connections[id].dataChannel.send(shareJSON); // Notify everyone that we want to share our screen
      setTimeout(function() { // Wait 1 second to allow people to process the previous message
        connections[id].connection.addTrack(screenCapture.getVideoTracks()[0]); // Update our media stream
      }, 1000);

    } else {
      for (let i in connections) {
        connections[i].dataChannel.send(shareJSON); // Notify everyone that we want to share our screen
      }
      setTimeout(function() { // Wait 1 second to allow people to process the previous message
        for (let i in connections) {
          connections[i].connection.addTrack(screenCapture.getVideoTracks()[0]); // Update our media stream
        }
      }, 1000);
    }
  }
}

/**
 * Stops us sharing our screen, including notifying others that we have done so
 */
function stopShareScreen(button) {

  if (!screenShare.srcObject || shareUser !== ourID) {
    return; // We are not sharing our screen, so we do not need to close anything
  }

  button.onclick = function () { shareScreen(button) }; // Reset the share screen button
  button.value = "Share Screen";

  let tracks = screenShare.srcObject.getTracks();

  tracks.forEach(track => track.stop()); // Stop the video track
  screenShare.srcObject = null;
  screenShare.hidden = true;
  sharing = false; // This indicates that noone is sharing their screen
  shareUser = null;
  addWalls(); // Re-add the 3D walls without the video texture

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: false // Indicates that we are no longer sharing
  });

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON); // Let all users know that we are no longer sharing our screen
  }
}

/**
 * Adds a username to the list of connections on the HTML page.
 */
function appendConnectionHTMLList(id) {
  let item = document.createElement("li");
  item.id = id;
  item.innerHTML = connections[id].name;
  connectionList.appendChild(item);
}

/**
 * Removes a user from the list of connections on the HTML page.
 */
function removeConnectionHTMLList(id) {
  let children = connectionList.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].id == id) {
      connectionList.removeChild(children[i]);
      return;
    }
  }
}

/**
 * Handles receiving a message on a DataChannel. The type of the JSON message
 * determines what function to call with it. If it is not a JSON then it is a
 * file which results in 'receiveFile' being called.
 */
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

/**
 * Adds the given message to the chat box, including the user that sent it and
 * the received time.
 */
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

/**
 * Emits a chat message to all other connected users.
 */
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

/**
 * Advertise to the other users which files we can send them.
 */
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

/**
 * This code was made by Alice Jim on StackOverflow: https://stackoverflow.com/a/18650828
 * It formats the given number of bytes into a more presentable string which is accurate
 * to 'decimals' significant figures, which is by default 2.
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Empties the list of advertised files for a user.
 */
function clearFileList(id) {
  if (document.getElementById(connections[id].name + 'Files')) {
    document.getElementById(connections[id].name + 'Files').outerHTML = ''; // Clears their list of files
  }
}

/**
 * Adds the given new file to the drop-down menu of advertised files for the
 * relevant user.
 */
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
    userFiles.appendChild(document.createElement("br")); // Place the next user on the next line
    files.appendChild(userFiles);
  }

  userFiles.childNodes[1].appendChild(file);
}

/**
 * Requests the file given in the 'option'.
 */
function requestFile(id, option) {
  connections[id].dataChannel.send(JSON.stringify({
    type: "request",
    option: option // The name of the file
  }));

  document.getElementById("download").name = option;
}

/**
 * Transmits the file given in the 'option' to the user with ID 'id'.
 */
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

/**
 * Generates a URL for a received file which can be used to download it.
 */
function receiveFile(id, data) {

  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile); // Avoid memory leaks
  }

  textFile = window.URL.createObjectURL(data); // Make a URL which leads to the file

  // The file can be retrieved via a link
  document.getElementById("download").href = textFile;
  document.getElementById("download").hidden = false;
  document.getElementById("download").innerHTML = connections[id].name + ': ' + document.getElementById("download").name;

  receivedFiles.style.display = "inline-block";
}

/**
 * Adds a new video to the videos displayed on the right side of the screen.
 */
function addVideoStream(id, track) {

  let stream;
  if (id !== ourID) {
    stream = new MediaStream([track]);
    connections[id].stream = stream; // Update the 'stream' attribute for the connection
  } else {
    stream = localStream;
  }

  let streamElement = document.createElement("video"); // Create an element to place the stream in
  let streamElementLi = document.createElement("li"); // Create a list entry to store it in

  if (id !== ourID) {
    streamElementLi.hidden = true;
    streamElement.autoplay = false;
    streamElementLi.id = stream.id; // The ID of the list entry is the ID of the stream
  } else {
    streamElement.autoplay = true;
    streamElementLi.id = "ourVideo";
  }

  streamElement.width = cameraConstraints.video.width;
  streamElement.height = cameraConstraints.video.height;
  streamElement.srcObject = stream;
  streamElementLi.appendChild(streamElement);
  videoElement.hidden = false;

  if (id == ourID && videoElement.children[0].children.length > 0) {
    videoElement.children[0].insertBefore(streamElementLi, videoElement.children[0].firstChild); // Display our video at the top
  } else {
    videoElement.children[0].appendChild(streamElementLi);
  }

  renderer.setSize(window.innerWidth - cameraConstraints.video.width, window.innerHeight - 30); // Make space for the videos on the screen
  updateVideoList(id); // Update the list of what videos to show, in 3D.js
}

/**
 * Removes the video stream belonging to the user with ID 'id' from the HTML.
 */
function removeVideoStream(id) {
  let cameraLi = document.getElementById(connections[id].stream.id);
  cameraLi.children[0].srcObject = null;
  screenShare.hidden = true;
  cameraLi.innerHTML = '';
  videoElement.children[0].removeChild(cameraLi);

  connections[id].stream = null;

  if (videoElement.children[0].children.length == 0)
    renderer.setSize(window.innerWidth, window.innerHeight - 30);

  updateVideoList(id);
}

/**
 * This function updates which videos are visible on the screen. The list of
 * videos to display is 'videoList' in 3D.js.
 */
function updateVideoVisibility() {
  let vidList = getVideoList();
	for (let i = 0; i < vidList.length; i++) {
    let id = vidList[i];
    if (id == 0) continue;

    document.getElementById(connections[id].stream.id).hidden = false;
    document.getElementById(connections[id].stream.id).children[0].autoplay = true;
  }
}

/**
 * Function which tells other users our new 3D position.
 */
function changePos(x, y, z) {
  let jsonPos = JSON.stringify({type: "pos", x: x, y: y, z: z});
  for (let id in connections) { // Send it to everyone
    connections[id].dataChannel.send(jsonPos);
  }
}

/**
 * Open up the chat window to its initial state.
 */
function initChat() {
  openChat();

  files.style.display = "inline-block";
  users.style.display = "inline-block";
  connectionList.hidden = false;
  chatBox.style.display = "inline-block";
  receivedFiles.style.display = "none";
  buttons.hidden = false;

  if ((sharing && shareUser == ourID) || !sharing) {
    shareButton.hidden = false;
  }

  sceneDiv.style.display = "none"; // Hide the 3D scene
}

/**
 * Open the chat and hide the 3D environment.
 */
function openChat() {
  document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);

  chatDiv.style.display = "inline-block"; // Open the chat
  sceneDiv.style.display = "none"; // Hide the 3D scene

  unreadMessages = 0; // We have now seen the received chat messages
  notification.innerHTML = "";

  changeModeButton.onclick = function() { open3D() };
  changeModeButton.value = "Open 3D";

  document.body.style.backgroundColor = "white";
}

/**
 * Open the 3D environment and hide the chat.
 */
function open3D() {
  document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);

  chatDiv.style.display = "none"; // Hide the chat
  sceneDiv.style.display = "inline-block"; // Open the 3D scene

  changeModeButton.onclick = function() { openChat() };
  changeModeButton.value = "Open Chat";

  document.body.style.backgroundColor = "grey";
}

/**
 * Make 'c'-keypress swap between chat and 3D-space.
 */
function initSwapView() {
  document.addEventListener("keyup", swapViewOnC);

  chatSend.onfocus = function() { document.removeEventListener("keyup", swapViewOnC) };
  chatSend.onblur = function() { document.addEventListener("keyup", swapViewOnC) };
}

/**
 * Switches between the chat and the 3D environment.
 */
function swapViewOnC(event) {
  if (event.key == 'c') {
    if (changeModeButton.value == "Open 3D") {
      open3D();
    } else if (changeModeButton.value == "Open Chat") {
      openChat();
    } else {
      console.log("Could not swap view: changeModeButton.value = " + changeModeButton.value);
    }
  }
}

/**
 * Tidies up variables related to a PeerConnection when a user leaves.
 */
function userLeft(id) {
  removeConnectionHTMLList(id);
  if (id == shareUser) { // If they were sharing their screen then remove it
    shareUser = null;
    screenShare.hidden = true;
    shareButton.hidden = false;
    addWalls();
  }
  if (connections[id].stream) document.getElementById(connections[id].stream.id).outerHTML = ''; // Remove video
  if (connections[id].dataChannel) connections[id].dataChannel.close(); // Close DataChannel
  if (connections[id].connection) connections[id].connection.close(); // Close PeerConnection
  delete connections[id]; // Delete object entry
}

/**
 * Leaves the conference, resets variable values and closes connections and streams.
 */
function leave(button) {

  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile); // Avoid memory leaks
  }

  stopShareScreen(document.getElementById("shareButton"));
  stopShareCamera(document.getElementById("cameraButton"));

  files.style.display = "none"; // Stop listing local files
  roomName.readOnly = false; // Allows the user to change what room to join
  username.readOnly = false; // Allows the user to change their username
  shareButton.hidden = true; // We cannot share our screen once we leave the conference
  receivedFiles.style.display = "none"; // Stop listing received files
  chatBox.style.display = "none"; // Stop listing messages
  users.style.display = "none"; // Stop listing users
  connectionList.innerHTML = ''; // Empty the list of users
  changeModeButton.hidden = true;
  videoElement.innerHTML = '<ul></ul>'; // Removes all videos from the list on the right side of the screen
  buttons.hidden = true;
  remoteFiles.innerHTML = ' Remote Files: ';

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop()); // Stop all local media tracks
    localStream = null;
  }

  leave3D(); // Closes the 3D environment
  leaveRoom(); // Let the other users know that we are leaving

  for (let id in connections) {
    if (connections[id].stream)
      connections[id].stream.getTracks().forEach(track => track.stop()); // Stop all remote media tracks, if there are any
    connections[id].dataChannel.close(); // Close the DataChannel
    connections[id].connection.close(); // Close the PeerConnection
    clearFileList(id);
  }
  connections = {};

  button.value = "Join";
  button.onclick = function() { init(button) };
}
