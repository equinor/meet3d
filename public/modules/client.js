import * as ThreeD from './3D.js';

var connectionList = document.getElementById("connectionList");
var users = document.getElementById("users");
var chatReceive = document.getElementById("chatReceive");
var chatBox = document.getElementById("chatBox");
var chatSend = document.getElementById("chatSend");
var chatDiv = document.getElementById("chatSection");
var files = document.getElementById("files");
var receivedFiles = document.getElementById("receivedFiles");
var screenShare = document.getElementById("screenShare");
var notification = document.getElementById("notification");
var sceneDiv = document.getElementById("3D");
var videoElement = document.getElementById("remoteVideo");
var buttons = document.getElementById("buttons");
var videoDiv = document.getElementById("videopage");
var videoPageElement = document.getElementById("remoteVideoPage");

var roomButton = document.getElementById("3Droom");
var chatButton = document.getElementById("chatMode");
var videoButton = document.getElementById("videoButton");
var shareButton = document.getElementById("shareButton");
var cameraButton = document.getElementById("cameraButton");

// These two variables are present in both client.js and connect.js
var ourID; // This is our unique ID
var connections; // The key is the socket id, and the value is:
/*    {
 *      name: String,
 *      stream: MediaStream,
 *      connection: PeerConnection,
 *      audio: RTCRtpSender,
 *      video: RTCRtpSender
 *    }
 */

var localStream = null; // This is our local media stream
var textFile = null; // This stores any downloaded file
var sharing = {};
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
  audio: true
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
async function init(id, cons) {

  ourID = id;
  connections = cons;

  let audio = await shareAudio(null); // We need audio to start
  if (!audio) return;

  initSwapView(); // Allows users to switch between the chat and the 3D space using 'c'

  openChat();

  files.style.display = "inline-block";
  users.style.display = "inline-block";
  connectionList.hidden = false;
  chatBox.style.display = "inline-block";
  receivedFiles.style.display = "none";
  buttons.hidden = false;

  sceneDiv.style.display = "none"; // Hide the 3D scene

  return true;
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
      console.error(e);
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
async function addLocalTracksToConnection(id) {
  if (!localStream || localStream.getTracks().length == 0) {
    console.error("There is no track to add to the new connection.");
    return;
  }
  for (let i in localStream.getTracks()) {
    let track = localStream.getTracks()[i];
    if (track.kind == "video") {
      try {
        connections[id].video = connections[id].connection.addTrack(track, localStream);
      } catch (e) { console.log(e)}

    } else if (track.kind == "audio") {
      try {
        connections[id].audio = connections[id].connection.addTrack(track, localStream);
      } catch (e) { console.log(e)}
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
  let cameradisp = document.getElementById("ourVideostream");
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
  cameradisp.remove();

  videoElement.children[0].removeChild(cameraLi);
  if (videoElement.children[0].children.length == 0) {
    // There are no videos to show, so resize the 3D scene
    ThreeD.resizeCanvas(0); // Make space for the videos on the screen
  }
}

/**
 * Shares our screen with the other users, if noone is doing so already.
 */
async function shareScreen(button) {

  if (sharing.id) return; // Someone else is sharing their screen

  try {
    screenCapture = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints); // Ask for the screen capture
  } catch(e) {
    if (e.name === "NotAllowedError") { // We were not given permission to use the screen capture
      alert('Unfortunately, access to the screen is necessary in order to use the program. ' +
      'Permissions for this webpage can be updated in the settings for your browser, ' +
      'or by refreshing the page and trying again.');
    } else {
      console.error(e);
      alert('Unable to access local media: ' + e.name);
    }
    return;
  }

  screenCapture.getVideoTracks()[0].onended = function (event) { // Detects when sharing is disabled in chrome
    stopShareScreen(button);
  }

  if (sharing.id) { // If someone else starts sharing whilst we select our screen, use theirs
    let tracks = screenCapture.getTracks();
    tracks.forEach(track => track.stop());
    return;
  }

  button.value = "Stop Sharing Screen";
  button.onclick = function () { stopShareScreen(button) };

  sharing.id = ourID; // We are the one sharing our screen
  sharing.width = screenCapture.getVideoTracks()[0].getSettings().width;
  sharing.height = screenCapture.getVideoTracks()[0].getSettings().height;
  screenShare.srcObject = screenCapture;
  ThreeD.updateShareScreen(screenCapture.getVideoTracks()[0], sharing, username.value); // Add the stream to the 3D environment
  addScreenCapture(null); // Notify other users and add the stream to the connections
}

/**
 * Adds our screen capture stream to the PeerConnection with the user with ID
 * 'id', or to all connections if 'id' is null.
 */
function addScreenCapture(id) {
  if (sharing.id && sharing.id == ourID) { // If we are sharing

    let shareJSON = JSON.stringify({
      type: "share",
      sharing: true,
      height: screenCapture.getVideoTracks()[0].getSettings().height,
      width: screenCapture.getVideoTracks()[0].getSettings().width
    });

    if (id) { // Share it with one user
      connections[id].dataChannel.send(shareJSON); // Notify everyone that we want to share our screen
      connections[id].connection.addTrack(screenCapture.getVideoTracks()[0]); // Update our media stream with video
    } else { // Share it with all users
      for (let i in connections) {
        connections[i].dataChannel.send(shareJSON); // Notify everyone that we want to share our screen
      }
      for (let i in connections) {
        connections[i].connection.addTrack(screenCapture.getVideoTracks()[0]); // Update our media stream with video
      }
    }
  }
}

/**
 * Stops us sharing our screen, including notifying others that we have done so
 */
function stopShareScreen(button) {

  if (!screenShare.srcObject || sharing.id !== ourID) {
    return; // We are not sharing our screen, so we do not need to close anything
  }

  button.onclick = function () { shareScreen(button) }; // Reset the share screen button
  button.value = "Share Screen";

  let tracks = screenShare.srcObject.getTracks();

  tracks.forEach(track => track.stop()); // Stop the video track
  screenShare.srcObject = null;
  sharing.id = null; // This indicates that noone is sharing their screen
  sharing.width = 0;
  sharing.height = 0;
  ThreeD.updateShareScreen(null, sharing, null); // Re-add the 3D walls without the video texture

  let shareJSON = JSON.stringify({
    type: "share",
    sharing: false // Indicates that we are no longer sharing
  });

  for (let id in connections) {
    connections[id].dataChannel.send(shareJSON); // Let all users know that we are no longer sharing our screen
  }
}

/**
 * Adds the given stream to the 3D environment, passing along the video width
 * and height as it does so.
 */
function updateShareScreen(videoStream) {
  if (sharing.id) {
    ThreeD.updateShareScreen(videoStream, sharing, connections[sharing.id].name);
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
    ThreeD.changeUserPosition(id, message.x, message.y, message.z); // Change position of user
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
      if (shareButton) // This is done in order to make unit testing work
        shareButton.hidden = true; // Hide the share screen button
      sharing.id = id; // Save the ID of the sharing user
      sharing.width = message.width;
      sharing.height = message.height;
    } else { // If they have stopped sharing
      sharing.id = null;
      sharing.width = 0;
      sharing.height = 0;

      shareButton.hidden = false; // Unhide the share screen button
      screenShare.srcObject = null;
      ThreeD.updateShareScreen(null, sharing, null); // Re-add the 3D walls without the video texture
    }
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
        if (connections[id].dataChannel)
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
    if (connections[id].dataChannel)
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

  let stream = new MediaStream([track]);
  if (id !== ourID) {
    connections[id].stream = stream; // Update the 'stream' attribute for the connection
  }

  let streamElement = document.createElement("video"); // Create an element to place the stream in
  let streamElementLi = document.createElement("li"); // Create a list entry to store it in
  let streamElement2 = document.createElement("video");

  if (id !== ourID) {
    streamElementLi.hidden = true;
    streamElement.autoplay = false;
    streamElement2.autoplay = true;
    streamElementLi.id = stream.id; // The ID of the list entry is the ID of the stream

    streamElement2.id = (stream.id + 1);
  } else {
    streamElement.autoplay = true;
    streamElement2.autoplay = true;
    streamElementLi.id = "ourVideo";
    streamElement2.id = "ourVideostream";

  }
  streamElement2.srcObject = stream;
  streamElement.srcObject = stream;

  streamElement2.width = cameraConstraints.video.width;
  streamElement2.height = cameraConstraints.video.height;

  streamElement.width = cameraConstraints.video.width;
  streamElement.height = cameraConstraints.video.height;

  videoPageElement.appendChild(streamElement2);

  let nameTag = document.createElement("nametag");
  if (id !== ourID) {
    nameTag.innerHTML = connections[id].name + '⮭';
  } else {
    nameTag.innerHTML = username.value + '⮭';
  }

  streamElementLi.appendChild(streamElement);
  streamElementLi.appendChild(nameTag);
  videoElement.hidden = false;

  if (id == ourID && videoElement.children[0].children.length > 0) {
    videoElement.children[0].insertBefore(streamElementLi, videoElement.children[0].firstChild); // Display our video at the top
  } else {
    videoElement.children[0].appendChild(streamElementLi);
  }

  videoDisplay();
  ThreeD.resizeCanvas(cameraConstraints.video.width); // Make space for the videos on the screen
  ThreeD.updateVideoList(id); // Update the list of what videos to show, in 3D.js
}

// Function to choose which videoElement to display in videopage and chat/3D
function videoDisplay() {
  if (videoButton.hidden == true) {
    videoElement.hidden = true;
    videoPageElement.hidden = false;
  } else {
    videoElement.hidden = false;
    videoPageElement.hidden = true;
  }
}

/**
 * Removes the video stream belonging to the user with ID 'id' from the HTML.
 */
function removeVideoStream(id) {
  let cameraLi = document.getElementById(connections[id].stream.id);
  let cameradisp = document.getElementById(connections[id].stream.id + 1);
  cameraLi.children[0].srcObject = null;
  screenShare.hidden = true;
  cameraLi.innerHTML = '';
  cameradisp.remove();
  videoElement.children[0].removeChild(cameraLi);

  connections[id].stream = null;

  if (videoElement.children[0].children.length == 0)
    ThreeD.resizeCanvas(0); // Make space for the videos on the screen

  ThreeD.updateVideoList(id);
}

/**
 * Open the chat and hide the 3D environment.
 */
function openChat() {
  document.removeEventListener("keydown", ThreeD.onDocumentKeyDown);
	document.removeEventListener("keyup", ThreeD.onDocumentKeyUp);

  chatDiv.style.display = "inline-block"; // Open the chat
  sceneDiv.style.display = "none"; // Hide the 3D scene
  videoDiv.style.display = "none"; //Hide video

  chatButton.hidden = true;
  roomButton.hidden = false;
  videoButton.hidden = false;
  videoDisplay();

  unreadMessages = 0; // We have now seen the received chat messages
  notification.innerHTML = "";

  document.body.style.backgroundColor = "white";
}

/**
 * Open the 3D environment and hide the chat.
 */
function open3D() {
  document.addEventListener("keydown", ThreeD.onDocumentKeyDown, false);
	document.addEventListener("keyup", ThreeD.onDocumentKeyUp, false);


  chatDiv.style.display = "none"; // Hide the chat
  videoDiv.style.display = "none"; //Hide video
  sceneDiv.style.display = "inline-block"; // Open the 3D scene

  chatButton.hidden = false;
  videoButton.hidden = false;
  roomButton.hidden = true;
  videoDisplay();

  document.body.style.backgroundColor = "grey";
}

/**
 * Open the videopage and hide chat and 3D scene
 */
function openVideoPage() {

  chatDiv.style.display = "none"; // Hide the chat
  sceneDiv.style.display = "none"; //Hide 3D scene
  videoDiv.style.display = "inline-block"; //Open videopage
  document.body.style.backgroundColor = "grey";

  chatButton.hidden = false;
  videoButton.hidden = true;
  roomButton.hidden = false;

  videoDisplay();
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
    if (ThreeD.controls.isLocked === true) ThreeD.controls.unlock(); // Unlocks the mouse if you swap view while moving in the 3D-space
    if (videoButton.hidden == true) return;
    if (roomButton.hidden == false) open3D();
    else openChat();
  }
}

/**
 * Tidies up variables related to a PeerConnection when a user leaves.
 */
function userLeft(id) {
  clearFileList(id);
  removeConnectionHTMLList(id);
  if (id == sharing.id) { // If they were sharing their screen then remove it
    sharing.id = null;
    sharing.width = 0;
    sharing.height = 0;
    screenShare.srcObject = null;
    shareButton.hidden = false;
    ThreeD.updateShareScreen(null, sharing, null);
  }
  if (connections[id].stream) document.getElementById(connections[id].stream.id).outerHTML = ''; // Remove video
  if (connections[id].dataChannel) connections[id].dataChannel.close(); // Close DataChannel
  if (connections[id].connection) connections[id].connection.close(); // Close PeerConnection
  delete connections[id]; // Delete object entry
}

/**
 * Leaves the conference, resets variable values and closes connections and streams.
 */
function clearHTML() {

  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile); // Avoid memory leaks
  }

  stopShareScreen(document.getElementById("shareButton"));
  stopShareCamera(document.getElementById("cameraButton"));

  files.style.display = "none"; // Stop listing local files
  roomName.readOnly = false; // Allows the user to change what room to join
  username.readOnly = false; // Allows the user to change their username
  receivedFiles.style.display = "none"; // Stop listing received files
  chatBox.style.display = "none"; // Stop listing messages
  users.style.display = "none"; // Stop listing users
  connectionList.innerHTML = ''; // Empty the list of users
  videoElement.innerHTML = '<ul></ul>'; // Removes all videos from the list on the right side of the screen
  buttons.hidden = true;
  remoteFiles.innerHTML = ' Remote Files: ';

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop()); // Stop all local media tracks
    localStream = null;
  }

  for (let id in connections) {
    if (connections[id].stream)
      connections[id].stream.getTracks().forEach(track => track.stop()); // Stop all remote media tracks, if there are any
    connections[id].dataChannel.close(); // Close the DataChannel
    connections[id].connection.close(); // Close the PeerConnection
    clearFileList(id);
  }
}

export {
  clearHTML,
  init,
  appendConnectionHTMLList,
  addLocalTracksToConnection,
  addVideoStream,
  addScreenCapture,
  advertiseFile,
  dataChannelReceive,
  removeVideoStream,
  userLeft,
  updateShareScreen,
  openVideoPage,
  open3D,
  openChat,
  shareCamera,
  shareScreen,
  sendChat,

  // These are used for unit tests
  sharing,
  shareButton
};
