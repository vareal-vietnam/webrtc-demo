'use strict'
require('dotenv').config()
const crypto = require('crypto')

// Hapi build web services such as JSON API
const Path = require('path')
const Hapi = require('hapi')
const Inert = require('@hapi/inert')
const username = process.env.TURN_USERNAME
const secret = process.env.TURN_SECRET

const server = new Hapi.Server({
  // host: process.env.HOST,
  port: ~~process.env.PORT
})

// attach Socket.io process to Hapi server
const socketio = require('socket.io')
const io = socketio(server.listener)

// Server static assets
const start = async () => {
  await server.register(Inert)

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
  })

  await server.start()
  console.log('Server running at:', server.info.uri)
}

const getTurnCredentails = (username, secret) => {
  let unixTimeStamp = parseInt(Date.now() / 1000) + 24 * 3600,
      name = [unixTimeStamp, username].join(':'),
      password,
      token,
      hmac = crypto.createHmac('sha1', secret)

  hmac.setEncoding('base64')
  hmac.write(name)
  hmac.end()
  password = hmac.read()
  token = {
    name: name,
    password: password
  }
  return token
}

// signaling
io.on('connection', (socket) => {
  console.log("LOG: just connected: "+ socket.id)
  socket.on('join', (room) => {
    console.log('already join')
    let clients = io.sockets.adapter.rooms[room]
    let numClients = (typeof clients !== 'undefined') ? Object.values(clients)[1] : 0

    if (numClients == 0) {
      console.log('LOG: numClients = 0')
      socket.join(room)
    } else if (numClients == 1) {
      console.log('LOG: numClients = 1')
      socket.emit('numClients', numClients)
      socket.join(room)
      socket.emit('ready', room)
      socket.broadcast.emit('ready', room)
    } else {
      console.log('LOG: numClients > 1')
      socket.emit('full', room)
    }
  })

  // TURN server
  socket.on('token', () => {
    console.log('LOG: on connect')
    // const token = getTurnCredentails(username, secret)
    socket.emit('token')
  })

  // send candidate straight on to the other browser
  socket.on('candidate', (candidate) => {
    console.log('LOG: on candidate')
    socket.broadcast.emit('candidate', candidate)
  })

  socket.on('offer', (offer) => {
    console.log('LOG: on offer')
    socket.broadcast.emit('offer', offer)
  })

  socket.on('answer', (answer) => {
    console.log('LOG: on answer')
    socket.broadcast.emit('answer', answer)
  })
})

// Start the server
start()
