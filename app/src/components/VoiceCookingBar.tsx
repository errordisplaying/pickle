import { Play, Pause, SkipBack, SkipForward, RotateCcw, Square, ChevronDown, Mic, MicOff, Volume2 } from 'lucide-react';
import { useState } from 'react';

interface VoiceCookingBarProps {
  currentStep: number;
  totalSteps: number;
  isSpeaking: boolean;
  isPaused: boolean;
  rate: number;
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSetRate: (rate: number) => void;
  // Voice selection
  availableVoices?: SpeechSynthesisVoice[];
  selectedVoice?: SpeechSynthesisVoice | null;
  onSelectVoice?: (voice: SpeechSynthesisVoice | null) => void;
  // Voice commands
  isListening?: boolean;
  isListeningSupported?: boolean;
  onToggleListening?: () => void;
  lastHeard?: string;
}

const RATE_OPTIONS = [0.8, 1, 1.2, 1.5];

export default function VoiceCookingBar({
  currentStep,
  totalSteps,
  isSpeaking,
  isPaused,
  rate,
  onNext,
  onPrev,
  onRepeat,
  onPause,
  onResume,
  onStop,
  onSetRate,
  availableVoices = [],
  selectedVoice,
  onSelectVoice,
  isListening = false,
  isListeningSupported = false,
  onToggleListening,
  lastHeard = '',
}: VoiceCookingBarProps) {
  const [showSpeed, setShowSpeed] = useState(false);
  const [showVoices, setShowVoices] = useState(false);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-[#E8E6DC] p-3">
      {/* Step counter + waveform + controls row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isSpeaking && (
              <div className="flex items-end gap-[2px] h-4">
                <span className="w-[3px] bg-[#C49A5C] rounded-full animate-voice-bar-1" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full animate-voice-bar-2" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full animate-voice-bar-3" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full animate-voice-bar-4" />
              </div>
            )}
            {isPaused && (
              <div className="flex items-end gap-[2px] h-4 opacity-40">
                <span className="w-[3px] bg-[#C49A5C] rounded-full h-2" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full h-3" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full h-2" />
                <span className="w-[3px] bg-[#C49A5C] rounded-full h-3" />
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-[#1A1A1A]">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Voice selector */}
          {availableVoices.length > 0 && onSelectVoice && (
            <div className="relative">
              <button
                onClick={() => { setShowVoices(!showVoices); setShowSpeed(false); }}
                className="text-xs font-medium text-[#6E6A60] hover:text-[#1A1A1A] flex items-center gap-0.5 px-2 py-1 rounded-full bg-[#F4F2EA]"
                aria-label="Select voice"
              >
                <Volume2 className="w-3 h-3" />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showVoices && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E8E6DC] overflow-hidden z-10 max-h-48 overflow-y-auto w-48">
                  <button
                    onClick={() => { onSelectVoice(null); setShowVoices(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F2EA] ${
                      !selectedVoice ? 'font-semibold text-[#C49A5C]' : 'text-[#1A1A1A]'
                    }`}
                  >
                    Default
                  </button>
                  {availableVoices.map(voice => (
                    <button
                      key={voice.name}
                      onClick={() => { onSelectVoice(voice); setShowVoices(false); }}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F2EA] truncate ${
                        selectedVoice?.name === voice.name ? 'font-semibold text-[#C49A5C]' : 'text-[#1A1A1A]'
                      }`}
                    >
                      {voice.name.replace(/^(Microsoft |Google )/, '')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Speed control */}
          <div className="relative">
            <button
              onClick={() => { setShowSpeed(!showSpeed); setShowVoices(false); }}
              className="text-xs font-medium text-[#6E6A60] hover:text-[#1A1A1A] flex items-center gap-0.5 px-2 py-1 rounded-full bg-[#F4F2EA]"
            >
              {rate}x <ChevronDown className="w-3 h-3" />
            </button>
            {showSpeed && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-[#E8E6DC] overflow-hidden z-10">
                {RATE_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => { onSetRate(r); setShowSpeed(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[#F4F2EA] ${
                      rate === r ? 'font-semibold text-[#C49A5C]' : 'text-[#1A1A1A]'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#E8E6DC] rounded-full mb-2.5 overflow-hidden">
        <div
          className="h-full bg-[#C49A5C] rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Voice command transcript */}
      {lastHeard && (
        <div className="text-center mb-2 animate-fade-in">
          <span className="text-[10px] text-[#6E6A60] bg-[#F4F2EA] px-2 py-0.5 rounded-full">
            Heard: &ldquo;{lastHeard}&rdquo;
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Mic toggle */}
        {isListeningSupported && onToggleListening && (
          <button
            onClick={onToggleListening}
            className={`p-2 rounded-full transition-colors ${
              isListening
                ? 'bg-red-50 text-red-500 animate-voice-glow'
                : 'hover:bg-[#F4F2EA] text-[#6E6A60]'
            }`}
            aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}

        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          className="p-2 rounded-full hover:bg-[#F4F2EA] text-[#6E6A60] disabled:opacity-30 transition-colors"
          aria-label="Previous step"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onRepeat}
          className="p-2 rounded-full hover:bg-[#F4F2EA] text-[#6E6A60] transition-colors"
          aria-label="Repeat step"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {isSpeaking || isPaused ? (
          <button
            onClick={isPaused ? onResume : onPause}
            className={`p-3 rounded-full bg-[#C49A5C] text-white hover:bg-[#8B6F3C] transition-colors ${
              isSpeaking ? 'animate-voice-glow' : ''
            }`}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        ) : (
          <button
            onClick={onRepeat}
            className="p-3 rounded-full bg-[#C49A5C] text-white hover:bg-[#8B6F3C] transition-colors"
            aria-label="Play"
          >
            <Play className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onNext}
          disabled={currentStep >= totalSteps - 1}
          className="p-2 rounded-full hover:bg-[#F4F2EA] text-[#6E6A60] disabled:opacity-30 transition-colors"
          aria-label="Next step"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={onStop}
          className="p-2 rounded-full hover:bg-red-50 text-[#6E6A60] hover:text-red-500 transition-colors"
          aria-label="Stop voice cooking"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-2 text-center">
        <span className="text-[9px] text-[#6E6A60]/60">
          Space: pause · Arrows: prev/next · R: repeat · Esc: stop
        </span>
      </div>
    </div>
  );
}
