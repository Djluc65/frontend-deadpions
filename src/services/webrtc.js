import { NativeModules, View, Text, StyleSheet, Platform } from 'react-native';

let WebRTC = {
  RTCPeerConnection: class {
    constructor() {}
    close() {}
    addStream() {}
    removeStream() {}
    createOffer() { return Promise.resolve({ sdp: '', type: 'offer' }); }
    createAnswer() { return Promise.resolve({ sdp: '', type: 'answer' }); }
    setLocalDescription() { return Promise.resolve(); }
    setRemoteDescription() { return Promise.resolve(); }
    addIceCandidate() { return Promise.resolve(); }
    getSignalingState() { return 'closed'; }
    iceConnectionState = 'closed';
  },
  RTCIceCandidate: class {},
  RTCSessionDescription: class {},
  RTCView: null,
  mediaDevices: null,
  isAvailable: false
};

// Check if the native module is linked
const isNativeAvailable = !!NativeModules.WebRTCModule;

if (Platform.OS === 'web') {
  WebRTC = {
    RTCPeerConnection: window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection,
    RTCIceCandidate: window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate,
    RTCSessionDescription: window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription,
    RTCView: (props) => {
        return <View {...props} />;
    },
    mediaDevices: navigator.mediaDevices,
    isAvailable: !!navigator.mediaDevices && !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  };
  
  if (WebRTC.RTCPeerConnection && !WebRTC.RTCPeerConnection.prototype.addStream) {
      WebRTC.RTCPeerConnection.prototype.addStream = function(stream) {
          stream.getTracks().forEach(track => this.addTrack(track, stream));
      };
  }
} else if (isNativeAvailable) {
  try {
    const rnw = require('react-native-webrtc');
    WebRTC = {
      ...rnw,
      isAvailable: true
    };
  } catch (error) {
    console.warn("Failed to require react-native-webrtc:", error);
  }
} else {
  console.log("WebRTC Native Module not found or disabled. Running in fallback mode.");
  WebRTC.RTCView = ({ style }) => (
    <View style={[style, styles.fallbackContainer]}>
      <Text style={styles.fallbackText}>
        Vidéo non disponible sur cet appareil.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#333'
  },
  fallbackText: {
    color: 'white', 
    textAlign: 'center', 
    padding: 10
  }
});

export const {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
  isAvailable
} = WebRTC;

export default WebRTC;
