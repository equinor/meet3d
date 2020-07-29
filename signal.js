'use strict';

var os = require('os');

const maxUsers = 16;
var users = {};

const io = require('socket.io')(3000, { cookie: false });

io.sockets.on('connection', function(socket) {

  socket.on('offer', function(data) {
    users[data.id].socket.emit('offer', {id: socket.id, offer: data.offer, name: data.name, resource: data.resource});
  });

  socket.on('answer', function(data) {
    users[data.id].socket.emit('answer', {id: socket.id, answer: data.answer});
  });

  socket.on('candidate', function(data) {
    users[data.id].socket.emit('candidate', {id: socket.id, candidateData: data.info});
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
  });

  socket.on('ready', function(info) {
    socket.join(info.room); // Add this user to the room
    io.sockets.in(users[socket.id].room).emit('join', { name: info.name, id: socket.id } );
  });

  socket.on('join', function(room) {
    let clientsInRoom = io.sockets.adapter.rooms[room];
    let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients < maxUsers) {
      users[socket.id] = { room: room, socket: socket }; // Add the User object to the list of users
      socket.emit('joined', socket.id); // Let the user know they joined the room and what their ID is
    } else { // Someone tried to join a full room
      socket.emit('full');
    }
  });
});
