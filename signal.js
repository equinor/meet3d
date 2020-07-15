'use strict';

var os = require('os');

const maxUsers = 10; // TODO: determine a good value for this
var rooms = {}
var users = {}

var allowedOrigins = "http://localhost:* http://127.0.0.1:* https://web-server-meet3d-testing.radix.equinor.com/:*";

const io = require('socket.io')(80, { cookie: false, origins: allowedOrigins });

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

  socket.on('disconnect', function() {
    if (users[socket.id]) {
      io.sockets.in(users[socket.id].room).emit('left', socket.id);
      socket.leave(users[socket.id].room);
    }
  });

  socket.on('left', function() {
    if (users[socket.id]) {
      io.sockets.in(users[socket.id].room).emit('left', socket.id);
      socket.leave(users[socket.id].room);
    }
  })

  socket.on('newOffer', function(data) {
    users[data.id].socket.emit('newOffer', {id: socket.id, offer: data.offer})
  })

  socket.on('newAnswer', function(data) {
    users[data.id].socket.emit('newAnswer', {id: socket.id, answer: data.answer})
  });

  socket.on('join', function(startInfo) {

    let room = startInfo.room;
    let name = startInfo.name;

    let clientsInRoom = io.sockets.adapter.rooms[room];
    let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients === 0) { // Room created

      rooms[room] = [] // Create a new entry for this room in the dictionary storing the rooms
      rooms[room].push(socket) // Add the client ID to the list of clients in the room
      users[socket.id] = new User(room, socket) // Add the User object to the list of users

      socket.join(room); // Add this user to the room
      socket.emit('created', {room: room, id: socket.id});

    } else if (numClients > 0 && numClients < maxUsers) { // Existing room joined

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
    let ifaces = os.networkInterfaces();
    for (let dev in ifaces) {
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
