'use strict';

var roomName = document.getElementById("roomName");
var leaveRoom = document.getElementById("leaveButton");
var startButton = document.getElementById("start");
var connectionList = document.getElementById("connectionList");
var users = document.getElementById("users");
var username = document.getElementById("username");

username.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init()
    }
  });

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      init()
    }
  });

var localStream; // This is our local audio stream
var turnReady;
var room; // This is the name of our conference room
var socket; // This is the SocketIO connection to the signalling server
var ourID; // This is our unique ID
var connections = {} // The key is the socket id, and the value is {name: username, stream: mediastream, connection: PeerConnection}

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
  audio: true
};

function init() {

  if (username.value === '') {
    alert('Please enter a username')
    return
  }

  if (roomName.value === '') {
    alert('Please enter a room name')
    return
  }

  room = roomName.value;
  username.readOnly = true;
  users.hidden = false;
  roomName.readOnly = "readonly";
  startButton.hidden = true;
  leaveButton.hidden = false;
  connectionList.hidden = false;
  socket = io.connect();

  if (room !== '') {
    let startInfo = {
      room: room, // The room we want to join
      name: username.value // Our username
    }
    socket.emit('join/create', startInfo);
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

  socket.on('join', function (startInfo) {
    if (startInfo.id === ourID) {
      return
    }
    connections[startInfo.id] = {}
    connections[startInfo.id].name = startInfo.name
    console.log('User ', startInfo.name, ' joined room ', room)

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
    if (data.id === ourID) { // If we moved: do nothing
      return
    }
    // changeUserPosition(data.id, data.x, data.y, data.z) // Change position of user
  });

  socket.on('left', function(id) {
    console.log("User " + connections[id].name + " left")
    removeHTMLAudio(id)
    removeConnectionHTMLList(id)
    delete connections[id]
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
    let name = message.name
    let offerDescription = message.offer

    if (id === ourID) return;

    connections[id] = {}
    connections[id].name = name
    sendAnswer(id, offerDescription)

    appendConnectionHTMLList(id)
  });

  socket.on('answer', function(message) {

    let id = message.id
    let answerDescription = message.answer

    if (id === ourID) return;
    connections[id].connection.setRemoteDescription(new RTCSessionDescription(answerDescription));

    appendConnectionHTMLList(id)
  });

  socket.on('candidate', function(message) {

    let id = message.id
    let answerDescription = message.candidateData
    if (id === ourID) return;

    var candidate = new RTCIceCandidate({
      sdpMLineIndex: answerDescription.label,
      candidate: answerDescription.candidate
    });
    connections[id].connection.addIceCandidate(candidate);
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
  console.log('>>>>>> Creating peer connection to user ' + connections[id].name);
  connections[id].connection = createPeerConnection(id);
  connections[id].connection.addStream(localStream);

  connections[id].connection.createOffer().then(function(description) {
    connections[id].connection.setLocalDescription(description);
    socket.emit('offer', {
      id: id,
      name: username.value,
      offer: description
    });

  }, function (e) {
    console.log("Failed to create offer: " + e)
    return
  });
}

function sendAnswer(id, offerDescription) {
  if (connections[id].connection == undefined) {
    connections[id].connection = createPeerConnection(id);
    connections[id].connection.addStream(localStream);
  } else if (connections[id].signalingState == "stable") {
    return
  }

  console.log('>>>>>> Sending answer to connection to user ' + connections[id].name);

  connections[id].connection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  connections[id].connection.createAnswer().then(function(description) {
    connections[id].connection.setLocalDescription(description);
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
  socket.emit('pos', {x: x, y: y, z: z});
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  //localVideo.srcObject = stream; // We are not using video for now
  //localAudio.srcObject = stream; // Do not repeat our sound for now

  socket.emit('gotMedia');
}

function createPeerConnection(id) {
  let pc;

  try {
    if (connections[id] == undefined) {
      connections[id] = {}
    }

    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    //pc.onaddstream = handleRemoteStreamAdded;

    pc.onaddstream = function (event) {
      console.log('Remote stream added.');
      console.log(event)
      connections[id].audio = event.stream

      let newAudioNode = document.createElement("audio")
      newAudioNode.srcObject = event.stream
      newAudioNode.id = id
      newAudioNode.autoplay = true
      document.getElementById("audio").appendChild(newAudioNode)

      // This is where we want to pipe the audio into a 3D.js user object
    }

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

/*
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
*/

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);

  let children = document.getElementById("audio").children
  for (let i = 0; i < children.length; i++) {
    if (children[i].srcObject.id == event.stream.id) {
      document.getElementById("audio").removeChild(children[i])
      return
    }
  }
}

function removeHTMLAudio(id) {
  let children = document.getElementById("audio").children
  for (let i = 0; i < children.length; i++) {
    if (children[i].id == id) {
      document.getElementById("audio").removeChild(children[i])
      return
    }
  }
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  leave();
}

function appendConnectionHTMLList(id) {
  let item = document.createElement("li")
  item.id = id;
  item.innerHTML = connections[id].name;
  connectionList.appendChild(item)
}

function removeConnectionHTMLList(id) {
  let children = connectionList.children
  for (let i = 0; i < children.length; i++) {
    if (children[i].id == id) {
      connectionList.removeChild(children[i])
      return
    }
  }
}

function leave() {

  roomName.readOnly = false;
  username.readOnly = false;
  startButton.hidden = false;
  leaveButton.hidden = true;
  localStream = null;
  users.hidden = true;
  connectionList.innerHTML = '';
  for (let id in connections) {
    connections[id].connection.close()
  }
  connections = {}

  stop();

  if (room) {
    socket.emit('left');
    room = null;
  }
}
