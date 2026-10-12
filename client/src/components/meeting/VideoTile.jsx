import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, User } from 'lucide-react';

export const VideoTile = ({
  stream,
  userName = 'Participant',
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="relative w-full h-full min-h-[220px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex items-center justify-center group">
      {/* Video Element */}
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video element to avoid audio feedback
          className={`w-full h-full object-cover ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Video Off Fallback Avatar */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 to-purple-600 border-2 border-slate-700 flex items-center justify-center text-2xl font-bold text-white shadow-xl animate-pulse">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-300">{userName} {isLocal && '(You)'}</span>
        </div>
      )}

      {/* Screen Sharing Badge Overlay */}
      {isScreenSharing && (
        <div className="absolute top-3 left-3 bg-brand-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md shadow-md">
          <Monitor className="w-3.5 h-3.5" />
          <span>Screen Share</span>
        </div>
      )}

      {/* Bottom Control Overlay Pill */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80 flex items-center gap-2 max-w-[80%]">
          <span className="text-xs font-bold text-slate-200 truncate">
            {userName} {isLocal && '(You)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-800/80">
          {isMuted ? (
            <MicOff className="w-4 h-4 text-rose-400" />
          ) : (
            <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
          )}
          {isVideoOff ? (
            <VideoOff className="w-4 h-4 text-rose-400" />
          ) : (
            <Video className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>
    </div>
  );
};
