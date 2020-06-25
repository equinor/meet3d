'use strict';

// https://codelabs.developers.google.com/codelabs/webrtc-web/#6

const maxUsers = 5
var rooms = {}

var users = {}

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

function addRoom(firstUser) {
  let users = []
  users.push(firstUser)
  rooms.push(users)
}

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message) {
    //log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    //io.sockets.in(users[socket.id].room).emit('message', message);
  });

  socket.on('gotMedia', function() {
    io.sockets.in(users[socket.id].room).emit('gotMedia', socket.id)
  });

  socket.on('offer', function(data) {
    //let dataArray = data.split('&')
    //users[dataArray[0]].socket.emit('offer', socket.id + '&' + dataArray[1])
    console.log("\noffer")
    console.log(data)
    users[data.id].socket.emit('offer', {id: socket.id, offer: data.offer})
  });

  socket.on('answer', function(data) {
    //let dataArray = data.split('&')
    //{id: socket.id, offer: data.offer}
    console.log("\nanswer")
    console.log(data)
    users[data.id].socket.emit('answer', {id: socket.id, answer: data.answer})
  });

  socket.on('candidate', function(data) {

    //let dataArray = data.split('&')
    //users[data.id].socket.emit('offer', data.candidateData)
    console.log("\ncandidate")
    console.log(data)
    io.sockets.in(users[socket.id].room).emit('candidate', {id: socket.id, candidateData: data})
  });

  socket.on('disconnect', function() {
    // io.emit('user disconnected');
    if (users[socket.id] !== undefined)
      io.sockets.in(users[socket.id].room).emit('left', socket.id);
  });

  socket.on('left', function() {
    log('User ' + socket.id + " is leaving");
    io.sockets.in(users[socket.id].room).emit('left', socket.id);
  })

  socket.on('join/create', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) { // Room created

      rooms[room] = []
      rooms[room].push(socket)
      users[socket.id] = new User(room, socket)

      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      //console.log('Client ID ' + socket.id + ' created room ' + room);

      socket.emit('created', room + ':' + socket.id);

    } else if (numClients > 0 && numClients < maxUsers) { // Room joined
      log('Client ID ' + socket.id + ' joined room ' + room);

      rooms[room].push(socket)
      users[socket.id] = new User(room, socket)

      socket.emit('joined', room + ':' + socket.id);
      //console.log('Client ID ' + socket.id + ' joined room ' + room);

      io.sockets.in(room).emit('join', room + ":" + socket.id);
      socket.join(room);

      io.sockets.in(room).emit('ready');
    } else { // Someone tried to join a full room
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('pos', function(pos) {
    // Format:  id:x:y:z
    socket.broadcast.emit('pos', socket.id + ':' + pos);
  });

});


class User {
  constructor(room, socket) {
    this._room = room;
    this._socket = socket;
  }

  set room(room) {
    this._room = room
  }

  set socket(socket) {
    this._socket = socket
  }

  get room() {
    return this._room;
  }

  get socket() {
    return this._socket;
  }
}
