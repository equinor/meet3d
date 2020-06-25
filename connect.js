'use strict';

var roomName = document.getElementById("roomName");
var localVideo = document.getElementById("localVideo");
var localAudio = document.getElementById("localAudio");
var remoteVideo = document.getElementById("remoteVideo");
var leaveRoom = document.getElementById("leaveButton");
var startButton = document.getElementById("start");

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init()
    }
  });

var localStream;
var remoteStream;
var remoteTrack;
var turnReady;
var room;
var socket;
var ourID;
var userIDs = [];
var connections = {} // The key will be the socket id, and the value will be the PeerConnection

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

var constraints = {
  vaudio: true
};

function init() {

  if (roomName.value === '' || room) {
    alert('Please enter a room name')
    return
  }

  room = roomName.value;
  roomName.hidden = true;
  startButton.hidden = true;
  leaveButton.hidden = false;
  socket = io.connect();

  if (room !== '') {
    socket.emit('join/create', room);
    console.log('Attempting to join ', room);
  }

  socket.on('created', function(room) {
    let connectionInfo = room.split(':')
    console.log('Created room ' + connectionInfo[0]);
    ourID = connectionInfo[1]
  });

  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
    alert('Room ' + room + ' is full')
  });

  socket.on('join', function (room) {
    let connectionInfo = room.split(':')
    if (connectionInfo[1] === ourID) {
      return
    }
    console.log('User ', connectionInfo[1], ' joined room ', connectionInfo[0])
    userIDs.push(connectionInfo[1])

    // Here we should call a 3D.js function which adds a new user to the 3D environment
  });

  socket.on('joined', function(room) {
    let connectionInfo = room.split(':')
    console.log('joined: ' + connectionInfo[0]);
    ourID = connectionInfo[1]
  });

  socket.on('log', function(array) {
    console.log.apply(console, array);
  });

  socket.on('pos', function(data) {
    let dataArray = data.split(':')
    if (dataArray[0] === ourID) { // If we moved: do nothing
      return
    }
    // changeUserPosition(dataArray[0], dataArray[1], dataArray[2], dataArray[3]) // Change position of user
  });

  socket.on('left', function(user) {
    const index = userIDs.indexOf(user);
    if (index > -1) {
      userIDs.splice(index, 1);
    }
    console.log("User " + user + " left")
  });

  // This client receives a message
  socket.on('message', function(message) {
    console.log('Client received message:', message);

    // We can use this SocketIO tag for a chat in the future
  });

  socket.on('gotMedia', function(id) {
    if (id === ourID) return;
    sendOffer(id)
  });

  socket.on('offer', function(message) {

    let id = message.id
    let offerDescription = message.offer

    if (id === ourID) return;
    sendAnswer(id, offerDescription)
  });

  socket.on('answer', function(message) {

    let id = message.id
    let answerDescription = message.answer

    if (id === ourID) return;
    connections[id].setRemoteDescription(new RTCSessionDescription(answerDescription));
  });

  socket.on('candidate', function(message) {

    let id = message.id
    let answerDescription = message.candidateData

    if (id === ourID) return;
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: answerDescription.label,
      candidate: answerDescription.candidate
    });
    connections[id].addIceCandidate(candidate);
  });

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  }).then(gotStream).catch(function(e) {
    console.log(e)
    alert('getUserMedia() error: ' + e.name);
  });

  console.log('Getting user media with constraints', constraints);

  if (location.hostname !== 'localhost') { // If we are not hosting locally
    requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
  }
}

function sendOffer(id) {
  console.log('>>>>>> Creating peer connection');
  connections[id] = createPeerConnection();
  connections[id].addStream(localStream);
  isStarted = true;

  connections[id].createOffer().then(function(description) {
    connections[id].setLocalDescription(description);
    socket.emit('offer', {
      id: id,
      offer: description
    });

  }, function (e) {
    console.log("Failed to create offer: " + e)
    return
  });
}

function sendAnswer(id, offerDescription) {
  if (connections[id] == undefined) {
    connections[id] = createPeerConnection();
    connections[id].addStream(localStream);
  } else if (connections[id].signalingState == "stable") {
    return
  }

  connections[id].setRemoteDescription(new RTCSessionDescription(offerDescription));

  connections[id].createAnswer().then(function(description) {
    connections[id].setLocalDescription(description);
    socket.emit('answer', {
      id: id,
      answer: description
    });
  }, function (e) {
    console.log("Failed to create answer: " + e)
    return
  });
}

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

function changePos(x, y, z) {
  socket.emit('pos', x + ':' + y + ':' + z);
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  //localAudio.srcObject = stream; // Do not repeat our sound for now

  socket.emit('gotMedia');
}

function createPeerConnection() {
  let pc
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate1;
    pc.onaddstream = handleRemoteStreamAdded;
    //pc.ontrack = handleRemoteTrackAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('>>>>> Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
  return pc
}

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

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  console.log(event)
  remoteStream = event.stream;

  let newAudioNode = document.createElement("audio")
  newAudioNode.srcObject = remoteStream
  newAudioNode.id = remoteStream.id
  newAudioNode.autoplay = true
  document.getElementById("audio").appendChild(newAudioNode)

  // This is where we want to pipe the audio into a 3D.js user object
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  leave();
}

function leave() {

  isStarted = false;
  roomName.hidden = false;
  startButton.hidden = false;
  leaveButton.hidden = true;
  isInitiator = false;
  remoteStream = null;
  remoteTrack = null;
  localStream = null;
  isChannelReady = false;
  userIDs = [];

  stop();

  if (room) {
    socket.emit('left');
    room = null;
  }
  if (pc !== undefined) {
    pc.close();
    pc = null;
  }
}
