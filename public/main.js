'use strict';

import { newUserJoined3D, userGotMedia, updatePos, updateShareScreen3D, userLeft3D, init3D, leave3D, reserveResource } from './modules/3D.js';
import { openVideoPage,
open3D,
shareCamera,
shareScreen,
openChat,
clearHTML,
appendConnectionHTMLList,
addLocalTracksToConnection,
addVideoStream,
addScreenCapture,
advertiseFile,
dataChannelReceive,
removeVideoStream,
userLeft,
updateShareScreen,
sendChat,
initChat } from './modules/client.js';

var roomName = document.getElementById("roomName");
var username = document.getElementById("username");

var startButton = document.getElementById("start/leave");
var roomButton = document.getElementById("3Droom");
var chatButton = document.getElementById("chatMode");
var videoButton = document.getElementById("videoButton");
var shareButton = document.getElementById("shareButton");
var cameraButton = document.getElementById("cameraButton");
var chatSendButton = document.getElementById("chatSendButton");
var chatSend = document.getElementById("chatSend");
var uploadButton = document.getElementById("uploadButton");

startButton.onclick = function () { init(startButton) };
roomButton.onclick = function () { open3D() };
chatButton.onclick = function () { openChat() };
videoButton.onclick = function () { openVideoPage() };
shareButton.onclick = function () { shareScreen(shareButton) };
cameraButton.onclick = function () { shareCamera(cameraButton) };
chatSendButton.onclick = function () { sendChat() };
chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      sendChat(); // Send chat message by pressing enter in the chat
    }
  });
uploadButton.onclick = function() { advertiseFile() };

var socket; // This is the SocketIO connection to the signalling server
var connections = {};
/*    {
 *      name: String,
 *      stream: MediaStream,
 *      connection: PeerConnection,
 *      audio: RTCRtpSender,
 *      video: RTCRtpSender
 *    }
 */
var ourID;
var myResource;
//const signalServer = 'signaling-server-meet3d-master.radix.equinor.com'; // The signaling server
const signalServer = 'localhost:3000'; // The signaling server

// The configuration containing our STUN and TURN servers.
const pcConfig = {
  iceServers: [
    {
      urls: 'turn:51.120.91.82:3478',
      username: 'default_turn_user',
      credential: 'lime_mercury_hammerkop'
    }
  ]
};

username.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init(startButton); // Join the conference by pressing enter in the username input box
    }
  });

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init(startButton); // Join the conference by pressing enter in the room name input box
    }
  });

/**
 * This function is run in order to join a conference. It establishes contact
 * with the signal server which helps create PeerConnection and DataChannel
 * connections with the other users in the conference. The HTML and 3D canvas
 * are then updated to reflect this.
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

  button.value = "Leave";
  button.onclick = function() { leave(button) };
  username.readOnly = true; // Do not allow the user to edit their name, but show it
  roomName.readOnly = true; // Do not allow the user to edit the room name, but show it

  socket = io(signalServer); // Connect to the signaling server

  let startInfo = {
    room: roomName.value, // The room we want to join
    name: username.value // Our username
  };

  socket.emit('join', startInfo); // Join the conference room
  console.log('Attempting to join ' + roomName.value);

  // The room we tried to join is full
  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
    alert('Room ' + room + ' is full');
  });

  // A new user joined the room
  socket.on('join', async function (message) {
    if (message.id === ourID) return;

    connections[message.id] = {};
    connections[message.id].name = message.name;

    console.log('User ' + message.name + ' joined the room');

    myResource = await reserveResource();
    console.log("myResource is : " + myResource);
    sendOffer(message.id); // Send the user your local description in order to create a connection
    if (!newUserJoined3D(message.id, message.name, '')) // Add the new user to the 3D environment
      console.error("Unable to add " + message.name + " to the 3D environment");
    appendConnectionHTMLList(message.id);
  });

  // We joined a conference
  socket.on('joined', async function(connectionInfo) {
    console.log('We joined: ' + connectionInfo.room);
    ourID = connectionInfo.id;
    await initChat(ourID, connections);
    await init3D(ourID, connections, document.getElementById("3D")); // Renders the 3D environment
    console.log('We are ready to receive offers');
    socket.emit('ready', startInfo);
  });

  // A user moved in the 3D space
  socket.on('pos', function(data) {
    if (data.id === ourID) return; // If we moved: do nothing
    changeUserPosition(data.id, data.x, data.y, data.z); // Change position of user
  });

  // A user left the conference
  socket.on('left', function(id) {
    if (connections[id]) {
      console.log("User " + connections[id].name + " left");
      userLeft(id);
      userLeft3D(id);
    }
  });

  // We have received a PeerConnection offer
  socket.on('offer', function(message) {
    let id = message.id;
    let name = message.name;
    let offerDescription = message.offer;
    let resource = message.resource;

    if (id === ourID) return;

    if (!connections[id]) {
      connections[id] = {};
      connections[id].name = name;
      appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
      newUserJoined3D(id, name, resource); // Add new user to 3D environment
    }

    console.log("Received offer from " + connections[id].name);

    sendAnswer(id, offerDescription); // Reply to the offer with our details
  });

  // We have received an answer to our PeerConnection offer
  socket.on('answer', function(message) {
    let id = message.id;
    let answerDescription = message.answer;

    if (id === ourID) return;

    console.log("Received answer from " + connections[id].name);

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription))
      .catch(function (e) { console.error(e) });
  });

  // We have received an ICE candidate from a user we are connecting to
  socket.on('candidate', async function(message) {

    let id = message.id;
    let candidates = message.candidateData;
    if (id === ourID) return;

    console.log("Receiving candidates from " + connections[id].name);

    let candidate = new RTCIceCandidate({
      sdpMLineIndex: candidates.label,
      candidate: candidates.candidate
    });

    await connections[id].connection.addIceCandidate(candidate);
  });
}

/**
 * Sends an offer to a new user with our local PeerConnection description.
 */
async function sendOffer(id) {
  if (!connections[id].connection) {
    console.log('Sending offer to user ' + connections[id].name);
    connections[id].connection = await createPeerConnection(id);
    await createDataChannel(id);
    await addLocalTracksToConnection(id); // This triggers 'onnegotiations'
  }
}

/**
 * Sends a reply to an offer with our local PeerConnection description.
 */
async function sendAnswer(id, offerDescription) {

  if (!connections[id].connection) {
    console.log('Creating RTCPeerConnection to user ' + connections[id].name);
    connections[id].connection = await createPeerConnection(id);
  }

  console.log('Sending answer to connection to user ' + connections[id].name);

  connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription)).then(async function () {
    console.log("Adding local tracks to connection to " + connections[id].name);
    await addLocalTracksToConnection(id);
  }).then(function() {
    return connections[id].connection.createAnswer();
  }).then(function(answer) {
    return connections[id].connection.setLocalDescription(answer);
  }).then(function() {
    socket.emit('answer', {
      id: id,
      answer: connections[id].connection.localDescription
    });
  }).catch(function (e) { console.error(e) });
}

/**
 * Creates a PeerConnection to the user with ID 'id', and sets the listeners
 * for the connection.
 */
async function createPeerConnection(id) {
  let pc;

  try {
    console.log('Creating peer connection to user ' + connections[id].name);

    pc = new RTCPeerConnection(pcConfig);

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
        console.log('End of candidates from ' + connections[id].name);
      }
    };

    pc.ontrack = function (event) {
      console.log('Remote track added from ' + connections[id].name);

      if (event.track.kind == "audio") {
        userGotMedia(id, new MediaStream([event.track])); // Adds audio track to 3D environment
      }

      if (event.track.kind == "video") {
        if (event.streams.length == 0) { // Screen capture video
          updateShareScreen(event.track); // Add the video track to the 3D environment
        } else { // Web camera video
          // Web camera videos should always be in a stream
          addVideoStream(id, event.track);
          event.streams[0].onremovetrack = function (event) { // A track has been removed
            console.log(connections[id].name + ' removed a track from their stream.')
            if (event.track.kind == "video") {
              removeVideoStream(id);
            }
          }
        }
      }
    };

    pc.onremovestream = function (event) {
      console.log("Lost a stream from " + connections[id].name);
    };

    pc.ondatachannel = function (event) {
      event.channel.addEventListener("open", () => {
        connections[id].dataChannel = event.channel;
        console.log("Datachannel established to " + connections[id].name);
      });

      event.channel.addEventListener("close", () => {
        if (connections[id]) {
          console.log("DataChannel to " + connections[id].name + " has closed");
          userLeft3D(id); // Removes the user from the 3D environment
          userLeft(id);
        }
      });

      event.channel.addEventListener("message", (message) => {
        dataChannelReceive(id, message.data); // Called when we receive a DataChannel message
      });
    };

    pc.onnegotiationneeded = async function (event) {

      console.log("Negotiations needed, sending offer to " + connections[id].name);

      connections[id].connection.createOffer().then(function(offer) {
        return connections[id].connection.setLocalDescription(offer);
      }).then(function() {
        socket.emit('offer', {
          id: id,
          name: username.value,
          offer: connections[id].connection.localDescription
        });
      }).catch(function (e) { console.error(e) });
    };

    pc.onconnectionstatechange = function (event) {
      if (pc.connectionState == "connected") {
        console.log("Fully connected to " + connections[id].name)
      }
      if (pc.connectionState == "closed" && connections[id]) {
        console.log("Lost connection to " + connections[id].name);
        userLeft3D(id); // Removes the user from the 3D environment
        userLeft(id);
      }
    };

  } catch (e) {
    console.error('Failed to create PeerConnection. Exception: ' + e.message);
    alert('Cannot create RTCPeerConnection.');
    return;
  }

  console.log('Created RTCPeerConnection to user ' + connections[id].name);
  return pc;
}

/**
 * Transmit local ICE candidates.
 */
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

/**
 * Creates a new data channel to the user with the given id.
 */
async function createDataChannel(id) {
  let dc = connections[id].connection.createDataChannel("Conference");
  dc.onopen = function () {
    connections[id].dataChannel = dc;
    console.log("Datachannel established to " + connections[id].name);
    advertiseFile();
    addScreenCapture(id);
    updatePos();
  };

  dc.onclose = function () {
    if (connections[id]) {
      console.log("DataChannel to " + connections[id].name + " has closed");
      userLeft3D(id); // Removes the user from the 3D environment
      userLeft(id);
    }
  };

  dc.onmessage = function (event) {
    dataChannelReceive(id, event.data); // Called when we receive a DataChannel message
  };
}

/**
 * Signifies to the signal server that we are leaving the conference, then
 * closes the connection and resets the HTML page.
 */
function leave(button) {
  socket.emit('left');
  socket.disconnect(true);

  leave3D(); // Closes the 3D environment
  clearHTML();

  connections = {};

  button.value = "Join";
  button.onclick = function() { init(button) };
}
