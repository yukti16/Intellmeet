// client/src/context/rtcContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from '../socket';
import useMedia from '../hooks/useMedia';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------
// Helper that creates a peer connection with an ICE‑candidate queue.
// ---------------------------------------------------------------------
const createPeer = (socket, remoteId, onRemoteStream, localStreamRef) => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  // Queue for ICE candidates received before remote description is set
  const pendingCandidates = [];

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { target: remoteId, candidate: e.candidate });
    }
  };

  // One MediaStream per remote peer
  const remoteStream = new MediaStream();
  pc.addEventListener('track', (event) => {
    remoteStream.addTrack(event.track);
    onRemoteStream(remoteId, remoteStream);
  });

  const attachLocalTracks = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    // Attach only if there are no senders yet (avoid duplicates)
    if (pc.getSenders().length === 0) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    }
  };

  const addIceCandidate = async (candidate) => {
    // If remote description not yet set, just queue it
    if (!pc.remoteDescription) {
      pendingCandidates.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding ICE candidate', e);
      // Fallback – queue for later retry
      pendingCandidates.push(candidate);
    }
  };

  const flushIceQueue = async () => {
    // Apply in order; do not swallow errors silently
    while (pendingCandidates.length) {
      const cand = pendingCandidates.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.error('Error flushing ICE candidate', e);
        // Drop on persistent failure for simplicity
      }
    }
  };

  return { pc, remoteStream, addIceCandidate, flushIceQueue, attachLocalTracks };
};

// ---------------------------------------------------------------------
// RTC Context
// ---------------------------------------------------------------------
const RTCContext = createContext();

export const RTCProvider = ({ children }) => {
  const socket = useRef(io()).current; // singleton socket
  const { stream: localStream, start, stopAll, error: mediaError } = useMedia();
  const localStreamRef = useRef(null);
  const [participants, setParticipants] = useState([]); // [{socketId, name, stream}]
  const [localReady, setLocalReady] = useState(false);
  const peerMap = useRef(new Map()); // socketId => {pc, addIceCandidate, flushIceQueue, attachLocalTracks}

  // Keep the ref in sync with the actual stream
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // --------------------------------------------------------------
  // Helper – upsert participant (single entry per remote socket)
  // --------------------------------------------------------------
  const upsertParticipant = (socketId, name, stream) => {
    setParticipants((prev) => {
      const existing = prev.find((p) => p.socketId === socketId);
      if (existing) {
        return prev.map((p) => p.socketId === socketId ? { ...p, name, stream } : p);
      }
      return [...prev, { socketId, name, stream }];
    });
  };

  // --------------------------------------------------------------
  // SOCKET EVENT LISTENERS (register once)
  // --------------------------------------------------------------
  useEffect(() => {
    // ---------- existing-participants: we are the *offerer* ----------
    const handleExistingParticipants = async ({ participants }) => {
      for (const { socketId: remoteId, userId, userName } of participants) {
        if (peerMap.current.has(remoteId)) continue;
        const { pc, addIceCandidate, flushIceQueue, attachLocalTracks } = createPeer(
          socket,
          remoteId,
          (id, stream) => upsertParticipant(id, userName || `User-${id.slice(0,5)}`, stream),
          localStreamRef
        );
        peerMap.current.set(remoteId, { pc, addIceCandidate, flushIceQueue, attachLocalTracks });
        attachLocalTracks();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: remoteId, sdp: offer, caller: null });
      }
    };

    // ---------- user-joined: we are the *answerer* ----------
    const handleUserJoined = async ({ socketId, userId, userName }) => {
      if (peerMap.current.has(socketId)) return;
      const { pc, addIceCandidate, flushIceQueue, attachLocalTracks } = createPeer(
        socket,
        socketId,
        (id, stream) => upsertParticipant(id, userName, stream),
        localStreamRef
      );
      peerMap.current.set(socketId, { pc, addIceCandidate, flushIceQueue, attachLocalTracks });
      attachLocalTracks();
    };

    // ---------- offer ----------
    const handleOffer = async ({ socketId, offer, caller }) => {
      let conn = peerMap.current.get(socketId);
      if (!conn) {
        const { pc, addIceCandidate, flushIceQueue, attachLocalTracks } = createPeer(
          socket,
          socketId,
          (id, stream) => upsertParticipant(id, caller?.userName || `User-${id.slice(0,5)}`, stream),
          localStreamRef
        );
        conn = { pc, addIceCandidate, flushIceQueue, attachLocalTracks };
        peerMap.current.set(socketId, conn);
        attachLocalTracks();
      }
      await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));
      await conn.flushIceQueue();
      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      socket.emit('answer', { target: socketId, sdp: answer });
    };

    // ---------- answer ----------
    const handleAnswer = async ({ socketId, answer }) => {
      const conn = peerMap.current.get(socketId);
      if (!conn) return;
      await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
      await conn.flushIceQueue();
    };

    // ---------- ice-candidate ----------
    const handleIceCandidate = async ({ socketId, candidate }) => {
      const conn = peerMap.current.get(socketId);
      if (!conn) return;
      await conn.addIceCandidate(candidate);
    };

    // ---------- user-left ----------
    const handleUserLeft = ({ socketId }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      const conn = peerMap.current.get(socketId);
      if (conn) {
        conn.pc.close();
        peerMap.current.delete(socketId);
      }
    };

    // Register listeners
    socket.on('existing-participants', handleExistingParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    // Cleanup on component unmount
    return () => {
      socket.off('existing-participants', handleExistingParticipants);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket]); // note: we rely on localStreamRef inside handlers

  // --------------------------------------------------------------
  // JOIN / LEAVE helpers (media acquisition before signalling)
  // --------------------------------------------------------------
  const joinRoom = async (meetingCode, userName) => {
    try {
      await start({ video: true, audio: true });
      setLocalReady(true);
      socket.emit('join-meeting', { meetingCode, userName }); // userId is attached via auth middleware if needed
    } catch {
      toast.error('Camera / microphone permission denied');
    }
  };

  const leaveRoom = async (meetingCode) => {
    socket.emit('leave-meeting');
    // Close all remote peer connections (do NOT stop local senders)
    peerMap.current.forEach(({ pc }) => {
      pc.close();
    });
    peerMap.current.clear();
    setParticipants([]);
    // Finally stop our own local media
    stopAll();
    setLocalReady(false);
  };

  return (
    <RTCContext.Provider
      value={{
        socket,
        localStream,
        participants,
        localReady,
        mediaError,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </RTCContext.Provider>
  );
};

export const useRTC = () => useContext(RTCContext);
