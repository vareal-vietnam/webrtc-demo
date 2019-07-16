'use strict';
// require('dotenv').config();

// Hapi build web services such as JSON API
const Path = require('path');
const Hapi = require('hapi');
const Inert = require('@hapi/inert');

const server = new Hapi.Server({
  host: 'localhost',
  port: 3000
});

// attach Socket.io process to Hapi server
const socketio = require('socket.io');
const io = socketio(server.listener);

// Server static assets
const start = async () => {
  await server.register(Inert);

  server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
      directory: {
        path: './public',
        listing: false,
        index: true
      }
    }
  });

  await server.start();
  console.log('Server running at:', server.info.uri);
};

// signaling
io.on('connection', (socket) => {
  socket.on('join', (room) => {
    let clients = io.sockets.adapter.rooms[room];
    let numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

    if(numClients == 0) {
      socket.join(room);
    } else if(numClients == 1) {
      socket.join(room);
      socket.emit('ready', room);
      socket.broadcast.emit('ready', room);
    } else {
      socket.emit('full', room);
    }
  });

// TURN server
  socket.on('connect', (connect) => {
    socket.broadcast.emit('connect', connect);
  });

  // send candidate straight on to the other browser
  socket.on('candidate', (candidate) => {
    socket.broadcast.emit('candidate', candidate);
  });

  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  })
});

// Start the server
start();
