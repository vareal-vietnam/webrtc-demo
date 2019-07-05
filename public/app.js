// Setup VideoChat object
let VideoChat = {
  socket: io(),// Connect to server
  requestMediaStream: function requestMediaStream(event) {
    // navigator.mediaDevices.getUserMedia => adapterjs care about the prefix
    getUserMedia(
    {
      video: true,
      audio: true
    },
    // promopt user to accept page request to use media
    VideoChat.onMediaStream,
    VideoChat.noMediaStream
    );
  },

  onMediaStream: function onMediaStream(stream) {
    VideoChat.localVideo = document.getElementById('local-video');
    VideoChat.localVideo.volumn = 0;
    VideoChat.localStream = stream;
    VideoChat.videoButton.setAttribute('disabled', 'disabled');
    VideoChat.localVideo.src = window.URL.createObjectURL(stream);
    VideoChat.socket.emit('join', 'test');// Join the room
    VideoChat.socket.on('ready', VideoChat.readyToCall);// Listen to the event
    VideoChat.socket.on('offer', VideoChat.onOffer);
  },

  onOffer: function onOffer(offer){
    VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createAnswer(offer)));
    VideoChat.socket.emit('token');
  },

// Call back remove disable call button
  readyToCall: function readyToCall(event) {
    VideoChat.callButton.removeAttribute('disabled');
  },

  noMediastream: function noMediaStream(){
    console.log("No media stream for us.");
  },

  startCall: function startCall(event){
    VideoChat.socket.on('token', VideoChat.onToken(VideoChat.createOffer));
    VideoChat.socket.emit('token');
  },

  onToken: function onToken(callback){
    return (token) => {
      // STUN twilio server
      VideoChat.peerConnection = new RTCPeerConnection({
        iceServers: token.iceServers
      });

      VideoChat.peerConnection.onicecandidate = VideoChat.onIceCandidate;
      VideoChat.socket.on('candidate', VideoChat.onCandidate);
      VideoChat.peerConnection.addStream(VideoChat.localStream);
      VideoChat.peerConnection.onaddstream = VideoChat.onAddStream;
      VideoChat.socket.on('answer', VideoChat.onAswer);
      callback();
    }
  },

  onAnswer: function onAnswer(answer) {
    let rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
    VideoChat.peerConnection.setRemoteDescription(rtcAnswer);
  },

  onAddStream: function onAddStream(event) {
    VideoChat.remoteVideo = document.getElementById('remote-video');
    VideoChat.remoteVideo.src = window.URL.createObjectURL(event.stream);
  },

  createOffer: function createOffer(){
    VideoChat.peerConnection.createOffer(
      (offer) => {
        VideoChat.peerConnection.setLocalDescription(offer);
        socket.emit('offer', JSON.stringify(offer));
      },
      (err) => {
        console.log(err);
      }
    );   
  },

  createAnswer: function createAnswer(offer){
    return () => {
      rtcOffer = new RTCSessionDescription(JSON.parse(offer));
      VideoChat.peerConnection.setRemoteDescription(rtcOffer);
      VideoChat.peerConnection.createAnswer(
        (answer) => {
          VideoChat.peerConnection.setLocalDescription(answer);
          VideoChat.socket.emit('answer', JSON.stringify(answer));
        },
        (err) => {
          console.log(err);
        }
      )
    }
  },

  onCandidate: function onCandidate(candidate){
    rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
    VideoChat.peerConnection.addIceCandidate(rtcCandidate);
  },

  onIceCandidate: function onIceCandidate(event){
    if(event.candidate){
      console.log('Generated candidate!');
      VideoChat.socket.emit('candidate', JSON.stringify(event.candidate));
    }
  }
};

VideoChat.videoButton = document.getElementById('get-video');

// Handle click get video button
VideoChat.videoButton.addEventListener(
  'click',
  VideoChat.requestMediaStream,
  false
)

VideoChat.callButton = document.getElementById('call');

// Handle click call button
VideoChat.callButton.addEventListener(
  'click',
  VideoChat.startCall,
  false
);