import { useState, useCallback, useRef, useEffect } from 'react';
import type { CookingTimer } from '@/types';

export function useCookingTimers() {
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlarm = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      [0, 0.2, 0.4].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch { /* Audio not available */ }
  }, []);

  // Tick every second when running timers exist
  useEffect(() => {
    const hasRunning = timers.some(t => t.status === 'running');

    if (hasRunning && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setTimers(prev => {
          let changed = false;
          const next = prev.map(timer => {
            if (timer.status !== 'running') return timer;
            changed = true;
            if (timer.remainingSeconds <= 1) {
              playAlarm();
              return { ...timer, remainingSeconds: 0, status: 'completed' as const };
            }
            return { ...timer, remainingSeconds: timer.remainingSeconds - 1 };
          });
          return changed ? next : prev;
        });
      }, 1000);
    } else if (!hasRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timers, playAlarm]);

  const startTimer = useCallback((stepIndex: number, label: string, seconds: number) => {
    const id = `timer-${stepIndex}-${Date.now()}`;
    setTimers(prev => [...prev, {
      id,
      stepIndex,
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      status: 'running',
    }]);
    // Ensure AudioContext is created on user gesture
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { /* noop */ }
    }
    return id;
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setTimers(prev => prev.map(t =>
      t.id === id && t.status === 'running' ? { ...t, status: 'paused' as const } : t
    ));
  }, []);

  const resumeTimer = useCallback((id: string) => {
    setTimers(prev => prev.map(t =>
      t.id === id && t.status === 'paused' ? { ...t, status: 'running' as const } : t
    ));
  }, []);

  const resetTimer = useCallback((id: string) => {
    setTimers(prev => prev.map(t =>
      t.id === id ? { ...t, remainingSeconds: t.totalSeconds, status: 'paused' as const } : t
    ));
  }, []);

  const removeTimer = useCallback((id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  }, []);

  return { timers, startTimer, pauseTimer, resumeTimer, resetTimer, removeTimer };
}
