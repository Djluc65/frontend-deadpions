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
// 'WebRTCModule' is the standard name for react-native-webrtc native module
const isNativeAvailable = !!NativeModules.WebRTCModule;

if (Platform.OS === 'web') {
  WebRTC = {
    RTCPeerConnection: window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection,
    RTCIceCandidate: window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate,
    RTCSessionDescription: window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription,
    RTCView: (props) => {
        // Basic Video implementation for Web
        return <View {...props} />;
    },
    mediaDevices: navigator.mediaDevices,
    isAvailable: !!navigator.mediaDevices && !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  };
  
  // Add polyfill for addStream if needed (modern WebRTC uses addTrack)
  // But for simple compatibility with old RN-WebRTC code:
  if (WebRTC.RTCPeerConnection && !WebRTC.RTCPeerConnection.prototype.addStream) {
      WebRTC.RTCPeerConnection.prototype.addStream = function(stream) {
          stream.getTracks().forEach(track => this.addTrack(track, stream));
      };
  }

} else if (isNativeAvailable) {
  try {
    // Only require the library if the native module is present
    const rnw = require('react-native-webrtc');
    WebRTC = {
      ...rnw,
      isAvailable: true
    };
  } catch (error) {
    console.warn("Failed to require react-native-webrtc:", error);
  }
} else {
  console.log("WebRTC Native Module not found. Running in fallback mode (likely Expo Go).");
  
  // Mock RTCView to prevent crashes if rendered
  WebRTC.RTCView = ({ style }) => (
    <View style={[style, styles.fallbackContainer]}>
      <Text style={styles.fallbackText}>
        Vidéo non disponible dans Expo Go.{"\n"}
        Veuillez créer un "Development Build".
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
