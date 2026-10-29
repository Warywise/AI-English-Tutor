import React from 'react';

interface AudioWaveProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  label?: string;
}

export const AudioWave: React.FC<AudioWaveProps> = ({ isRecording, isPlaying, label }) => {
  if (!isRecording && !isPlaying) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white shadow-lg backdrop-blur-md border border-slate-700/60 animate-in fade-in duration-200">
      <div className="flex items-center gap-1 h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-1 rounded-full ${
              isRecording ? 'bg-red-400' : 'bg-emerald-400'
            }`}
            style={{
              height: isRecording || isPlaying ? `${Math.sin(i * 1.2 + Date.now() / 200) * 8 + 12}px` : '4px',
              animation: isRecording
                ? `pulseWave 0.7s infinite alternate ease-in-out ${i * 0.12}s`
                : `pulseWave 0.9s infinite alternate ease-in-out ${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium tracking-wide">
        {label || (isRecording ? 'Ouvindo sua voz...' : 'Falando...')}
      </span>

      <style>{`
        @keyframes pulseWave {
          0% { height: 4px; opacity: 0.5; }
          100% { height: 16px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};
