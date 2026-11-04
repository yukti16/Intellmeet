import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeechRecognition = ({
  meetingCode,
  speakerName = 'You',
  isMuted = false,
  socket = null,
  onTranscriptEntry = null,
  autoStart = true,
}) => {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = Boolean(SpeechRecognition);

  const [isEnabled, setIsEnabled] = useState(autoStart && isSupported);
  const [status, setStatus] = useState(() => {
    if (!isSupported) return 'unsupported';
    if (isMuted) return 'muted';
    return isEnabled ? 'starting' : 'stopped';
  });
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(() =>
    isSupported
      ? null
      : 'Speech recognition is not supported in this browser. For live speech transcription, please use Google Chrome, Microsoft Edge, or Apple Safari.'
  );

  const recognitionRef = useRef(null);
  const isStartedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  const isEnabledRef = useRef(isEnabled);
  const isDestroyedRef = useRef(false);
  const restartTimerRef = useRef(null);
  const speakerNameRef = useRef(speakerName);
  const meetingCodeRef = useRef(meetingCode);
  const socketRef = useRef(socket);
  const onTranscriptEntryRef = useRef(onTranscriptEntry);
  const lastFinalTextRef = useRef('');
  const lastFinalTimeRef = useRef(0);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    speakerNameRef.current = speakerName;
  }, [speakerName]);

  useEffect(() => {
    meetingCodeRef.current = meetingCode;
  }, [meetingCode]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    onTranscriptEntryRef.current = onTranscriptEntry;
  }, [onTranscriptEntry]);

  // Safe starter with state checks
  const startRecognition = useCallback(() => {
    if (!SpeechRecognition || isDestroyedRef.current || !isEnabledRef.current || isMutedRef.current) {
      return;
    }
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (!isStartedRef.current) {
      try {
        recognition.start();
        isStartedRef.current = true;
        setStatus('active');
        setError(null);
      } catch (err) {
        // If already started, ignore InvalidStateError
        if (err.name !== 'InvalidStateError') {
          console.warn('[SpeechRecognition] Start error:', err);
        }
      }
    }
  }, [SpeechRecognition]);

  // Safe stopper
  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    if (recognition && isStartedRef.current) {
      try {
        recognition.stop();
      } catch (err) {
        // ignore
      }
      isStartedRef.current = false;
    }
    setInterimTranscript('');
  }, []);

  // Initialize SpeechRecognition instance once
  useEffect(() => {
    if (!SpeechRecognition) {
      setStatus('unsupported');
      setError(
        'Speech recognition is not supported in this browser. For live speech transcription, please use Google Chrome, Microsoft Edge, or Apple Safari.'
      );
      return;
    }

    isDestroyedRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isStartedRef.current = true;
      setStatus(isMutedRef.current ? 'muted' : 'active');
      setError(null);
    };

    recognition.onresult = (event) => {
      if (isMutedRef.current) {
        setInterimTranscript('');
        return;
      }

      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const textChunk = result[0]?.transcript || '';

        if (result.isFinal) {
          const cleanText = textChunk.trim();
          if (cleanText) {
            const timestamp = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const newEntry = {
              speaker: speakerNameRef.current || 'Participant',
              text: cleanText,
              timestamp,
            };

            // Emit via socket to all participants in meeting
            if (socketRef.current && meetingCodeRef.current) {
              socketRef.current.emit('transcript-entry', {
                meetingCode: meetingCodeRef.current,
                entry: newEntry,
              });
            }

            // Local fallback callback
            if (onTranscriptEntryRef.current) {
              onTranscriptEntryRef.current(newEntry);
            }
          }
        } else {
          currentInterim += textChunk;
        }
      }

      if (currentInterim.trim()) {
        setStatus('speaking');
        setInterimTranscript(currentInterim);
      } else {
        setInterimTranscript('');
        setStatus(isMutedRef.current ? 'muted' : 'active');
      }
    };

    recognition.onerror = (event) => {
      console.warn('[SpeechRecognition Event Error]', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission denied for speech recognition. Please allow microphone access.');
        setStatus('error');
        isStartedRef.current = false;
      } else if (event.error === 'no-speech') {
        // Normal silence timeout; Chrome onend will trigger automatically
        setInterimTranscript('');
      } else if (event.error === 'audio-capture') {
        setError('No microphone was detected or microphone is currently busy.');
        setStatus('error');
        isStartedRef.current = false;
      } else if (event.error === 'network') {
        setError('Speech recognition network communication error.');
        setStatus('error');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition encountered an issue: ${event.error}`);
        setStatus('error');
      }
    };

    recognition.onend = () => {
      isStartedRef.current = false;
      setInterimTranscript('');

      // Auto-restart if should still be active (Chrome ends continuous recognition on silence)
      if (
        !isDestroyedRef.current &&
        isEnabledRef.current &&
        !isMutedRef.current
      ) {
        restartTimerRef.current = setTimeout(() => {
          if (!isDestroyedRef.current && isEnabledRef.current && !isMutedRef.current) {
            try {
              recognition.start();
              isStartedRef.current = true;
              setStatus('active');
            } catch (err) {
              if (err.name !== 'InvalidStateError') {
                console.warn('[SpeechRecognition] Restart on end error:', err);
              }
            }
          }
        }, 150);
      } else if (isMutedRef.current) {
        setStatus('muted');
      } else if (!isEnabledRef.current) {
        setStatus('stopped');
      }
    };

    // Initial start if enabled and not muted
    if (isEnabledRef.current && !isMutedRef.current) {
      try {
        recognition.start();
        isStartedRef.current = true;
        setStatus('active');
      } catch (err) {
        console.warn('[SpeechRecognition Initial Start Error]', err);
      }
    }

    return () => {
      isDestroyedRef.current = true;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      try {
        recognition.abort();
      } catch (e) {}
      recognitionRef.current = null;
      isStartedRef.current = false;
    };
  }, [SpeechRecognition]);

  // Handle mute changes
  useEffect(() => {
    if (!SpeechRecognition) return;

    if (isMuted) {
      stopRecognition();
      setStatus('muted');
    } else if (isEnabled) {
      setStatus('starting');
      startRecognition();
    }
  }, [isMuted, isEnabled, startRecognition, stopRecognition, SpeechRecognition]);

  const toggleTranscription = useCallback(() => {
    if (!isSupported) return;
    setIsEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopRecognition();
        setStatus('stopped');
      } else if (!isMutedRef.current) {
        setStatus('starting');
        startRecognition();
      }
      return next;
    });
  }, [isSupported, startRecognition, stopRecognition]);

  return {
    status,
    isSupported,
    isEnabled,
    interimTranscript,
    error,
    toggleTranscription,
    startTranscription: startRecognition,
    stopTranscription: stopRecognition,
  };
};
