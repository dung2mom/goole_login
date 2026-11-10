import { useState, useRef, useCallback, useEffect } from 'react';

export interface WordMatch {
  word: string;
  matched: boolean;
}

export interface SpeechCheckResult {
  words: WordMatch[];
  matchedCount: number;
  totalCount: number;
  transcript: string;
}

export function cleanWord(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function useShadowRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up previous audio object URLs
  const cleanupUrl = useCallback(() => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  }, [recordedAudioUrl]);

  // Stop playing current user voice
  const stopVoice = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  }, []);

  // Play user voice
  const playVoice = useCallback(() => {
    if (!recordedAudioUrl) return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(recordedAudioUrl);
      audioElementRef.current.onended = () => {
        setIsPlayingAudio(false);
      };
      audioElementRef.current.onerror = () => {
        setIsPlayingAudio(false);
      };
    } else {
      audioElementRef.current.src = recordedAudioUrl;
    }

    try {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    } catch (e) {
      console.warn('Failed to play recorded audio:', e);
      setIsPlayingAudio(false);
    }
  }, [recordedAudioUrl]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    stopVoice();
    cleanupUrl();
    setStatusMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusMessage('Audio recording is not supported in this browser.');
      setMicPermissionDenied(true);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermissionDenied(false);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);
      return true;
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      setMicPermissionDenied(true);
      setStatusMessage('Mic is off. You can still listen and shadow out loud.');
      setIsRecording(false);
      return false;
    }
  }, [cleanupUrl, stopVoice]);

  // Stop recording and return audio URL
  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        try {
          const mime = recorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mime });
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
          setIsRecording(false);

          // Stop all audio tracks to free hardware
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          resolve(url);
        } catch (e) {
          console.warn('Failed to create audio blob:', e);
          setIsRecording(false);
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  return {
    isRecording,
    recordedAudioUrl,
    isPlayingAudio,
    micPermissionDenied,
    statusMessage,
    startRecording,
    stopRecording,
    playVoice,
    stopVoice,
    setRecordedAudioUrl,
    clearRecording: cleanupUrl,
  };
}

export function compareSpokenWords(targetSentence: string, spokenText: string): SpeechCheckResult {
  const targetTokens = targetSentence.trim().split(/\s+/).filter(Boolean);
  const targetCleaned = targetTokens.map(cleanWord);
  const spokenTokens = spokenText
    .trim()
    .split(/\s+/)
    .map(cleanWord)
    .filter(Boolean);

  // Sequential alignment matching (strictly respecting word arrangement & order)
  let spokenIndex = 0;
  let matchedCount = 0;
  const words: WordMatch[] = [];

  for (let i = 0; i < targetTokens.length; i++) {
    const targetWord = targetCleaned[i];
    let isMatched = false;

    // Search forward within a lookahead window in the spoken sequence
    const lookaheadLimit = Math.min(spokenIndex + 4, spokenTokens.length);
    for (let j = spokenIndex; j < lookaheadLimit; j++) {
      const spk = spokenTokens[j];
      if (
        spk === targetWord ||
        (targetWord.length > 3 && (spk.includes(targetWord) || targetWord.includes(spk)))
      ) {
        isMatched = true;
        spokenIndex = j + 1; // Advance pointer in spoken stream to preserve word order
        break;
      }
    }

    if (isMatched) {
      matchedCount++;
    }
    words.push({
      word: targetTokens[i],
      matched: isMatched,
    });
  }

  return {
    words,
    matchedCount,
    totalCount: targetTokens.length,
    transcript: spokenText,
  };
}
