'use strict';

import { newUserJoined3D, userGotMedia, updatePos, updateShareScreen3D, userLeft3D, init3D, leave3D } from './modules/3D.js';
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

var socket; // This is the SocketIO connection to the signalling server
var connections = {};
/*
 *    {
 *      name: String,
 *      stream: MediaStream,
 *      connection: PeerConnection,
 *      audio: RTCRtpSender,
 *      video: RTCRtpSender
 *    }
 */
var ourID;
const signalServer = 'signaling-server-meet3d-master.radix.equinor.com'; // The signaling server
// const signalServer = 'localhost:3000'; // The signaling server

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

  socket.emit('join', startInfo);

  console.log('Attempting to join ' + roomName.value);

  // The room we tried to join is full
  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
    alert('Room ' + room + ' is full');
  });

  // A new user joined the room
  socket.on('join', function (message) {
    if (message.id === ourID) return;

    connections[message.id] = {};
    connections[message.id].name = message.name;

    console.log('User ' + message.name + ' joined the room');

    sendOffer(message.id); // Send the user your local description in order to create a connection
    newUserJoined3D(message.id, message.name); // Add the new user to the 3D environment
    appendConnectionHTMLList(message.id);
  });

  // We joined a conference
  socket.on('joined', async function(connectionInfo) {
    console.log('We joined: ' + connectionInfo.room);
    ourID = connectionInfo.id;
    await initChat(ourID, connections);
    await init3D(ourID, connections, document.getElementById("3D")); // Renders the 3D environment
    console.log('We are ready to receive offers');
    socket.emit('ready', startInfo.name);
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
    }
  });

  // We have received a PeerConnection offer
  socket.on('offer', function(message) {
    let id = message.id;
    let name = message.name;
    let offerDescription = message.offer;

    if (id === ourID) return;

    if (!connections[id]) {
      connections[id] = {};
      connections[id].name = name;
      appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
      newUserJoined3D(id, name); // Add new user to 3D environment
    }
    console.log("Received offer from " + connections[id].name)
    sendAnswer(id, offerDescription); // Reply to the offer with our details
  });

  // We have received an answer to our PeerConnection offer
  socket.on('answer', function(message) {
    let id = message.id;
    let answerDescription = message.answer;

    console.log("Received answer from " + connections[id].name)

    if (id === ourID) return;

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));
  });

  // We have received an ICE candidate from a user we are connecting to
  socket.on('candidate', function(message) {

    let id = message.id;
    let candidates = message.candidateData;
    if (id === ourID) return;

    console.log("Receiving candidates from " + connections[id].name);

    let candidate = new RTCIceCandidate({
      sdpMLineIndex: candidates.label,
      candidate: candidates.candidate
    });

    connections[id].connection.addIceCandidate(candidate);
  });
}

/**
 * Sends an offer to a new user with our local PeerConnection description.
 */
async function sendOffer(id) {

  console.log('Sending offer to user ' + connections[id].name);

  if (!connections[id].connection) {
    console.log('Creating peer connection to user ' + connections[id].name);
    connections[id].connection = await createPeerConnection(id);
    createDataChannel(id);
    addLocalTracksToConnection(id); // This triggers 'renegotiations'
  }
}

/**
 * Sends a reply to an offer with our local PeerConnection description.
 */
async function sendAnswer(id, offerDescription) {

  if (!connections[id].connection) {
    console.log('Creating RTCPeerConnection to user ' + connections[id].name);
    connections[id].connection = await createPeerConnection(id);
    addLocalTracksToConnection(id);
  }

  console.log('Sending answer to connection to user ' + connections[id].name);

  connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription));
  connections[id].connection.createAnswer().then(function(description) {
    connections[id].connection.setLocalDescription(description);
    socket.emit('answer', {
      id: id,
      answer: description
    });
  }, function (e) {
    console.error("Failed to create answer: " + e);
    return;
  });
}

/**
 * Creates a PeerConnection to the user with ID 'id', and sets the listeners
 * for the connection.
 */
async function createPeerConnection(id) {
  let pc;

  try {
    if (connections[id] == undefined) {
      connections[id] = {};
    }

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
        console.log('End of candidates.');
      }
    };

    pc.ontrack = function (event) {
      console.log('Remote stream added.');

      if (!event.streams[0]) return;

      let newStream = new MediaStream([event.track]);

      if (event.track.kind == "audio") {
        connections[id].audiostream = event.streams[0];
        userGotMedia(id, newStream); // Adds audio track to 3D environment
      }

      if (event.track.kind == "video") {

        if (event.streams[0].id !== connections[id].audiostream.id) { // Screen capture video
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
        console.log("DataChannel to " + connections[id].name + " has closed");
        userLeft3D(id); // Removes the user from the 3D environment
        userLeft(id);
      });

      event.channel.addEventListener("message", (message) => {
        dataChannelReceive(id, message.data); // Called when we receive a DataChannel message
      });
    };

    pc.onnegotiationneeded = function (event) {

      console.log("Renegotiations needed, sending new offer to " + connections[id].name);

      connections[id].connection.createOffer().then(function(description) {
        connections[id].connection.setLocalDescription(description);
        socket.emit('offer', {
          id: id,
          name: username.value,
          offer: description
        });
      }, function (e) {
        console.error("Failed to create offer: " + e);
        return;
      });
    };

    pc.onconnectionstatechange = function (event) {
      if (pc.connectionState == "closed") {
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
  console.log('Created RTCPeerConnection');
  return pc;
}

/**
 * Creates a new data channel to the user with the given id.
 */
function createDataChannel(id) {
  let tempConnection = connections[id].connection.createDataChannel("Conference");
  tempConnection.onopen = function () {
    connections[id].dataChannel = tempConnection;
    console.log("Datachannel established to " + connections[id].name);
    advertiseFile();
    addScreenCapture(id);
    updatePos();
  };

  tempConnection.onclose = function () {
    console.log("A DataChannel closed");
  };

  tempConnection.onmessage = function (event) {
    dataChannelReceive(id, event.data); // Called when we receive a DataChannel message
  };
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
