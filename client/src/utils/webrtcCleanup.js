/**
 * Safely stops all media tracks, screen-share tracks, closes RTCPeerConnections,
 * removes socket listeners, and clears video references.
 */
export const cleanupMediaAndPeers = ({
  localStream,
  cameraTrack,
  screenStream,
  peerConnections,
  socket,
  videoElements = [],
} = {}) => {
  // 1. Stop all tracks in localStream (audio and video)
  if (localStream && typeof localStream.getTracks === 'function') {
    localStream.getTracks().forEach((track) => {
      try {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      } catch (err) {
        console.warn('[WebRTC Cleanup] Error stopping local track:', err);
      }
    });
  }

  // 2. Stop dedicated camera track reference if held separately (e.g. during screen share)
  if (cameraTrack) {
    try {
      if (typeof cameraTrack.stop === 'function') {
        cameraTrack.stop();
      }
    } catch (err) {
      console.warn('[WebRTC Cleanup] Error stopping camera track:', err);
    }
  }

  // 3. Stop all screen-sharing tracks
  if (screenStream && typeof screenStream.getTracks === 'function') {
    screenStream.getTracks().forEach((track) => {
      try {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      } catch (err) {
        console.warn('[WebRTC Cleanup] Error stopping screen track:', err);
      }
    });
  }

  // 4. Close and clean up all RTCPeerConnection instances
  if (peerConnections) {
    const pcs = Array.isArray(peerConnections)
      ? peerConnections
      : Object.values(peerConnections);

    pcs.forEach((pc) => {
      if (pc) {
        try {
          pc.ontrack = null;
          pc.onicecandidate = null;
          if (typeof pc.close === 'function') {
            pc.close();
          }
        } catch (err) {
          console.warn('[WebRTC Cleanup] Error closing peer connection:', err);
        }
      }
    });
  }

  // 5. Remove socket listeners and emit leave-meeting
  if (socket) {
    try {
      if (typeof socket.emit === 'function') {
        socket.emit('leave-meeting');
      }
      if (typeof socket.off === 'function') {
        socket.off('existing-participants');
        socket.off('user-joined');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        socket.off('user-toggled-audio');
        socket.off('user-toggled-video');
        socket.off('meeting-ended-by-host');
        socket.off('user-left');
      }
    } catch (err) {
      console.warn('[WebRTC Cleanup] Error cleaning socket listeners:', err);
    }
  }

  // 6. Release video element srcObject references
  if (Array.isArray(videoElements)) {
    videoElements.forEach((el) => {
      if (el && 'srcObject' in el) {
        try {
          el.srcObject = null;
        } catch (err) {
          console.warn('[WebRTC Cleanup] Error clearing video srcObject:', err);
        }
      }
    });
  }
};
