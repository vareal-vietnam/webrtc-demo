'use strict';

let socket = io();
let localVideo = document.getElementById('local-video');
let remoteVideo = document.getElementById('remote-video');
let getVideoButton = document.getElementById('get-video');
let callButton = document.getElementById('call');

const servers = {
  'iceServers':  [{'urls': 'stun:3.114.49.64'}]
};

let peerConnection = new RTCPeerConnection(servers);

// move the below function to (onToken)
function onConnect(callback){
  return function(){
    peerConnection.onicecandidate = onIceCandidate();
    peerConnection.onaddstream = onAddStream();

    socket.on('candidate', onCandidate());
    socket.on('answer', onAnswer());
    callback();
  }
}

// call onMediaStream, noMediaStream on it
function showMyFace() {
  navigator.mediaDevices.getUserMedia({audio:true, video:true})
    .then(stream => localVideo.srcObject = stream)
    .then(stream => peerConnection.addStream(stream));
  onMediaStream();
  noMediaStream();
}

function onMediaStream(stream){
  localVideo.volumn = 0;
  getVideoButton.setAttribute('disabled', 'disabled');

  socket.emit('join', 'test');
  socket.on('ready', readyToCall());
  socket.on('offer', onOffer());
}

function noMediaStream(){
  console.log('No media stream for us.');
}

// enable Call button when ready to call
function readyToCall(event){
  callButton.removeAttribute('disabled');
}

// set up call back to run turn server, call onConnect here
function startCall(event){
  socket.on('connect', onConnect(createOffer()));
  socket.emit('connect');
  callButton.setAttribute('disabled', 'disabled');
}

// when peerConnection generates and ice candidate, send it over the socket
// to the pee.
function onIceCandidate(event){
  if(event.candidate){
    socket.emit('candidate', JSON.stringify(event.candidate));
  }
}

// When receiving a candidate over the socket, turn it back into a real
// RTCIceCandidate and add it to the peerConnection.
function onCandidate(candidate){
  var rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
  peerConnection.addIceCandidate(rtcCandidate);
}

// Create an offer that contains the media capabilities of the browser.
function createOffer(){
  peerConnection.createOffer()
    .then(offer => peerConnection.setLocalDescription(offer))
    .then(offer => socket.emit('offer', JSON.stringify(offer)));
}

// Create an answer with the media capabilities that both browsers share.
function createAnswer(offer){
  // peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)))
  //   .then(() => peerConnection.createAnswer())
  //   .then(answer => pc.setLocalDescription(answer))
  //   .then(answer => socket.emit('answer', JSON.stringify(answer)));
  return () => {
    rtcOffer = new RTCSessionDescription(JSON.parse(offer));
    peerConnection.setRemoteDescription(rtcOffer);
    peerConnection.createAnswer(
      (answer) => {
        peerConnection.setLocalDescription(answer);
        socket.emit('answer'. JSON.stringify(answer));
      },
      (err) => {
        console.log(err);
      }
    );
  }
}

// create an offer
function onOffer(offer){
  socket.on('connect', onConnect(createAnswer(offer)))
}

// add received answer to peerConnection as remote description
function onAnswer(answer){
  let rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
  peerConnection.setRemoteDescription(rtcAnswer);
}

// When the peerConnection receives the actual media stream from the other
// browser, add it to the other video element on the page.
function onAddStream(event){
  remoteVideo.srcObject = event.stream;
}

getVideoButton.addEventListener(
  'click',
  showMyFace(),
  false
);
