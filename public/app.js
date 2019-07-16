'use strict'

const VideoStream = {
  socket: io(),

  // call onMediaStream, noMediaStream on it
  showMyFace: function showMyFace () {
    console.log('showMyFace function.')
    VideoStream.localVideo = document.getElementById('local-video')
    VideoStream.localVideo.volumn = 0
    VideoStream.getVideoButton.setAttribute('disabled', 'disabled')
    VideoStream.socket.emit('join', 'test')
    VideoStream.socket.on('ready', VideoStream.readyToCall)
    VideoStream.socket.on('offer', VideoStream.onOffer)

    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => VideoStream.localVideo.srcObject = stream)
      .then(stream => VideoStream.localStream = stream)
    console.log('end showMyFace.')
  },

  // enable Call button when ready to call
  readyToCall: function readyToCall (event) {
    console.log('readyToCall function.')
    VideoStream.callButton.removeAttribute('disabled')
  },

  // set up call back to run turn server, call onConnect here
  startCall: function startCall (event) {
    console.log('startCall function.')
    VideoStream.socket.on('connect', VideoStream.onConnect(VideoStream.createOffer))
    VideoStream.socket.emit('connect')
    VideoStream.callButton.setAttribute('disabled', 'disabled')
  },

  onConnect: function onConnect (callback) {
    console.log("onConnect function.")
    return function (connect) {
      VideoStream.server = {
        iceServers: [{ urls: 'stun:3.114.49.64' }]
      }

      VideoStream.peerConnection = new RTCPeerConnection(VideoStream.server)
      console.log('already defined')
      VideoStream.peerConnection.addStream(VideoStream.localStream)
      VideoStream.peerConnection.onicecandidate = VideoStream.onIceCandidate
      VideoStream.peerConnection.ontrack = VideoStream.onAddStream

      VideoStream.socket.on('candidate', VideoStream.onCandidate)
      VideoStream.socket.on('answer', VideoStream.onAnswer)
      callback()
    }
  },

  // when peerConnection generates and ice candidate, send it over the socket
  // to the pee.
  onIceCandidate: function onIceCandidate (event) {
    console.log('onIceCandidate function.')
    if (event.candidate) {
      VideoStream.socket.emit('candidate', JSON.stringify(event.candidate))
    }
  },

  // When receiving a candidate over the socket, turn it back into a real
  // RTCIceCandidate and add it to the peerConnection.
  onCandidate: function onCandidate (candidate) {
    console.log('onCandidate function.')
    VideoStream.rtcCandidate = new RTCIceCandidate(JSON.parse(candidate))
    VideoStream.peerConnection.addIceCandidate(VideoStream.rtcCandidate)
  },

  // Create an offer that contains the media capabilities of the browser.
  createOffer: function createOffer () {
    console.log('createOffer function.')
    VideoStream.peerConnection.createOffer()
      .then(offer => VideoStream.peerConnection.setLocalDescription(offer))
      .then(offer => VideoStream.socket.emit('offer', JSON.stringify(offer)))
  },

  // Create an answer with the media capabilities that both browsers share.
  createAnswer: function createAnswer (offer) {
    console.log('createAnswer function.')
    // VideoStream.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)))
    //   .then(() => VideoStream.peerConnection.createAnswer())
    //   .then(answer => VideoStream.setLocalDescription(answer))
    //   .then(answer => VideoStream.socket.emit('answer', JSON.stringify(answer)));
    return function(){
      console.log("log offer:" + offer)
      rtcOffer = new RTCSessionDescription(JSON.parse(offer));
      VideoStream.peerConnection.setRemoteDescription(rtcOffer);
      VideoStream.peerConnection.createAnswer(
        function(answer){
          VideoStream.peerConnection.setLocalDescription(answer);
          VideoStream.socket.emit('answer', JSON.stringify(answer));
        },
        function(err){
          // Handle a failed answer creation.
          console.log(err);
        }
      );
    }
  },

  // create an offer
  onOffer: function onOffer (offer) {
    console.log('onOffer function.')
    VideoStream.socket.on('connect', VideoStream.onConnect(VideoStream.createAnswer(offer)))
    VideoStream.socket.emit('connect')
  },

  // add received answer to peerConnection as remote description
  onAnswer: function onAnswer (answer) {
    console.log('onAnswer function.')
    VideoStream.rtcAnswer = new RTCSessionDescription(JSON.parse(answer))
    VideoStream.peerConnection.setRemoteDescription(VideoStream.rtcAnswer)
  },

  // When the peerConnection receives the actual media stream from the other
  // browser, add it to the other video element on the page.
  onAddStream: function onAddStream (event) {
    console.log('onAddStream function.')
    VideoStream.remoteVideo = document.getElementById('remote-video')
    VideoStream.remoteVideo.srcObject = event.stream
  }
}

VideoStream.getVideoButton = document.getElementById('get-video')
VideoStream.callButton = document.getElementById('call')

VideoStream.getVideoButton.addEventListener(
  'click',
  VideoStream.showMyFace,
  false
)

VideoStream.callButton.addEventListener(
  'click',
  VideoStream.startCall,
  false
)
