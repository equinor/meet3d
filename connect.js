'use strict';

var roomName = document.getElementById("roomName");
var localVideo = document.getElementById("localVideo");
var localAudio = document.getElementById("localAudio");
var remoteVideo = document.getElementById("remoteVideo");
var remoteAudio = document.getElementById("remoteAudio");
var leaveRoom = document.getElementById("leaveButton");
var startButton = document.getElementById("start");

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init()
    }
  });

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var remoteTrack;
var turnReady;
var room;
var socket;
var ourID;
var userIDs = [];

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
    console.log('Attempted to create or  join room', room);
  }

  socket.on('created', function(room) {
    let connectionInfo = room.split(':')
    console.log('Created room ' + connectionInfo[0]);
    ourID = connectionInfo[1]
    isInitiator = true;
  });

  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
  });

  socket.on('join', function (room) {
    let connectionInfo = room.split(':')
    if (connectionInfo[1] === ourID) {
      return
    }
    console.log('User ', connectionInfo[1], ' joined room ', connectionInfo[0])
    userIDs.push(connectionInfo[1])
    console.log('Another peer made a request to join room ' + connectionInfo[0]);
    isChannelReady = true;
  });

  socket.on('joined', function(room) {
    let connectionInfo = room.split(':')
    console.log('joined: ' + connectionInfo[0]);
    ourID = connectionInfo[1]
    isChannelReady = true;
  });

  socket.on('log', function(array) {
    console.log.apply(console, array);
  });

  // This client receives a message
  socket.on('message', function(message) {
    console.log('Client received message:', message);
    if (message === 'got user media') {
      maybeStart();
    } else if (message.type === 'offer') {
      if (!isInitiator && !isStarted) {
        maybeStart();
      }
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isStarted) {
      pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
    }
  });

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  })
  .then(gotStream)
  .catch(function(e) {
    console.log(e)
    alert('getUserMedia() error: ' + e.name);
  });

  console.log('Getting user media with constraints', constraints);

  if (location.hostname !== 'localhost') {
    requestTurn(
      'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
    );
  }
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

  sendMessage('got user media');
  if (isInitiator) {
    console.log("Initiating room")
    maybeStart();
  }
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onaddtrack = handleRemoteTrackAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    pc.onremovetrack = handleRemoteTrackRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
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
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteTrackAdded(event) {
  console.log('Remote stream added.');
  remoteTrack = event.stream;
  remoteAudio.srcObject = remoteTrack;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function handleRemoteTrackRemoved(event) {
  console.log('REMOVED A TRACK, LET\'S CHANGE THIS LATER')
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
    room = null;
  }
  if (pc !== undefined) {
    pc.close();
    pc = null;
  }
}
