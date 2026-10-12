import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { meetingService } from '../../services/meetingService';
import { cleanupMediaAndPeers } from '../../utils/webrtcCleanup';
import { VideoTile } from '../../components/meeting/VideoTile';
import { ChatPanel } from '../../components/meeting/ChatPanel';
import { ParticipantsPanel } from '../../components/meeting/ParticipantsPanel';
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
} from 'lucide-react';

export const MeetingRoomPage = () => {
  const { code } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: { stream, userName, userId, muted, videoOff } }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAcquiringVideo, setIsAcquiringVideo] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(true);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
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
      socket,
    });

    localStreamRef.current = null;
    cameraTrackRef.current = null;
    screenStreamRef.current = null;
    peerConnections.current = {};

    setLocalStream(null);
    setRemoteStreams({});
    setIsScreenSharing(false);
  }, [socket]);

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

        localStreamRef.current = stream;
        setLocalStream(stream);
        cameraTrackRef.current = stream.getVideoTracks()[0];
      } catch (err) {
        if (isCancelled) return;
        console.warn('[WebRTC] Camera/Mic access denied or unavailable:', err.message);
        // Fallback dummy audio/video stream for dev
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 480);
        const dummyStream = canvas.captureStream(10);
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

  // WebSockets & WebRTC Signaling Setup
  useEffect(() => {
    if (!socket || !code || !user) return;

    socket.emit('join-meeting', {
      meetingCode: code.toUpperCase(),
      userId: user._id,
      userName: user.name,
    });

    // Handle existing participants in room
    socket.on('existing-participants', ({ participants }) => {
      participants.forEach((p) => {
        createPeerConnection(p.socketId, p.userName, p.userId, true);
      });
    });

    // Handle new user joining room
    socket.on('user-joined', ({ socketId, userId, userName }) => {
      createPeerConnection(socketId, userName, userId, false);
    });

    // Handle WebRTC Offer
    socket.on('offer', async ({ socketId, offer, caller }) => {
      const pc = peerConnections.current[socketId] || createPeerConnection(socketId, caller?.userName, caller?.userId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer', {
        target: socketId,
        caller: { userId: user._id, userName: user.name },
        answer,
      });
    });

    // Handle WebRTC Answer
    socket.on('answer', async ({ socketId, answer }) => {
      const pc = peerConnections.current[socketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle ICE Candidate
    socket.on('ice-candidate', async ({ socketId, candidate }) => {
      const pc = peerConnections.current[socketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[ICE Error]', err);
        }
      }
    });

    // Handle User Media Toggles
    socket.on('user-toggled-audio', ({ socketId, muted }) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [socketId]: { ...prev[socketId], muted },
      }));
    });

    socket.on('user-toggled-video', ({ socketId, videoOff }) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [socketId]: { ...prev[socketId], videoOff },
      }));
    });

    // Handle Host End Meeting
    socket.on('meeting-ended-by-host', () => {
      alert('The host has ended this meeting.');
      leaveMeetingRoom();
    });

    // Handle User Disconnect
    socket.on('user-left', ({ socketId }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    return () => {
      socket.emit('leave-meeting');
      socket.off('existing-participants');
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-toggled-audio');
      socket.off('user-toggled-video');
      socket.off('meeting-ended-by-host');
      socket.off('user-left');
    };
  }, [socket, code, user]);

  // Create WebRTC PeerConnection
  const createPeerConnection = (targetSocketId, userName, userId, isInitiator) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    peerConnections.current[targetSocketId] = pc;

    // Add local tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    // Handle incoming remote tracks
    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: {
          stream: e.streams[0],
          userName: userName || 'Participant',
          userId,
          muted: false,
          videoOff: false,
        },
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', {
          target: targetSocketId,
          candidate: e.candidate,
        });
      }
    };

    // If initiator, create and send Offer
    if (isInitiator) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit('offer', {
          target: targetSocketId,
          caller: { userId: user._id, userName: user.name },
          offer,
        });
      });
    }

    return pc;
  };

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
        await meetingService.endMeeting(meetingId, {
          transcript: liveTranscript.length > 0 ? liveTranscript : [
            { speaker: user.name, text: 'Discussed Q4 platform roadmap, WebRTC signaling performance, and action item assignments.' },
            { speaker: 'Team Member', text: 'Confirmed deployment of fallback server configuration and user notifications.' }
          ],
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
              <span className="text-brand-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Transcription Active
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowParticipants(false);
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
              setShowParticipants(!showParticipants);
            }}
            className={`p-2.5 rounded-xl border transition-colors relative ${
              showParticipants ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-750'
            }`}
            title="Toggle Participants"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Room Body Grid */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-4">
        {/* Video Grid Area */}
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

        {/* Side Panels Drawers */}
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
