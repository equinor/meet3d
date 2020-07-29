'use strict';

import * as ThreeD from './modules/3D.js';
import * as Client from './modules/client.js';

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
roomButton.onclick = function () { Client.open3D() };
chatButton.onclick = function () { Client.openChat() };
videoButton.onclick = function () { Client.openVideoPage() };
shareButton.onclick = function () { Client.shareScreen(shareButton) };
cameraButton.onclick = function () { Client.shareCamera(cameraButton) };
chatSendButton.onclick = function () { Client.sendChat() };
chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      Client.sendChat(); // Send chat message by pressing enter in the chat
    }
  });
uploadButton.onclick = function() { Client.advertiseFile() };

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
const signalServer = 'signaling-server-meet3d-master.radix.equinor.com'; // The signaling server

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

  socket.emit('join', startInfo.room); // Join the conference room
  console.log('Attempting to join ' + roomName.value);

  // The room we tried to join is full
  socket.on('full', function() {
    console.log('Room ' + startInfo.room + ' is full');
    alert('Room ' + startInfo.room + ' is full');
  });

  // A new user joined the room
  socket.on('join', async function (message) {
    if (message.id === ourID) return;

    connections[message.id] = {};
    connections[message.id].name = message.name;

    console.log('User ' + message.name + ' joined the room');

    myResource = await ThreeD.reserveResource();
    console.log("myResource is : " + myResource);
    sendOffer(message.id); // Send the user your local description in order to create a connection
    if (!ThreeD.newUserJoined(message.id, message.name, '')) // Add the new user to the 3D environment
      console.error("Unable to add " + message.name + " to the 3D environment");
    Client.appendConnectionHTMLList(message.id);
  });

  // We joined a conference
  socket.on('joined', async function(id) {
    console.log('We joined: ' + startInfo.room);
    ourID = id;
    await Client.init(ourID, connections); // Updates the webpage HTML and gets local user media
    await ThreeD.init(ourID, connections, document.getElementById("3D")); // Renders the 3D environment
    console.log('We are ready to receive offers');
    socket.emit('ready', startInfo); // Signal that we are ready to connect to other users
  });

  // A user left the conference
  socket.on('left', function(id) {
    if (connections[id]) {
      console.log("User " + connections[id].name + " left");
      Client.userLeft(id);
      ThreeD.userLeft(id);
    }
  });

  // We have received a PeerConnection offer
  socket.on('offer', function(message) {
    let id = message.id;
    let name = message.name;
    let offerDescription = message.offer;
    let resource = message.resource;

    if (id === ourID) return;

    if (!connections[id]) { // Add the user to our list of users, if this is not a renegotiation
      connections[id] = {};
      connections[id].name = name;
      Client.appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
      ThreeD.newUserJoined(id, name, resource); // Add new user to 3D environment
      console.log("Received offer from " + connections[id].name);
    } else {
      console.log("Received renegotiated offer from " + connections[id].name);
    }

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
    await Client.addLocalTracksToConnection(id); // This triggers 'PeerConnection.onnegotiations'
  }
}

/**
 * Sends a reply to an offer with our local PeerConnection description.
 */
async function sendAnswer(id, offerDescription) {

  let newConnection = false; // True if this is not a renegotiation

  if (!connections[id].connection) {
    newConnection = true;
    console.log('Creating RTCPeerConnection to user ' + connections[id].name);
    connections[id].connection = await createPeerConnection(id);
  }

  console.log('Sending answer to connection to user ' + connections[id].name);

  connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription)).then(async function () {
    if (newConnection) {
      console.log("Adding local tracks to connection to " + connections[id].name);
      await Client.addLocalTracksToConnection(id);
    }
  }).then(function() {
    return connections[id].connection.createAnswer();
  }).then(function(answer) {
    return connections[id].connection.setLocalDescription(answer);
  }).then(function() {
    socket.emit('answer', { // Send our answer
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
        ThreeD.userGotMedia(id, new MediaStream([event.track])); // Adds audio track to 3D environment
      }

      if (event.track.kind == "video") {
        if (event.streams.length == 0) { // Screen capture video
          Client.updateShareScreen(event.track); // Add the video track to the 3D environment
        } else { // Web camera video
          // Web camera videos should always be in a stream
          Client.addVideoStream(id, event.track);
          event.streams[0].onremovetrack = function (event) { // A track has been removed
            console.log(connections[id].name + ' removed a track from their stream.')
            if (event.track.kind == "video") {
              Client.removeVideoStream(id);
            }
          }
        }
      }
    };

    pc.onremovestream = function (event) {
      console.log("Lost a stream from " + connections[id].name);
    };

    pc.ondatachannel = function (event) { // Receive a DataChannel connection request
      event.channel.addEventListener("open", () => {
        connections[id].dataChannel = event.channel;
        console.log("Datachannel established to " + connections[id].name);
      });

      event.channel.addEventListener("close", () => {
        if (connections[id]) {
          console.log("DataChannel to " + connections[id].name + " has closed");
          ThreeD.userLeft(id); // Removes the user from the 3D environment
          Client.userLeft(id);
        }
      });

      event.channel.addEventListener("message", (message) => {
        Client.dataChannelReceive(id, message.data); // Called when we receive a DataChannel message
      });
    };

    pc.onnegotiationneeded = async function (event) {
      console.log("Negotiation needed, sending offer to " + connections[id].name);

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
        ThreeD.userLeft(id); // Removes the user from the 3D environment
        Client.userLeft(id);
      }
    };

  } catch (e) {
    console.error('Failed to create PeerConnection. Exception: ' + e.message);
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
    Client.advertiseFile();
    Client.addScreenCapture(id);
    ThreeD.updatePos();
  };

  dc.onclose = function () {
    if (connections[id]) {
      console.log("DataChannel to " + connections[id].name + " has closed");
      ThreeD.userLeft(id); // Removes the user from the 3D environment
      Client.userLeft(id);
    }
  };

  dc.onmessage = function (event) {
    Client.dataChannelReceive(id, event.data); // Handles all DataChannel data
  };
}

/**
 * Signifies to the signal server that we are leaving the conference, then
 * closes the connection and resets the HTML page.
 */
function leave(button) {
  socket.emit('left');
  socket.disconnect(true);

  ThreeD.leave(); // Closes the 3D environment
  Client.clearHTML();

  connections = {};

  button.value = "Join";
  button.onclick = function() { init(button) };
}
