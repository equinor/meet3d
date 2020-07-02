'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8085);

const maxUsers = 10; // TODO: determine a good value for this
var rooms = {}
var users = {}

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  socket.on('chat', function(message) {
    io.sockets.in(users[socket.id].room).emit('chat', {id: socket.id, message: message})
  });

  socket.on('offer', function(data) {
    users[data.id].socket.emit('offer', {id: socket.id, offer: data.offer, name: data.name})
  });

  socket.on('answer', function(data) {
    users[data.id].socket.emit('answer', {id: socket.id, answer: data.answer})
  });

  socket.on('candidate', function(data) {
    users[data.id].socket.emit('candidate', {id: socket.id, candidateData: data.info})
  });

  socket.on('pos', function(pos) {
    io.sockets.in(users[socket.id].room).emit('pos', {id: socket.id, x: pos.x, y: pos.y, z: pos.z});
  });

  socket.on('disconnect', function() {
    if (users[socket.id] !== undefined)
      io.sockets.in(users[socket.id].room).emit('left', socket.id);
  });

  socket.on('left', function() {
    io.sockets.in(users[socket.id].room).emit('left', socket.id);
  })

  socket.on('join', function(startInfo) {

    let room = startInfo.room;
    let name = startInfo.name;

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients === 0) { // Room created

      rooms[room] = [] // Create a new entry for this room in the dictionary storing the rooms
      rooms[room].push(socket) // Add the client ID to the list of clients in the room
      users[socket.id] = new User(room, socket) // Add the User object to the list of users

      socket.join(room); // Add this user to the room
      socket.emit('created', {room: room, id: socket.id});

    } else if (numClients > 0 && numClients < maxUsers) { // Room joined

      rooms[room].push(socket) // Add the client ID to the list of clients in the room
      users[socket.id] = new User(room, socket) // Add the User object to the list of users

      socket.emit('joined', {room: room, id: socket.id});

      // Let everyone in the room know that a new user has joined
      io.sockets.in(room).emit('join', {name: name, id: socket.id});

      socket.join(room); // Add this user to the room

    } else { // Someone tried to join a full room
      io.sockets.in(room).emit('full', room);
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
