var mockRTCConnections = [];
var mockRTCConnectionIndex = 1;
var mockRTCConnectionShouldSucceed = true;

function MockRTCPeerConnection(configuration) {
  this.id_ = mockRTCConnectionIndex++;
  this.remote_ = null;
  this.signalingState = 'stable';
  this.dataChannels_ = {};
  this.configuration_ = configuration;
  this.addEventTypes(['datachannel', 'icecandidate', 'signalingstatechange'])
};

MockRTCPeerConnection.prototype = lobby.util.extend(lobby.util.EventSource.prototype, {
  createOffer: function(onSuccess, onError, options) {
    onSuccess(new MockRTCSessionDescription({'offer': this.id_}));
  },
  setLocalDescription: function(description, onSuccess, onFailure) {
    this.localDescription_ = description;
    if (onSuccess)
      onSuccess();
  },
  createAnswer: function(onSuccess, onError, options) {
    if (!this.remoteDescription_)
      throw new Error('Expect remote description before createAnswer');
    onSuccess(new MockRTCSessionDescription({'answer': this.id_, 'offer': this.remoteDescription_.offer}));
  },
  setRemoteDescription: function(description, onSuccess, onFailure) {
    this.remoteDescription_ = description;
    if (onSuccess)
      onSuccess();
    this.generateIceCandidate_();
  },
  createDataChannel: function(name, options) {
    this.dataChannels_[name] = new MockRTCDataChannel(this, null, name, options);
    return this.dataChannels_[name];
  },
  addIceCandidate: function(candidate) {
    // These are how the clients get connected, so at this point we should actually hook up the clients.
    this.remote_ = mockRTCConnections[candidate.candidate];
    
    // Sync requested data channels.
    for (var i in this.dataChannels_) {
      if (!this.remote_.dataChannels_[i])
        this.remote_.addDataChannel_(new MockRTCDataChannel(this.remote_, this.dataChannels_[i]));
    }

    // Once both have received ice candidates (i.e. set this.remote_) we "connect" them.
    if (mockRTCConnectionShouldSucceed && this.remote_.remote_ == this) {
      for (var i in this.dataChannels_) {
        var localDC = this.dataChannels_[i];
        var remoteDC = this.remote_.dataChannels_[i];
        setTimeout(localDC.onOpen_.bind(localDC), 0);
        setTimeout(remoteDC.onOpen_.bind(remoteDC), 0);
      }
    }
  },
  generateIceCandidate_: function() {
    // Hook up the RTC connection.
    mockRTCConnections[this.id_] = this;
    this.dispatchEvent('icecandidate', {'candidate': new MockRTCIceCandidate({candidate: this.id_})});
  },
  addDataChannel_: function(dataChannel) {
    this.dataChannels_[dataChannel.name_] = dataChannel;
    this.dispatchEvent('datachannel', {'channel': dataChannel});
  },
  changeState_: function(newState) {
    this.signalingState = newState;
    this.dispatchEvent('signalingstatechange');
  },
  close: function() {
    // First close any data channels.
    for (var i in this.dataChannels_) {
      this.dataChannels_[i].close();
    }
  },
});

function MockRTCDataChannel(pc, remoteDC, name, options) {
  this.pc_ = pc;
  this.readyState = 'connecting'; 
  if (remoteDC) {
    this.remote_ = remoteDC;
    this.remote_.remote_ = this;
  }
  this.name_ = remoteDC ? remoteDC.name_ : name;
  this.options_ = remoteDC ? remoteDC.options_ : options;
  this.addEventTypes(['open', 'message', 'close']);
}

MockRTCDataChannel.prototype = lobby.util.extend(lobby.util.EventSource.prototype, {
  send: function(msg) {
    this.remote_.onMessage_(msg);
  },
  onMessage_: function(msg) {
    this.dispatchEvent('message', {'data': msg});
  },
  close: function() {
    if (this.remote_) {
      // Unset the remote's link back to us so that we don't get back into close.
      this.remote_.remote_ = null;
      this.remote_.close();
      this.remote_ = null;
    }
    this.dispatchEvent('close');
    delete this.pc_.dataChannels[this.name_];
  },
  onOpen_: function() {
    this.readyState = 'open';
    this.dispatchEvent('open');
  }
});

function MockRTCSessionDescription(options) {
  for (var i in options)
    this[i] = options[i];
}

function MockRTCIceCandidate(options) {
  for (var i in options)
    this[i] = options[i];
}

function installWebRTCMock() {
  window.RTCPeerConnection = MockRTCPeerConnection;
  window.RTCSessionDescription = MockRTCSessionDescription;
  window.RTCIceCandidate = MockRTCIceCandidate;
}