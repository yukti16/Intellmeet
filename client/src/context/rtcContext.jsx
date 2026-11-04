import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from './SocketContext';
import useMedia from '../hooks/useMedia';
import toast from 'react-hot-toast';

const RTCContext = createContext(null);

// Helper to create a new RTCPeerConnection and attach ICE / track handling
const createPeer = (socket, remoteId, onRemoteStream, localStreamRef) => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  const pendingCandidates = [];
  const remoteStream = new MediaStream();

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        target: remoteId,
        candidate: event.candidate,
      });
    }
  };

  pc.ontrack = (event) => {
    const incomingStream = event.streams?.[0];
    if (incomingStream) {
      incomingStream.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((t) => t.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });
    } else if (
      event.track &&
      !remoteStream.getTracks().some((t) => t.id === event.track.id)
    ) {
      remoteStream.addTrack(event.track);
    }
    onRemoteStream(remoteId, remoteStream);
  };

  const attachLocalTracks = () => {
    const stream = localStreamRef.current;
    if (!stream || pc.signalingState === 'closed') return;
    const existingTrackIds = new Set(
      pc.getSenders().map((sender) => sender.track?.id).filter(Boolean)
    );
    stream.getTracks().forEach((track) => {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, stream);
      }
    });
  };

  const addIceCandidate = async (candidate) => {
    if (!candidate || pc.signalingState === 'closed') return;
    if (!pc.remoteDescription) {
      pendingCandidates.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[RTC] Failed to add ICE candidate:', error);
    }
  };

  const flushIceQueue = async () => {
    while (pendingCandidates.length > 0) {
      const candidate = pendingCandidates[0];
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        pendingCandidates.shift();
      } catch (error) {
        console.error('[RTC] Failed to flush ICE candidate:', error);
        break;
      }
    }
  };

  return { pc, remoteStream, addIceCandidate, flushIceQueue, attachLocalTracks };
};

export const RTCProvider = ({ children }) => {
  // Use the single shared socket from SocketContext – no second connection
  const { socket } = useSocket();

  const { stream: localStream, start, stopAll, error: mediaError } = useMedia();

  const localStreamRef = useRef(null);
  const peerMap = useRef(new Map()); // Map of socketId -> connection object
  const joinedMeetingRef = useRef(false);
  const userNameRef = useRef('');
  const [participants, setParticipants] = useState([]);
  const [localReady, setLocalReady] = useState(false);

  // Keep a latest reference to local media for peer attachment
  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) {
      peerMap.current.forEach((conn) => {
        try {
          conn.attachLocalTracks();
        } catch (error) {
          console.error('[RTC] Failed to attach local tracks:', error);
        }
      });
    }
  }, [localStream]);

  const upsertParticipant = useCallback((socketId, name, stream) => {
    setParticipants((prev) => {
      const existing = prev.find((p) => p.socketId === socketId);
      if (existing) {
        return prev.map((p) =>
          p.socketId === socketId
            ? { ...p, name: name || p.name, stream: stream || p.stream }
            : p
        );
      }
      return [...prev, { socketId, name: name || `User-${socketId.slice(0, 5)}`, stream: stream || null }];
    });
  }, []);

  // Expose helper for components that receive remote streams (e.g., MeetingRoomPage)
  const addRemoteParticipant = useCallback((socketId, name, stream) => {
    upsertParticipant(socketId, name, stream);
  }, [upsertParticipant]);

  const removePeer = useCallback((socketId) => {
    const conn = peerMap.current.get(socketId);
    if (conn) {
      conn.pc.ontrack = null;
      conn.pc.onicecandidate = null;
      conn.pc.close();
      peerMap.current.delete(socketId);
    }
    setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const getOrCreatePeer = useCallback(
    (remoteId, remoteName) => {
      let conn = peerMap.current.get(remoteId);
      if (conn && conn.pc.signalingState !== 'closed') {
        return conn;
      }
      const peer = createPeer(
        socket,
        remoteId,
        (id, stream) => {
          upsertParticipant(id, remoteName || `User-${id.slice(0, 5)}`, stream);
        },
        localStreamRef
      );
      conn = { ...peer, makingOffer: false };
      peerMap.current.set(remoteId, conn);
      conn.attachLocalTracks();
      upsertParticipant(remoteId, remoteName, null);
      return conn;
    },
    [socket, upsertParticipant]
  );

  // No signaling listeners here – MeetingRoomPage owns the signaling flow.
  useEffect(() => {}, []);

  const joinRoom = async (meetingCode, userName) => {
    if (joinedMeetingRef.current) {
      console.warn('[RTC] Already joined a meeting.');
      return;
    }
    try {
      await start({ video: true, audio: true });
      userNameRef.current = userName || 'Guest';
      joinedMeetingRef.current = true;
      setLocalReady(true);
      socket.emit('join-meeting', {
        meetingCode,
        userName: userNameRef.current,
      });
    } catch (error) {
      joinedMeetingRef.current = false;
      setLocalReady(false);
      console.error('[RTC] Unable to start local media:', error);
      toast.error('Camera / microphone permission denied');
    }
  };

  const leaveRoom = async () => {
    socket.emit('leave-meeting');
    joinedMeetingRef.current = false;
    peerMap.current.forEach(({ pc }) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    });
    peerMap.current.clear();
    setParticipants([]);
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
        addRemoteParticipant,
      }}
    >
      {children}
    </RTCContext.Provider>
  );
};

export const useRTC = () => {
  const ctx = useContext(RTCContext);
  if (!ctx) {
    throw new Error('useRTC must be used within an RTCProvider');
  }
  return ctx;
};
