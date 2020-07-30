'use strict';

var os = require('os');

const maxUsers = 16;
var users = {};
var rooms = {}; // Stores a list of the available 3D models for each room

const io = require('socket.io')(3000, { cookie: false });

io.sockets.on('connection', function(socket) {

  socket.on('offer', function(data) {
    users[data.id].socket.emit('offer', {id: socket.id, offer: data.offer, name: data.name, resource: users[socket.id].model});
  });

  socket.on('answer', function(data) {
    users[data.id].socket.emit('answer', {id: socket.id, answer: data.answer});
  });

  socket.on('candidate', function(data) {
    users[data.id].socket.emit('candidate', {id: socket.id, candidateData: data.info});
  });

  socket.on('disconnect', function() {
    let user = users[socket.id];
    if (user) {
      io.sockets.in(user.room).emit('left', socket.id);
      socket.leave(user.room);
      rooms[user.room].unshift(user.model);
    }
  });

  socket.on('left', function() {
    let user = users[socket.id];
    if (user) {
      io.sockets.in(user.room).emit('left', socket.id);
      socket.leave(user.room);
      rooms[user.room].unshift(user.model);
    }
  });

  socket.on('ready', function(info) {
    socket.join(info.room); // Add this user to the room
    io.sockets.in(users[socket.id].room).emit('join', { name: info.name, id: socket.id, model: users[socket.id].model } );
  });

  socket.on('join', function(room) {
    let clientsInRoom = io.sockets.adapter.rooms[room];
    let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients < maxUsers) {

      if (!rooms[room]) {
        rooms[room] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      }

      users[socket.id] = { room: room, socket: socket, model: rooms[room].shift() }; // Add the User object to the list of users
      socket.emit('joined', socket.id); // Let the user know they joined the room and what their ID is
    } else { // Someone tried to join a full room
      socket.emit('full');
    }
  });
});
