// Simple media stream hook used by RTCProvider
// Provides { stream, start, stopAll, error }
import { useState, useEffect, useCallback } from 'react';

export default function useMedia() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  const start = useCallback(async ({ video = true, audio = true } = {}) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video, audio });
      setStream(s);
      setError(null);
      return s;
    } catch (e) {
      console.error('[useMedia] getUserMedia error:', e);
      setError(e);
      setStream(null);
      throw e;
    }
  }, []);

  const stopAll = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
  }, [stream]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return { stream, start, stopAll, error };
}
