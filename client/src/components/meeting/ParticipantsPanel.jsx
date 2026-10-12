import React from 'react';
import { Users, X, Mic, MicOff, Video, VideoOff, Crown, UserX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ParticipantsPanel = ({
  participants = [],
  isHost = false,
  onClose,
  onMuteParticipant,
  onRemoveParticipant,
}) => {
  const { user } = useAuth();

  return (
    <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-slideLeft">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-100">
            Participants ({participants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {participants.map((p) => {
          const isSelf = p.userId === user?._id || p.socketId === 'local';
          return (
            <div
              key={p.socketId || p.userId}
              className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                  {p.userName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-slate-200">
                      {p.userName} {isSelf && '(You)'}
                    </h5>
                    {p.isHost && (
                      <Crown className="w-3.5 h-3.5 text-amber-400" title="Host" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {p.isHost ? 'Host' : 'Participant'}
                  </span>
                </div>
              </div>

              {/* Media Controls */}
              <div className="flex items-center gap-1">
                {p.muted ? (
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {p.videoOff ? (
                  <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                )}

                {isHost && !isSelf && (
                  <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
                    <button
                      onClick={() => onMuteParticipant && onMuteParticipant(p.socketId)}
                      className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded"
                      title="Mute User"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveParticipant && onRemoveParticipant(p.socketId)}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded"
                      title="Remove User"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
