import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRTC } from '../../context/rtcContext';



import { useSocket } from '../../context/SocketContext';
import { meetingService } from '../../services/meetingService';
import { cleanupMediaAndPeers } from '../../utils/webrtcCleanup';
import { VideoTile } from '../../components/meeting/VideoTile';
import { ChatPanel } from '../../components/meeting/ChatPanel';
import { ParticipantsPanel } from '../../components/meeting/ParticipantsPanel';
import { TranscriptPanel } from '../../components/meeting/TranscriptPanel';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import toast from 'react-hot-toast';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MessageSquare,
  Users,
  PhoneOff,
  Sparkles,
  FileText,
  Shield,
  AlertCircle,
} from 'lucide-react';

export const MeetingRoomPage = () => {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { participants, addRemoteParticipant } = useRTC();

  const [meeting, setMeeting] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAcquiringVideo, setIsAcquiringVideo] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const liveTranscriptRef = useRef(liveTranscript);
  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const remoteStreamsRef = useRef({});
  useEffect(() => {
    remoteStreamsRef.current = remoteStreams;
  }, [remoteStreams]);

  // Real-time speech recognition hook
  const {
    status: transcriptionStatus,
    isSupported: isTranscriptionSupported,
    isEnabled: isTranscriptionEnabled,
    interimTranscript,
    error: transcriptionError,
    toggleTranscription,
  } = useSpeechRecognition({
    meetingCode: code ? code.toUpperCase() : '',
    speakerName: user?.name || 'You',
    isMuted,
    socket,
    onTranscriptEntry: (newEntry) => {
      setLiveTranscript((prev) => {
        const exists = prev.some(
          (e) =>
            e.speaker === newEntry.speaker &&
            e.text.trim().toLowerCase() === newEntry.text.trim().toLowerCase() &&
            e.timestamp === newEntry.timestamp
        );
        if (exists) return prev;
        return [...prev, newEntry];
      });
    },
  });


  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
  const pendingIceCandidates = useRef({}); // { socketId: RTCIceCandidate[] }
  const isCleanedUpRef = useRef(false);

  // Fetch meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await meetingService.joinMeeting(code);
        setMeeting(res.meeting);
      } catch (err) {
        console.error('[MeetingRoom] Failed to fetch meeting:', err);
      }
    };
    fetchMeeting();
  }, [code]);

  // Comprehensive idempotent cleanup of all media tracks, peer connections, and socket listeners
  const cleanupMeetingSession = useCallback(() => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;

    cleanupMediaAndPeers({
      localStream: localStreamRef.current,
      cameraTrack: cameraTrackRef.current,
      screenStream: screenStreamRef.current,
      peerConnections: peerConnections.current,
      // NOTE: socket is NOT passed here — the signaling useEffect cleanup
      // removes listeners by specific handler reference, which is safer than
      // the blanket socket.off() in cleanupMediaAndPeers.
    });

    localStreamRef.current = null;
    cameraTrackRef.current = null;
    screenStreamRef.current = null;
    peerConnections.current = {};
    pendingIceCandidates.current = {};

    setLocalStream(null);
    setRemoteStreams({});
    setIsScreenSharing(false);
  }, []);

  // WebRTC & Media Initialization with unmount track termination
  useEffect(() => {
    let isCancelled = false;
    isCleanedUpRef.current = false;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isCancelled) {
          // Component unmounted while getUserMedia was resolving; stop tracks immediately
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log('[WebRTC DEBUG] Local getUserMedia successful. Tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.id}`));
        localStreamRef.current = stream;
        setLocalStream(stream);
        cameraTrackRef.current = stream.getVideoTracks()[0];
      } catch (err) {
        if (isCancelled) return;
        console.warn('[WebRTC DEBUG] Camera/Mic access denied or unavailable:', err.message);
        // Fallback dummy audio/video stream for dev
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 480);
        const dummyStream = canvas.captureStream(10);
        console.log('[WebRTC DEBUG] Fallback dummy stream created. Tracks:', dummyStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
        localStreamRef.current = dummyStream;
        setLocalStream(dummyStream);
      }
    };

    startMedia();

    // Browser tab close / refresh cleanup
    const handleBeforeUnload = () => {
      cleanupMeetingSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanupMeetingSession();
    };
  }, [cleanupMeetingSession]);

  // Create WebRTC PeerConnection (no signaling — caller decides when to offer)
  // Attach local media tracks to any already‑created peer connections
  useEffect(() => {
    if (!localStream) return;
    console.log('[WebRTC DEBUG] localStream state updated. Attaching tracks to all peer connections:', Object.keys(peerConnections.current));
    Object.entries(peerConnections.current).forEach(([peerId, pc]) => {
      const existingIds = new Set(
        pc.getSenders()
          .filter((s) => s.track)
          .map((s) => s.track.id)
      );
      localStream.getTracks().forEach((track) => {
        if (!existingIds.has(track.id)) {
          try {
            console.log(`[WebRTC DEBUG] Adding track ${track.kind} (${track.id}) to peer ${peerId}`);
            pc.addTrack(track, localStream);
          } catch (e) {
            console.warn('[WebRTC DEBUG] Failed to add track after stream start:', e);
          }
        }
      });
    });
  }, [localStream]);


  const createPeerConnection = useCallback((targetSocketId, userName, userId) => {
    // If there's already a live connection, return it
    if (peerConnections.current[targetSocketId]) {
      return peerConnections.current[targetSocketId];
    }

    console.log(`[WebRTC DEBUG] Creating RTCPeerConnection for targetSocketId=${targetSocketId} (${userName || 'Guest'})`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    peerConnections.current[targetSocketId] = pc;
    pendingIceCandidates.current[targetSocketId] = [];

    // Track state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC DEBUG] Peer ${targetSocketId} iceConnectionState -> ${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC DEBUG] Peer ${targetSocketId} connectionState -> ${pc.connectionState}`);
    };
    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC DEBUG] Peer ${targetSocketId} signalingState -> ${pc.signalingState}`);
    };

    // Add local tracks to peer connection
    const stream = localStreamRef.current;
    if (stream) {
      console.log(`[WebRTC DEBUG] Adding ${stream.getTracks().length} tracks from localStreamRef to peer ${targetSocketId}`);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } else {
      console.warn(`[WebRTC DEBUG] localStreamRef is not available when creating PC for ${targetSocketId}`);
    }

    // Handle incoming remote tracks
    pc.ontrack = (e) => {
      // Use existing remote stream for this socket or create new MediaStream
      const existingStream = remoteStreamsRef.current[targetSocketId]?.stream;
      let remoteStream;

      if (e.streams && e.streams[0]) {
        remoteStream = e.streams[0];
      } else if (existingStream) {
        if (!existingStream.getTracks().some((t) => t.id === e.track.id)) {
          existingStream.addTrack(e.track);
        }
        remoteStream = existingStream;
      } else {
        remoteStream = new MediaStream([e.track]);
      }

      console.log(`[WebRTC DEBUG] ontrack from ${targetSocketId} – kind=${e.track.kind}, id=${e.track.id}, totalTracks=${remoteStream.getTracks().length}`);
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: {
          ...(prev[targetSocketId] || {}),
          stream: remoteStream,
          userName: userName || prev[targetSocketId]?.userName || 'Participant',
          userId: userId || prev[targetSocketId]?.userId,
          muted: prev[targetSocketId]?.muted ?? false,
          videoOff: prev[targetSocketId]?.videoOff ?? false,
        },
      }));
      // Update participants list in RTC context
      addRemoteParticipant(targetSocketId, userName || 'Participant', remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        console.log(`[WebRTC DEBUG] Local ICE candidate generated for ${targetSocketId}`);
        socket.emit('ice-candidate', {
          target: targetSocketId,
          candidate: e.candidate,
        });
      }
    };

    // Handle negotiation needed (fires when tracks are added after initial setup)
    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') {
          console.log(`[WebRTC DEBUG] negotiationneeded skipped for ${targetSocketId} because signalingState is ${pc.signalingState}`);
          return;
        }
        console.log(`[WebRTC DEBUG] negotiationneeded triggered for ${targetSocketId}. Creating offer...`);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {
          target: targetSocketId,
          caller: { userId: user?._id, userName: user?.name },
          offer,
        });
      } catch (err) {
        console.error(`[WebRTC DEBUG] Error in onnegotiationneeded for ${targetSocketId}:`, err);
      }
    };

    return pc;
  }, [socket, addRemoteParticipant, user?._id, user?.name]);

  // Helper: flush queued ICE candidates after remote description is set
  const flushIceQueue = useCallback(async (socketId, pc) => {
    const queue = pendingIceCandidates.current[socketId];
    if (!queue) return;
    while (queue.length) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Error flushing queued ICE candidate:', e);
      }
    }
  }, []);

  // WebSockets & WebRTC Signaling Setup (single source of truth)
  useEffect(() => {
    if (!socket || !code || !user) return;

    console.log('[MeetingRoom] Setting up signaling listeners for meeting', code.toUpperCase());

    // ---------- existing-participants: create PCs and send offers ----------
    const handleExistingParticipants = async ({ participants }) => {
      console.log('[WebRTC DEBUG] existing-participants received:', participants);
      for (const { socketId: remoteId, userId: uid, userName: uname } of participants) {
        if (peerConnections.current[remoteId]) {
          console.log(`[WebRTC DEBUG] Peer connection already exists for ${remoteId}, skipping existing-participants offer`);
          continue;
        }
        const pc = createPeerConnection(remoteId, uname, uid);
        // Add placeholder entry for participant even before media arrives
        setRemoteStreams((prev) => ({
          ...prev,
          [remoteId]: {
            stream: null,
            userName: uname || 'Participant',
            userId: uid,
            muted: false,
            videoOff: false,
          },
        }));
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log(`[WebRTC DEBUG] Sending offer to existing participant ${remoteId}`);
          socket.emit('offer', {
            target: remoteId,
            caller: { userId: user._id, userName: user.name },
            offer,
          });
        } catch (err) {
          console.error(`[WebRTC DEBUG] Error creating offer for ${remoteId}:`, err);
        }
      }
    };

    // ---------- user-joined: a new peer entered ----------
    const handleUserJoined = async ({ socketId, userId: uid, userName: uname }) => {
      console.log('[WebRTC DEBUG] user-joined received:', socketId, uid, uname);
      // Add placeholder entry for the new participant so UI updates immediately
      setRemoteStreams((prev) => ({
        ...prev,
        [socketId]: {
          stream: null,
          userName: uname || 'Participant',
          userId: uid,
          muted: false,
          videoOff: false,
        },
      }));
      // Pre-create peer connection so it's ready when the offer arrives.
      // Notice: The newcomer who received 'existing-participants' creates the offer.
      // Existing peers DO NOT send a simultaneous offer here to avoid offer collisions/glare!
      if (!peerConnections.current[socketId]) {
        console.log(`[WebRTC DEBUG] Pre-creating peer connection for joining peer ${socketId}`);
        createPeerConnection(socketId, uname, uid);
      }
    };

    // ---------- offer (with glare / simultaneous-offer resolution) ----------
    const handleOffer = async ({ socketId, offer, caller }) => {
      console.log(`[WebRTC DEBUG] Received offer from ${socketId} (caller=${caller?.userName || 'unknown'})`);
      let pc = peerConnections.current[socketId];

      // Glare resolution: if we already sent an offer (have-local-offer),
      // use "polite peer" pattern: the peer with the higher socket.id yields.
      if (pc && pc.signalingState === 'have-local-offer') {
        const weArePolite = socket.id > socketId; // higher id = polite = yields
        if (weArePolite) {
          // Roll back our own offer and accept theirs
          console.log(`[WebRTC DEBUG] Glare detected – rolling back our offer for ${socketId}`);
          await pc.setLocalDescription({ type: 'rollback' });
        } else {
          // We are impolite – ignore the incoming offer; our offer wins
          console.log(`[WebRTC DEBUG] Glare detected – ignoring remote offer from ${socketId}`);
          return;
        }
      }

      if (!pc) {
        console.log(`[WebRTC DEBUG] Creating peer connection on-demand for incoming offer from ${socketId}`);
        pc = createPeerConnection(socketId, caller?.userName, caller?.userId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`[WebRTC DEBUG] Set remote description (offer) for ${socketId}`);
        await flushIceQueue(socketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[WebRTC DEBUG] Created and set local description (answer), sending to ${socketId}`);
        socket.emit('answer', {
          target: socketId,
          caller: { userId: user?._id, userName: user?.name },
          answer,
        });
      } catch (err) {
        console.error(`[WebRTC DEBUG] Error handling offer from ${socketId}:`, err);
      }
    };

    // ---------- answer (guarded against duplicate / stale answers) ----------
    const handleAnswer = async ({ socketId, answer }) => {
      console.log(`[WebRTC DEBUG] Received answer from ${socketId}`);
      const pc = peerConnections.current[socketId];
      if (!pc) {
        console.warn(`[WebRTC DEBUG] Received answer but no peer connection for ${socketId}`);
        return;
      }
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(
          `[WebRTC DEBUG] Ignoring stale/duplicate answer from ${socketId} (signalingState=${pc.signalingState})`
        );
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`[WebRTC DEBUG] Set remote description (answer) for ${socketId}`);
        await flushIceQueue(socketId, pc);
      } catch (err) {
        console.error(`[WebRTC DEBUG] Error setting remote answer from ${socketId}:`, err);
      }
    };

    // ---------- ice-candidate (queue if remote description not yet set) ----------
    const handleIceCandidate = async ({ socketId, candidate }) => {
      const pc = peerConnections.current[socketId];
      if (!pc) return;
      if (!pc.remoteDescription) {
        console.log(`[WebRTC DEBUG] Queuing ICE candidate from ${socketId} (remoteDescription not set yet)`);
        // Queue it — will be flushed after setRemoteDescription
        if (!pendingIceCandidates.current[socketId]) {
          pendingIceCandidates.current[socketId] = [];
        }
        pendingIceCandidates.current[socketId].push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[WebRTC DEBUG] Successfully added ICE candidate from ${socketId}`);
      } catch (err) {
        console.warn(`[WebRTC DEBUG] Error adding ICE candidate from ${socketId}:`, err);
      }
    };

    // ---------- user-left ----------
    const handleUserLeft = ({ socketId }) => {
      const pc = peerConnections.current[socketId];
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
        delete peerConnections.current[socketId];
        delete pendingIceCandidates.current[socketId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    // ---------- media toggle relays ----------
    const handleUserToggledAudio = ({ socketId, muted }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return { ...prev, [socketId]: { ...prev[socketId], muted } };
      });
    };

    const handleUserToggledVideo = ({ socketId, videoOff }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return { ...prev, [socketId]: { ...prev[socketId], videoOff } };
      });
    };

    // ---------- host ended meeting ----------
    const handleMeetingEnded = () => {
      cleanupMeetingSession();
      navigate('/meetings');
    };

    // ---------- live transcript entry ----------
    const handleNewTranscriptEntry = (entry) => {
      if (!entry || !entry.text) return;
      setLiveTranscript((prev) => {
        const exists = prev.some(
          (e) =>
            e.speaker === entry.speaker &&
            e.text.trim().toLowerCase() === entry.text.trim().toLowerCase() &&
            e.timestamp === entry.timestamp
        );
        if (exists) return prev;
        return [...prev, entry];
      });
    };

    // Register all listeners BEFORE emitting join-meeting to avoid race conditions
    socket.on('existing-participants', handleExistingParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    socket.on('user-toggled-audio', handleUserToggledAudio);
    socket.on('user-toggled-video', handleUserToggledVideo);
    socket.on('meeting-ended-by-host', handleMeetingEnded);
    socket.on('new-transcript-entry', handleNewTranscriptEntry);

    // NOW emit join event (listeners are ready to receive the server's response)
    console.log('[MeetingRoom] Joining meeting', code.toUpperCase(), 'as user', user._id, user.name);
    socket.emit('join-meeting', {
      meetingCode: code.toUpperCase(),
      userId: user._id,
      userName: user.name,
    });

    // Cleanup on unmount or dependency change
    return () => {
      socket.emit('leave-meeting');
      socket.off('existing-participants', handleExistingParticipants);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      socket.off('user-toggled-audio', handleUserToggledAudio);
      socket.off('user-toggled-video', handleUserToggledVideo);
      socket.off('meeting-ended-by-host', handleMeetingEnded);
      socket.off('new-transcript-entry', handleNewTranscriptEntry);
    };
  }, [socket, code, user, createPeerConnection, flushIceQueue, cleanupMeetingSession, navigate]);

  // Toggle Microphone
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextMuted = !audioTrack.enabled;
        setIsMuted(nextMuted);
        if (socket) {
          socket.emit('toggle-audio', {
            meetingCode: code.toUpperCase(),
            userId: user._id,
            muted: nextMuted,
          });
        }
      }
    }
  };

  // Toggle Camera (enhanced)
  const toggleVideo = async () => {
    if (isAcquiringVideo) return;
    if (!localStreamRef.current) return;
    const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];

    // Turning camera ON
    if (isVideoOff) {
      setIsAcquiringVideo(true);
      try {
        let newVideoTrack = currentVideoTrack;
        if (!currentVideoTrack || currentVideoTrack.readyState === 'ended') {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          newVideoTrack = newStream.getVideoTracks()[0];
        } else {
          newVideoTrack.enabled = true;
        }

        // Preserve existing audio tracks
        const audioTracks = localStreamRef.current.getAudioTracks();
        const combinedStream = new MediaStream([...audioTracks, newVideoTrack]);

        // Update refs and state
        cameraTrackRef.current = newVideoTrack;
        localStreamRef.current = combinedStream;
        setLocalStream(combinedStream);
        setIsVideoOff(false);
        setCameraError('');

        // Replace video track in all peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        });

        if (socket) {
          socket.emit('toggle-video', { meetingCode: code.toUpperCase(), userId: user._id, videoOff: false });
        }
      } catch (err) {
        console.error('[Camera ON error]', err);
        setCameraError(err.message || 'Failed to enable camera');
      } finally {
        setIsAcquiringVideo(false);
      }
      return;
    }

    // Turning camera OFF
    if (currentVideoTrack) {
      try {
        currentVideoTrack.stop();
      } catch (e) {
        console.warn('Error stopping video track:', e);
      }
    }
    setIsVideoOff(true);
    setCameraError('');
    if (socket) {
      socket.emit('toggle-video', { meetingCode: code.toUpperCase(), userId: user._id, videoOff: true });
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop Screen Share -> Restore Camera Track
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            console.warn('Error stopping screen track:', err);
          }
        });
        screenStreamRef.current = null;
      }

      if (cameraTrackRef.current && localStreamRef.current) {
        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack && currentVideoTrack !== cameraTrackRef.current) {
          try {
            currentVideoTrack.stop();
          } catch (err) {
            console.warn(err);
          }
          localStreamRef.current.removeTrack(currentVideoTrack);
        }

        if (!localStreamRef.current.getVideoTracks().includes(cameraTrackRef.current)) {
          localStreamRef.current.addTrack(cameraTrackRef.current);
        }

        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrackRef.current);
        });
      }

      setIsScreenSharing(false);
      if (socket) {
        socket.emit('screen-share-stopped', { meetingCode: code.toUpperCase(), userId: user._id });
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track across peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
          }
          if (cameraTrackRef.current && localStreamRef.current) {
            const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (currentVideoTrack && currentVideoTrack !== cameraTrackRef.current) {
              currentVideoTrack.stop();
              localStreamRef.current.removeTrack(currentVideoTrack);
            }
            if (!localStreamRef.current.getVideoTracks().includes(cameraTrackRef.current)) {
              localStreamRef.current.addTrack(cameraTrackRef.current);
            }
            Object.values(peerConnections.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
              if (sender) sender.replaceTrack(cameraTrackRef.current);
            });
          }
          setIsScreenSharing(false);
          if (socket) {
            socket.emit('screen-share-stopped', { meetingCode: code.toUpperCase(), userId: user._id });
          }
        };

        setIsScreenSharing(true);
        if (socket) {
          socket.emit('screen-share-started', { meetingCode: code.toUpperCase(), userId: user._id });
        }
      } catch (err) {
        console.error('[Screen Share Error]', err.message);
      }
    }
  };

  // Leave Meeting Room (participant or host leaves room, meeting continues for others)
  const leaveMeetingRoom = () => {
    cleanupMeetingSession();
    navigate('/meetings');
  };

  // Host End Meeting for Everyone (host terminates meeting, triggers AI summary)
  const endMeetingForEveryone = async () => {
    if (!window.confirm('Are you sure you want to end this meeting for all participants? AI Summary will be generated.')) return;

    try {
      if (socket) {
        socket.emit('end-meeting', { meetingCode: code.toUpperCase() });
      }

      const meetingId = meeting?._id;
      // Immediately stop all local camera and microphone tracks
      cleanupMeetingSession();

      if (meetingId) {
        const finalTranscript = (liveTranscriptRef.current || liveTranscript).filter(
          (t) => t && typeof t.text === 'string' && t.text.trim().length > 0
        );

        if (finalTranscript.length === 0) {
          toast('Meeting ended with no speech transcribed.', { icon: 'ℹ️' });
        }

        await meetingService.endMeeting(meetingId, {
          transcript: finalTranscript,
        });
        navigate(`/meetings/${meetingId}`);
      } else {
        navigate('/meetings');
      }
    } catch (err) {
      console.error('[End Meeting Error]', err);
      cleanupMeetingSession();
      navigate('/meetings');
    }
  };

  const isHost = meeting?.host?._id === user?._id || meeting?.host === user?._id;
  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col z-50 overflow-hidden font-sans">
      {/* Top Meeting Header */}
      <header className="h-16 bg-slate-900/90 border-b border-slate-800/80 px-6 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h2 className="text-sm font-bold text-white line-clamp-1">
              {meeting?.title || 'Live IntellMeet Video Room'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Code: {code}</span>
              <span>•</span>
              {transcriptionStatus === 'speaking' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-semibold text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Speaking
                </span>
              ) : transcriptionStatus === 'muted' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans font-semibold text-[10px]">
                  <MicOff className="w-2.5 h-2.5" /> Mic Muted
                </span>
              ) : transcriptionStatus === 'unsupported' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-sans font-semibold text-[10px]">
                  <AlertCircle className="w-2.5 h-2.5" /> STT Not Supported
                </span>
              ) : transcriptionStatus === 'error' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans font-semibold text-[10px]">
                  <AlertCircle className="w-2.5 h-2.5" /> STT Error
                </span>
              ) : !isTranscriptionEnabled || transcriptionStatus === 'stopped' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-sans font-semibold text-[10px]">
                  Transcription Off
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-sans font-semibold text-[10px]">
                  <Sparkles className="w-2.5 h-2.5" /> Live Transcribing
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowParticipants(false);
              setShowChat(false);
              setShowTranscript(!showTranscript);
            }}
            className={`p-2.5 rounded-xl border transition-colors relative ${
              showTranscript
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-750'
            }`}
            title="Toggle Live Transcript"
          >
            <FileText className="w-4 h-4" />
            {liveTranscript.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {liveTranscript.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowParticipants(false);
              setShowTranscript(false);
              setShowChat(!showChat);
            }}
            className={`p-2.5 rounded-xl border transition-colors relative ${
              showChat ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-750'
            }`}
            title="Toggle Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setShowChat(false);
              setShowTranscript(false);
              setShowParticipants(!showParticipants);
            }}
            className={`p-2.5 rounded-xl border transition-colors relative ${
              showParticipants ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-750'
            }`}
            title="Toggle Participants"
          >
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {remoteEntries.length + 1}
            </span>
          </button>
        </div>
      </header>

      {/* Main Room Body Grid */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-4">
        {/* Video Grid Area */}
        <div className="flex-1 relative flex flex-col min-w-0">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-full items-center justify-center">
            {/* Local User Tile */}
            <VideoTile
              stream={localStream}
              userName={user?.name || 'You'}
              isLocal
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
            />

            {/* Remote Participants Tiles */}
            {remoteEntries.map(([socketId, remoteData]) => (
              <VideoTile
                key={socketId}
                stream={remoteData.stream}
                userName={remoteData.userName}
                isMuted={remoteData.muted}
                isVideoOff={remoteData.videoOff}
              />
            ))}
          </div>

          {/* Floating Live Speech Subtitle Caption Banner */}
          {interimTranscript && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[90%] bg-slate-950/90 backdrop-blur-md border border-brand-500/40 rounded-2xl px-5 py-3 shadow-2xl z-20 pointer-events-none transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs font-bold text-brand-300">
                  {user?.name || 'You'} (Speaking):
                </span>
              </div>
              <p className="text-sm font-medium text-slate-100 tracking-wide line-clamp-3">
                {interimTranscript}
              </p>
            </div>
          )}
        </div>

        {/* Side Panels Drawers */}
        {showTranscript && (
          <TranscriptPanel
            liveTranscript={liveTranscript}
            interimText={interimTranscript}
            status={transcriptionStatus}
            error={transcriptionError}
            isMuted={isMuted}
            isEnabled={isTranscriptionEnabled}
            onToggleEnable={toggleTranscription}
            onClose={() => setShowTranscript(false)}
          />
        )}

        {showChat && (
          <ChatPanel
            meetingId={meeting?._id}
            meetingCode={code}
            onClose={() => setShowChat(false)}
          />
        )}

        {showParticipants && (
          <ParticipantsPanel
            participants={[
              { socketId: 'local', userId: user?._id, userName: user?.name, isHost, muted: isMuted, videoOff: isVideoOff },
              ...remoteEntries.map(([sId, r]) => ({
                socketId: sId,
                userId: r.userId,
                userName: r.userName,
                muted: r.muted,
                videoOff: r.videoOff,
              })),
            ]}
            isHost={isHost}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      {/* Bottom Floating Meeting Controls Bar */}
      <footer className="h-20 bg-slate-900/90 border-t border-slate-800/80 px-6 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Encrypted WebRTC Stream</span>
        </div>

        {/* Core Media Controls */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl border transition-all shadow-lg ${
              isMuted
                ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 border-slate-700/80 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl border transition-all shadow-lg ${
              isVideoOff
                ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 border-slate-700/80 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>
            {cameraError && <p className="text-rose-500 mt-2 text-sm">{cameraError}</p>}

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl border transition-all shadow-lg ${
              isScreenSharing
                ? 'bg-brand-600 border-brand-500 text-white shadow-brand-600/30'
                : 'bg-slate-800 border-slate-700/80 text-slate-200 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              setShowChat(false);
              setShowParticipants(false);
              setShowTranscript(!showTranscript);
            }}
            className={`p-3.5 rounded-2xl border transition-all shadow-lg relative ${
              showTranscript
                ? 'bg-brand-600 border-brand-500 text-white shadow-brand-600/30'
                : 'bg-slate-800 border-slate-700/80 text-slate-200 hover:bg-slate-700'
            }`}
            title={showTranscript ? 'Hide Live Transcript' : 'Show Live Transcript'}
          >
            <FileText className="w-5 h-5" />
            {liveTranscript.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                {liveTranscript.length}
              </span>
            )}
          </button>

          {/* Leave / End Buttons */}
          {isHost ? (
            <div className="flex items-center gap-2">
              <button
                onClick={leaveMeetingRoom}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 shadow-md flex items-center gap-1.5 transition-colors"
                title="Leave meeting without ending it for others"
              >
                <PhoneOff className="w-4 h-4 text-amber-400" />
                <span>Leave</span>
              </button>
              <button
                onClick={endMeetingForEveryone}
                className="px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-colors"
                title="End meeting for all participants & generate AI summary"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End for All</span>
              </button>
            </div>
          ) : (
            <button
              onClick={leaveMeetingRoom}
              className="px-5 py-3 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-colors"
              title="Leave meeting"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Leave</span>
            </button>
          )}
        </div>

        <div className="hidden sm:block" />
      </footer>
    </div>
  );
};
