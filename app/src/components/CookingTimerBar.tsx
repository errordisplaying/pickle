import { Play, Pause, RotateCcw, X } from 'lucide-react';
import type { CookingTimer } from '@/types';

interface CookingTimerBarProps {
  timers: CookingTimer[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function CookingTimerBar({ timers, onPause, onResume, onReset, onRemove }: CookingTimerBarProps) {
  if (timers.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E8E6DC] p-3 max-h-[120px] overflow-y-auto">
      <div className="flex flex-col gap-2">
        {timers.map(timer => {
          const pct = timer.totalSeconds > 0
            ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
            : 0;

          return (
            <div
              key={timer.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                timer.status === 'completed'
                  ? 'bg-[#C49A5C]/10 border border-[#C49A5C]/30 animate-timer-pulse'
                  : 'bg-[#F4F2EA]'
              }`}
            >
              {/* Label */}
              <span className="text-xs font-semibold text-[#1A1A1A] min-w-0 truncate flex-shrink">
                {timer.label}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-1.5 bg-[#E8E6DC] rounded-full overflow-hidden min-w-[40px]">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    timer.status === 'completed' ? 'bg-[#C49A5C]' : 'bg-[#C49A5C]/60'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Time display */}
              <span className={`text-sm font-mono font-bold min-w-[44px] text-right ${
                timer.status === 'completed' ? 'text-[#C49A5C]' : 'text-[#1A1A1A]'
              }`}>
                {timer.status === 'completed' ? 'Done!' : formatTime(timer.remainingSeconds)}
              </span>

              {/* Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {timer.status === 'running' && (
                  <button
                    onClick={() => onPause(timer.id)}
                    className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#6E6A60] hover:text-[#1A1A1A] transition-colors shadow-sm"
                    aria-label="Pause timer"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                )}
                {timer.status === 'paused' && (
                  <button
                    onClick={() => onResume(timer.id)}
                    className="w-6 h-6 rounded-full bg-[#C49A5C] flex items-center justify-center text-white hover:bg-[#8B6F3C] transition-colors shadow-sm"
                    aria-label="Resume timer"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
                {timer.status !== 'running' && (
                  <button
                    onClick={() => onReset(timer.id)}
                    className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#6E6A60] hover:text-[#1A1A1A] transition-colors shadow-sm"
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(timer.id)}
                  className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#6E6A60] hover:text-red-500 transition-colors shadow-sm"
                  aria-label="Remove timer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
