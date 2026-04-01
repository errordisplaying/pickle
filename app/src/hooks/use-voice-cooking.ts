import { useState, useRef, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '@/constants';

export interface UseVoiceCookingReturn {
  isSupported: boolean;
  isActive: boolean;
  currentStep: number;
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  startVoiceMode: (steps: string[], startAt?: number) => void;
  stopVoiceMode: () => void;
  nextStep: () => void;
  prevStep: () => void;
  repeatStep: () => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  setRate: (rate: number) => void;
  totalSteps: number;
  // Voice selection
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  // Voice commands
  isListening: boolean;
  isListeningSupported: boolean;
  toggleListening: () => void;
  lastHeard: string;
}

const ADVANCE_DELAY_MS = 1500;
const MAX_CHUNK_LENGTH = 200;

/** Split long text at sentence boundaries to work around Chrome's speech cut-off bug */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_CHUNK_LENGTH && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// Check for SpeechRecognition support
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export function useVoiceCooking(): UseVoiceCookingReturn {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isListeningSupported = !!SpeechRecognitionAPI;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRateState] = useState(() => {
    if (typeof window === 'undefined') return 1.0;
    const stored = localStorage.getItem(STORAGE_KEYS.VOICE_SPEED);
    return stored ? parseFloat(stored) || 1.0 : 1.0;
  });
  const [totalSteps, setTotalSteps] = useState(0);

  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null);

  // Voice command state
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  const stepsRef = useRef<string[]>([]);
  const currentStepRef = useRef(0);
  const rateRef = useRef(rate);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isActiveRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Populate available voices
  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter to English voices for simplicity, show all if none match
      const english = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(english.length > 0 ? english : voices);

      // Restore saved voice preference
      const savedName = localStorage.getItem(STORAGE_KEYS.VOICE_NAME);
      if (savedName) {
        const match = voices.find(v => v.name === savedName);
        if (match) {
          setSelectedVoiceState(match);
          selectedVoiceRef.current = match;
        }
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [isSupported]);

  const setRate = useCallback((newRate: number) => {
    setRateState(newRate);
    rateRef.current = newRate;
    localStorage.setItem(STORAGE_KEYS.VOICE_SPEED, String(newRate));
  }, []);

  const setSelectedVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoiceState(voice);
    selectedVoiceRef.current = voice;
    if (voice) {
      localStorage.setItem(STORAGE_KEYS.VOICE_NAME, voice.name);
    } else {
      localStorage.removeItem(STORAGE_KEYS.VOICE_NAME);
    }
  }, []);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake lock not available or denied — non-critical
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Pause/resume speech recognition around TTS to avoid hearing itself
  const pauseRecognition = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
  }, [isListening]);

  const resumeRecognition = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.start(); } catch { /* ignore */ }
    }
  }, [isListening]);

  const speakStepInternal = useCallback((stepIndex: number, autoAdvance = true) => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    clearAdvanceTimer();
    pauseRecognition();

    const text = stepsRef.current[stepIndex];
    if (!text) return;

    const chunks = chunkText(text);
    setIsSpeaking(true);
    setIsPaused(false);

    const speakChunk = (i: number) => {
      if (i >= chunks.length) {
        setIsSpeaking(false);
        resumeRecognition();
        // Auto-advance after delay
        if (autoAdvance && isActiveRef.current && stepIndex < stepsRef.current.length - 1) {
          advanceTimerRef.current = setTimeout(() => {
            if (!isActiveRef.current) return;
            const next = currentStepRef.current + 1;
            setCurrentStep(next);
            speakStepInternal(next, true);
          }, ADVANCE_DELAY_MS);
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[i]);
      utterance.rate = rateRef.current;
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
      utterance.onend = () => speakChunk(i + 1);
      utterance.onerror = () => {
        setIsSpeaking(false);
        resumeRecognition();
      };
      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  }, [isSupported, clearAdvanceTimer, pauseRecognition, resumeRecognition]);

  const startVoiceMode = useCallback((steps: string[], startAt = 0) => {
    if (!isSupported || steps.length === 0) return;
    stepsRef.current = steps;
    setTotalSteps(steps.length);
    setCurrentStep(startAt);
    setIsActive(true);
    isActiveRef.current = true;
    requestWakeLock();
    speakStepInternal(startAt, true);
  }, [isSupported, speakStepInternal, requestWakeLock]);

  const stopVoiceMode = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    clearAdvanceTimer();
    setIsActive(false);
    isActiveRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
    releaseWakeLock();
    // Stop listening when voice mode stops
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsListening(false);
    }
  }, [isSupported, clearAdvanceTimer, releaseWakeLock]);

  const nextStep = useCallback(() => {
    const next = Math.min(currentStepRef.current + 1, stepsRef.current.length - 1);
    if (next === currentStepRef.current) return;
    setCurrentStep(next);
    speakStepInternal(next, true);
  }, [speakStepInternal]);

  const prevStep = useCallback(() => {
    const prev = Math.max(currentStepRef.current - 1, 0);
    if (prev === currentStepRef.current) return;
    setCurrentStep(prev);
    speakStepInternal(prev, true);
  }, [speakStepInternal]);

  const repeatStep = useCallback(() => {
    speakStepInternal(currentStepRef.current, true);
  }, [speakStepInternal]);

  const pauseSpeech = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    clearAdvanceTimer();
    setIsPaused(true);
    setIsSpeaking(false);
  }, [isSupported, clearAdvanceTimer]);

  const resumeSpeech = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
    setIsSpeaking(true);
  }, [isSupported]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in input fields
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isPaused) resumeSpeech();
          else if (isSpeaking) pauseSpeech();
          else repeatStep();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            repeatStep();
          }
          break;
        case 'Escape':
          e.preventDefault();
          stopVoiceMode();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isSpeaking, isPaused, nextStep, prevStep, repeatStep, pauseSpeech, resumeSpeech, stopVoiceMode]);

  // Voice command support (Speech Recognition)
  const toggleListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = last[0].transcript.toLowerCase().trim();
      setLastHeard(transcript);

      // Clear the "last heard" display after 2 seconds
      setTimeout(() => setLastHeard(''), 2000);

      // Match voice commands
      if (/\b(next|forward|skip)\b/.test(transcript)) {
        nextStep();
      } else if (/\b(back|previous|go back)\b/.test(transcript)) {
        prevStep();
      } else if (/\b(repeat|again|say again)\b/.test(transcript)) {
        repeatStep();
      } else if (/\b(pause|stop|wait)\b/.test(transcript)) {
        pauseSpeech();
      } else if (/\b(resume|continue|play|go)\b/.test(transcript)) {
        resumeSpeech();
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are normal, don't stop listening
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're still in listening mode and not speaking
      if (isListening && !isSpeakingRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening, nextStep, prevStep, repeatStep, pauseSpeech, resumeSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) window.speechSynthesis.cancel();
      clearAdvanceTimer();
      releaseWakeLock();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [isSupported, clearAdvanceTimer, releaseWakeLock]);

  return {
    isSupported,
    isActive,
    currentStep,
    isSpeaking,
    isPaused,
    rate,
    startVoiceMode,
    stopVoiceMode,
    nextStep,
    prevStep,
    repeatStep,
    pauseSpeech,
    resumeSpeech,
    setRate,
    totalSteps,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    isListening,
    isListeningSupported,
    toggleListening,
    lastHeard,
  };
}
