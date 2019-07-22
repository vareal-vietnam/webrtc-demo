'use strict'
// Create an object to save various objects to without polluting the global
// namespace.
const VideoStream = {
  // Initialise our connection to the WebSocket.
  socket: io(),

  // Call to showMyFace
  // asking for access to both the video and audio streams.
  showMyFace: function showMyFace () {
    console.log('showMyFace function.')
    // Get the video element.
    VideoStream.localVideo = document.getElementById('local-video')
    // Turn the volumn down to 0 to avoid echoes.
    VideoStream.localVideo.volumn = 0
    VideoStream.getVideoButton.setAttribute('disabled', 'disabled')
    // Turn the media stream into a URL that can be used by the video and add it
    // as the video. As the video has the `autoplay` attribute it will start to
    // stream immediately.
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => VideoStream.localVideo.srcObject = stream)
      .then(stream => VideoStream.localStream = stream)

    // Ready to join the chat room
    VideoStream.socket.emit('join', 'test')
    VideoStream.socket.on('ready', VideoStream.readyToCall)
    VideoStream.socket.on('offer', VideoStream.onOffer)
  },

  // When we are ready to call, enable the Call button.
  readyToCall: function readyToCall (event) {
    console.log('readyToCall function.')
    VideoStream.callButton.removeAttribute('disabled')
  },

  // Set up a callback to run when we connect to TURN server. And disable get-video button
  startCall: function startCall (event) {
    console.log('startCall function.')
    // need a loop run here to add each remote element to the local element
    // VideoStream.socket.on('numClients', (numClients) => {
    //   console.log('LOG: numClients:' + numClients)
    //   if (numClients > 0){
    //     console.log("inside if")
    //     VideoStream.remoteVideo = "<video id='remote-video" + numClients + "'height='150' autoplay>Hello</video>"
    //     VideoStream.localVideo.insertAdjacentHTML('afterend', VideoStream.remoteVideo)
    //     console.log('remoteVideo: ' + VideoStream.remoteVideo)
    //   }
    // })
    console.log('event value in startCall: ' + JSON.stringify(event))
    VideoStream.socket.on('token', VideoStream.onConnect(VideoStream.createOffer))
    VideoStream.socket.emit('token')
    VideoStream.callButton.setAttribute('disabled', 'disabled')
  },

  // Connect to server
  onConnect: function onConnect (callback) {
    console.log("onConnect function.")
    // Set up a new RTCPeerConnection using the iceServers.
    return function (token) {
      console.log('token get on client: ' + JSON.stringify(token))
      VideoStream.server = {
        iceServers: [
          { urls: 'stun:3.114.49.64' },
          {
            urls: 'turn:3.114.49.64?transport=udp',
            credential: token.password,
            username: token.name
          }
        ]
      }
      // {
      //   urls: 'turn:numb.viagenie.ca?transport=udp',
      //   credential: 'muazkh',
      //   username: 'webrtc@live.com'
      // }

      VideoStream.peerConnection = new RTCPeerConnection(VideoStream.server)
      // Add the local video stream to the peerConnection.
      VideoStream.peerConnection.addStream(VideoStream.localStream)
      // Set up callbacks for the connection generating iceCandidates or
      // receiving the remote media stream.
      VideoStream.peerConnection.onicecandidate = VideoStream.onIceCandidate
      VideoStream.peerConnection.onaddstream = VideoStream.onAddStream
      // Set up listeners on the socket for candidates or answers being passed
      // over the socket connection.
      VideoStream.socket.on('candidate', VideoStream.onCandidate)
      VideoStream.socket.on('answer', VideoStream.onAnswer)
      callback()
    }
  },

  // when peerConnection generates and ice candidate, send it over the socket
  // to the pee.
  onIceCandidate: function onIceCandidate (event) {
    console.log('onIceCandidate function.')
    console.log('event value on onIceCandidate: ' + JSON.stringify(event))
    if (event.candidate) {
      VideoStream.socket.emit('candidate', JSON.stringify(event.candidate))
    }
  },

  // When receiving a candidate over the socket, turn it back into a real
  // RTCIceCandidate and add it to the peerConnection.
  onCandidate: function onCandidate (candidate) {
    console.log('onCandidate function.')
    console.log('candidate value on onCandidate: ' + candidate)
    VideoStream.rtcCandidate = new RTCIceCandidate(JSON.parse(candidate))
    VideoStream.peerConnection.addIceCandidate(VideoStream.rtcCandidate)
  },

  // Create an offer that contains the media capabilities of the browser.
  createOffer: function createOffer () {
    console.log('createOffer function.')
    VideoStream.peerConnection.createOffer(
      function(offer){
        // If the offer is created successfully, set it as the local description
        // and send it over the socket connection to initiate the peerConnection
        // on the other side.
        VideoStream.peerConnection.setLocalDescription(offer);
        VideoStream.socket.emit('offer', JSON.stringify(offer));
      },
      function(err){
        // Handle a failed offer creation.
        console.log("when creating offer:"+ err);
      }
    );
  },

  // Create an answer with the media capabilities that both browsers share.
  // This function is called with the offer from the originating browser, which
  // needs to be parsed into an RTCSessionDescription and added as the remote
  // description to the peerConnection object. Then the answer is created in the
  // same manner as the offer and sent over the socket.
  createAnswer: function createAnswer (offer) {
    console.log('createAnswer function.')
    console.log('offer value on createAnswer: ' + offer)
    return function(){
      const rtcOffer = new RTCSessionDescription(JSON.parse(offer));
      VideoStream.peerConnection.setRemoteDescription(rtcOffer);
      VideoStream.peerConnection.createAnswer(
        function(answer){
          console.log('create answer without errors: ' + answer)
          VideoStream.peerConnection.setLocalDescription(answer);
          VideoStream.socket.emit('answer', JSON.stringify(answer));
        },
        function(err){
          // Handle a failed answer creation.
          console.log('when creating answer: ' + err);
        }
      );
    }
  },

  // When a browser receives an offer, set up a callback to be run when
  // calling onConnect.
  onOffer: function onOffer (offer) {
    console.log('onOffer function.')
    console.log('offer value in onOffer: ' + offer)
    VideoStream.socket.on('token', VideoStream.onConnect(VideoStream.createAnswer(offer)))
    VideoStream.socket.emit('token')
  },

  // add received answer to peerConnection as remote description
  onAnswer: function onAnswer (answer) {
    console.log('onAnswer function.')
    console.log('answer value on onAnswer: ' + answer)
    const rtcAnswer = new RTCSessionDescription(JSON.parse(answer))
    VideoStream.peerConnection.setRemoteDescription(rtcAnswer)
  },

  // When the peerConnection receives the actual media stream from the other
  // browser, add it to the other video element on the page.
  onAddStream: function onAddStream (event) {
    console.log('onAddStream function.')
    console.log('event value on onAddStream: ' + JSON.stringify(event))
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
