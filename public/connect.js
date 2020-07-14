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

/**
 * This function is run in order to join a conference. It establishes contact
 * with the signal server which helps create PeerConnection and DataChannel
 * connections with the other users in the conference.
 */
function initSignaling(room, name) {
  socket = io(signalServer); // Connect to the signaling server

  let startInfo = {
    room: room, // The room we want to join
    name: name // Our username
  };

  socket.emit('join', startInfo);

  console.log('Attempting to join ', room);

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

    if (id === ourID || (connections[id] && connections[id].signalingState == "stable")) return;

    if (!connections[id]) {
      connections[id] = {};
      connections[id].name = name;
      appendConnectionHTMLList(id); // Add their username to the list of connections on the webpage
      newUserJoined(id, name); // Add new user to 3D environment
    }
    console.log("Received offer from " + connections[id].name)
    sendAnswer(id, offerDescription); // Reply to the offer with our details
  });

  // We have received an answer to our PeerConnection offer
  socket.on('answer', function(message) {
    let id = message.id;
    let answerDescription = message.answer;

    console.log("Received answer from " + connections[id].name)

    if (id === ourID || connections[id].signalingState == "stable") return;

    console.log("test")

    console.log(answerDescription)

    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));

    if (!connections[id].dataChannel) appendConnectionHTMLList(id);
  });

  // We have received an ICE candidate from a user we are connecting to
  socket.on('candidate', function(message) {

    let id = message.id;
    let candidates = message.candidateData;
    if (id === ourID) return;

    console.log("Receiving candidates")

    let candidate = new RTCIceCandidate({
      sdpMLineIndex: candidates.label,
      candidate: candidates.candidate
    });
    connections[id].connection.addIceCandidate(candidate);
  });
}

// Sends an offer to a new user with our local PeerConnection description
function sendOffer(id) {
  console.log('Creating peer connection to user ' + connections[id].name);

  if (!connections[id].connection) {
    connections[id].connection = createPeerConnection(id);
    createDataChannel(id);
    addLocalTracksToConnection(id);
  }

  console.log('Sending offer to user ' + connections[id].name);

  connections[id].connection.createOffer().then(function(description) {
    console.log(description)
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

  console.log('Creating RTCPeerConnection to user ' + connections[id].name);
  if (!connections[id].connection) {
    connections[id].connection = createPeerConnection(id);
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
    console.log("Failed to create answer: " + e);
    return;
  });
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

      if (event.track.kind == "audio") {
        userGotMedia(id, new MediaStream([event.track])); // Adds audio track to 3D environment
      }

      if (event.track.kind == "video") {
        if (!event.streams[0]) { // Screen capture video
          screenShare.srcObject = new MediaStream([event.track]); // Create a new stream containing the received track

          if (document.getElementById(newStream.id)) return; // Ignore if there already is screen sharing

          screenShare.srcObject = null;
          screenShare.autoplay = true;
          screenShare.srcObject = newStream;
          addWalls(); // Add the video track to the 3D environment

        } else { // Web camera video

          // Web camera videos should always be in a stream
          addVideoStream(id, event.track);
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
        socket.emit('offer', {
          id: id,
          offer: description
        });
      }, function (e) {
        console.log("Failed to create offer: " + e);
        return;
      });
    };
  } catch (e) {
    console.log('Failed to create PeerConnection. Exception: ' + e.message);
    alert('Cannot create RTCPeerConnection.');
    return;
  }
  console.log('Created RTCPeerConnection');
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
  socket.disconnect(true);
}
