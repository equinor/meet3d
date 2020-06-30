'use strict';

var roomName = document.getElementById("roomName");
var leaveRoom = document.getElementById("leaveButton");
var startButton = document.getElementById("start");
var connectionList = document.getElementById("connectionList");
var users = document.getElementById("users");
var username = document.getElementById("username");
var chatReceive = document.getElementById("chatReceive");
var chatBox = document.getElementById("chatBox");
var chatSend = document.getElementById("chatSend");

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

chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      sendChat()
    }
  });

var localStream; // This is our local audio stream
var turnReady;
var room; // This is the name of our conference room
var socket; // This is the SocketIO connection to the signalling server
var ourID; // This is our unique ID
var connections = {} // The key is the socket id, and the value is {name: username, stream: mediastream, connection: PeerConnection}
const maxChatLength = 20; // The chat will only hold this many messages at a time

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

// Our local media constraints
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
  users.style.display = "inline-block"
  roomName.readOnly = "readonly";
  startButton.hidden = true;
  leaveButton.hidden = false;
  connectionList.hidden = false;
  chatBox.hidden = false;
  chatBox.style.display = "inline-block";
  socket = io.connect();

  if (room !== '') { // Check that the room does not already exist
    let startInfo = {
      room: room, // The room we want to join
      name: username.value // Our username
    }
    socket.emit('join/create', startInfo);
    console.log('Attempting to join ', room);
  }

  // We created and joined a room
  socket.on('created', function(connectionInfo) {
    console.log('Created room ' + connectionInfo.room);
    ourID = connectionInfo.id;
  });

  // The room we tried to join is full
  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
    alert('Room ' + room + ' is full')
  });

  // A new user joined the room
  socket.on('join', function (startInfo) {
    if (startInfo.id === ourID) {
      return
    }
    connections[startInfo.id] = {}
    connections[startInfo.id].name = startInfo.name
    console.log('User ', startInfo.name, ' joined room ', room)

    newUserJoined(startInfo.id, startInfo.name) // Add new user to 3D environment
  });

  // We joined a conference
  socket.on('joined', function(connectionInfo) {
    console.log('We joined: ' + connectionInfo.room);
    ourID = connectionInfo.id;
  });

  // The server sent a log message
  socket.on('log', function(array) {
    console.log.apply(console, array);
  });

  // A user moved in the 3D space
  socket.on('pos', function(data) {
    if (data.id === ourID) { // If we moved: do nothing
      return
    }
    changeUserPosition(data.id, data.x, data.y, data.z) // Change position of user
  });

  // A user left the conference
  socket.on('left', function(id) {
    console.log("User " + connections[id].name + " left")
    removeHTMLAudio(id)
    removeConnectionHTMLList(id)
    userLeft(id) // Removes the user from the 3D environment
    delete connections[id]
  });

  // Receiving a chat message
  socket.on('chat', function(message) {
    console.log(message)
    let name;
    if (message.id == ourID) {
      name = username.value;
    } else {
      name = connections[message.id].name;
    }

    addChat(name, message.message);
  });

  // A new user joins the conference and is ready to communicate
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
    newUserJoined(id, name) // Add new user to 3D environment
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


  init3D(); // Renders the 3D environment
}

// Sends an offer to a new user with our local PeerConnection description
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

// Sends a reply to an offer with our local PeerConnection description
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

// Function which tells other users our new 3D position
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
    pc.ontrack = function (event) {
      console.log('Remote stream added.');
      console.log(event)
      connections[id].audio = event.streams[0] // TODO: verify that this will always be zero

      let newAudioNode = document.createElement("audio")
      newAudioNode.srcObject = event.streams[0] // TODO: verify that this will always be zero
      newAudioNode.id = id
      newAudioNode.autoplay = true
      document.getElementById("audio").appendChild(newAudioNode)

      userGotMedia(id, event.streams[0])
    }
    pc.onremovestream = handleRemoteStreamRemoved;

    console.log('>>>>> Created RTCPeerConnnection');

  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection.');
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

// Tries to find a TURN server
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

function addChat(name, message) {
  let newMessage = document.createElement("li")
  newMessage.innerHTML = name + ': ' + message;
  chatReceive.appendChild(newMessage)
  if (chatReceive.children.length > maxChatLength) {
    chatReceive.removeChild(chatReceive.childNodes[0]); // Limits the number of messages
  }

  chatReceive.scrollTop = chatReceive.scrollHeight; // Maintains the scroll at the bottom
}

function sendChat() {

  if (chatSend.value == '') return;

  socket.emit('chat', chatSend.value);

  chatSend.value = '';
}

function leave() {

  roomName.readOnly = false;
  username.readOnly = false;
  startButton.hidden = false;
  leaveButton.hidden = true;
  chatBox.hidden = true;
  chatBox.style.display = "none";
  localStream = null;
  users.hidden = true;
  users.style.display = "none"
  connectionList.innerHTML = '';
  for (let id in connections) {
    connections[id].connection.close()
  }
  connections = {}

  // Here we also need to close the 3D environment!

  stop();

  if (room) {
    socket.emit('left');
    room = null;
  }
}
