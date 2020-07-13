var socket; // This is the SocketIO connection to the signalling server

const signalServer = 'ws://localhost:3000'; // The signaling server

const pcConfig = {
  iceServers: [
    {
      urls: 'turn:51.120.91.82:3478',
      username: 'default_turn_user',
      credential: 'lime_mercury_hammerkop'
    }
  ]
};

// Our local audio constraints
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
 * This function is run in order to join a conference. It establishes contact
 * with the signal server which helps create PeerConnection and DataChannel
 * connections with the other users in the conference. It also first gets the
 * audio stream from the user microphone which is added to the PeerConnections.
 */
function init(button) {

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

  room = roomName.value;
  username.readOnly = true; // Do not allow the user to edit their name, but show it
  roomName.readOnly = true; // Do not allow the user to edit the room name, but show it
  initChat(); // Show the chat

  console.log(signalServer)
  socket = io(signalServer); // Connect to the signaling server
  console.log("hei")
  console.log(socket)

  // We created and joined a room
  socket.on('created', function(connectionInfo) {
    console.log('Created room ' + connectionInfo.room);
    ourID = connectionInfo.id;

    init3D(); // Renders the 3D environment
    initSwapView();
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
    initSwapView(); // Lets the user quickly switch between chat mode and 3D mode
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
    if (connections[id].stream) document.getElementById(connections[id].stream.id).outerHTML = '';
    if (connections[id].connection) connections[id].connection.close();
    if (connections[id].dataChannel) connections[id].dataChannel.close();
    delete connections[id];

    if (id == shareUser) {
      shareUser = null;
      screenShare.hidden = true;
      shareButton.hidden = false;
    }
  });

  // We have received a PeerConnection offer
  socket.on('offer', function(message) {
    let id = message.id;
    let name = message.name;
    let offerDescription = message.offer;

    if (id === ourID) return;

    connections[id] = {};
    connections[id].name = name;

    sendAnswer(id, offerDescription); // Reply to the offer with our details
    appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
    newUserJoined(id, name); // Add new user to 3D environment
  });

  // We have received an updated PeerConnection offer
  socket.on('newOffer', function(message) {
    let id = message.id;
    let offerDescription = message.offer;

    if (id === ourID) return;

    if (connections[id].signalingState == "stable") return;

    console.log('Sending new answer to connection to user ' + connections[id].name);

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription));
    connections[id].connection.createAnswer().then(function(description) {
      connections[id].connection.setLocalDescription(description);
      socket.emit('newAnswer', {
        id: id,
        answer: description
      });
    }, function (e) {
      console.log("Failed to create answer: " + e);
      return;
    });
  });

  // We have received an answer to our PeerConnection offer
  socket.on('answer', function(message) {
    let id = message.id;
    let answerDescription = message.answer;

    if (id === ourID) return;

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));
    appendConnectionHTMLList(id);
  });

  // We have received an answer to our updated PeerConnection offer
  socket.on('newAnswer', function(message) {

    let id = message.id;
    let answerDescription = message.answer;

    if (id === ourID) return;

    if (connections[id].signalingState == "stable") return;

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));
  });

  // We have received an ICE candidate from a user we are connecting to
  socket.on('candidate', function(message) {

    let id = message.id;
    let answerDescription = message.candidateData;
    if (id === ourID) return;

    let candidate = new RTCIceCandidate({
      sdpMLineIndex: answerDescription.label,
      candidate: answerDescription.candidate
    });
    connections[id].connection.addIceCandidate(candidate);
  });

  // Gets the audio stream from our microphone
  navigator.mediaDevices.getUserMedia(constraints)
  .then(gotLocalStream) // Success
  .catch(function(e) { // Failure
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
}

// Sends an offer to a new user with our local PeerConnection description
function sendOffer(id) {
  console.log('Creating peer connection to user ' + connections[id].name);
  connections[id].connection = createPeerConnection(id);

  createDataChannel(id);

  connections[id].connection.addStream(localStream);
  if (localVideoTrack) { // If we are sharing video, add it to the stream
    connections[id].senderCam = connections[id].connection.addTrack(localVideoTrack, localStream);
  }

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

/**
 * Creates a PeerConnection to the user with ID 'id', and sets the listeners
 * for the connection.
 */
function createPeerConnection(id) {
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

      let newStream = new MediaStream([event.track]) // Create a new stream containing the received track

      if (event.track.kind == "audio") {
        userGotMedia(id, newStream); // Adds audio track to 3D environment
      }

      if (event.track.kind == "video") {
        if (sharing && id == shareUser) { // Screen capture video
          screenShare.srcObject = newStream;

          if (document.getElementById(newStream.id)) return; // Ignore if there already is screen sharing

          screenShare.srcObject = null;
          screenShare.autoplay = true;
          screenShare.srcObject = newStream;
          addWalls(); // Add the video track to the 3D environment

        } else { // Web camera video

          if (!event.streams[0]) return; // Web camera videos should always be in a stream

          addVideoStream(id, event.streams[0]);
        }
      }

      if (event.streams[0]) {
        event.streams[0].onremovetrack = function (event) { // A track has been removed
          console.log(connections[id].name + ' removed a track from their stream.')
          if (event.track.kind == "video") {

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
        console.log("A DataChannel closed");
      });

      event.channel.addEventListener("message", (message) => {
        dataChannelReceive(id, message.data); // Called when we receive a DataChannel message
      });
    };
    pc.onnegotiationneeded = function (event) {
      console.log("Renegotiations needed, sending new offer")

      connections[id].connection.createOffer().then(function(description) {
        connections[id].connection.setLocalDescription(description);
        socket.emit('newOffer', {
          id: id,
          offer: description
        });
      }, function (e) {
        console.log("Failed to create offer: " + e);
        return;
      });
    };

    console.log('>>>>>> Created RTCPeerConnection');

  } catch (e) {
    console.log('Failed to create PeerConnection. Exception: ' + e.message);
    alert('Cannot create RTCPeerConnection.');
    return;
  }
  return pc;
}

// Creates a new data channel to the user with the given id
function createDataChannel(id) {
  let tempConnection = connections[id].connection.createDataChannel("Chat");
  tempConnection.addEventListener("open", () => {
    connections[id].dataChannel = tempConnection;
    console.log("Datachannel established to " + connections[id].name);
    changePos(findUser(ourID).getxPosition(), findUser(ourID).getyPosition(), findUser(ourID).getzPosition());

    addScreenCapture(id);
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

function leaveRoom() {
  socket.emit('left');
}
