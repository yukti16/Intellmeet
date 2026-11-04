import React, { useRef, useEffect } from 'react';
import {
  FileText,
  X,
  Sparkles,
  Mic,
  MicOff,
  AlertCircle,
  Clock,
  Play,
  Square,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const TranscriptPanel = ({
  liveTranscript = [],
  interimText = '',
  status = 'active',
  error = null,
  isMuted = false,
  isEnabled = true,
  onToggleEnable = null,
  onClose,
}) => {
  const { user } = useAuth();
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript, interimText]);

  return (
    <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-20 shadow-2xl animate-slideLeft">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Live Transcript ({liveTranscript.length})
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {onToggleEnable && (
            <button
              onClick={onToggleEnable}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors flex items-center gap-1 ${
                isEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-brand-600 hover:bg-brand-500 text-white border-brand-500'
              }`}
              title={isEnabled ? 'Pause speech transcription' : 'Resume speech transcription'}
            >
              {isEnabled ? (
                <>
                  <Square className="w-3 h-3 text-amber-400" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-400" /> Resume
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Transcript Panel"
            aria-label="Close Transcript Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Status Badge Banner */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 text-xs">
        {status === 'speaking' && (
          <div className="flex items-center gap-2 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping flex-shrink-0" />
            <span className="font-semibold">Transcribing speech in real-time...</span>
          </div>
        )}
        {status === 'active' && (
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="font-semibold">Listening (Transcription Active)</span>
          </div>
        )}
        {status === 'muted' && (
          <div className="flex items-center gap-2 text-amber-400">
            <MicOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Microphone muted — recognition paused</span>
          </div>
        )}
        {status === 'starting' && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse flex-shrink-0" />
            <span>Initializing speech recognition engine...</span>
          </div>
        )}
        {status === 'stopped' && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span>Transcription paused by user</span>
          </div>
        )}
        {status === 'unsupported' && (
          <div className="flex items-start gap-2 text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-rose-400 flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold block">Transcription Unavailable</span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
              </span>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-rose-400 flex-shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold block">Recognition Error</span>
              <span className="text-[11px] text-slate-400 leading-tight block">
                {error || 'Microphone or recognition permission issue.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Log Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {liveTranscript.length === 0 && !interimText ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-brand-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-300">No Speech Transcribed Yet</h5>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Speak naturally during the meeting. Real-time utterances will appear here and feed into the post-meeting AI summary and action item extractor.
              </p>
            </div>
          </div>
        ) : (
          <>
            {liveTranscript.map((entry, idx) => {
              const isCurrentUser =
                entry.speaker === user?.name || entry.speaker === 'You';
              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 animate-fadeIn"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className={
                          isCurrentUser ? 'text-brand-400' : 'text-purple-400'
                        }
                      >
                        {entry.speaker}
                      </span>
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.2 text-[9px] bg-brand-500/10 text-brand-400 rounded border border-brand-500/20 font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed break-words">
                    {entry.text}
                  </p>
                </div>
              );
            })}

            {/* Active Interim Speech Bubble */}
            {interimText && (
              <div className="p-3 bg-brand-950/30 border border-brand-800/50 rounded-xl space-y-1.5 animate-pulse">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-brand-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping" />
                    <span>{user?.name || 'You'} (Speaking...)</span>
                  </div>
                </div>
                <p className="text-xs text-brand-200 italic leading-relaxed break-words">
                  {interimText}
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Auto-saved to Meeting Summary</span>
        <span className="font-mono">{liveTranscript.length} entries</span>
      </div>
    </div>
  );
};
