import { Volume2, VolumeX } from 'lucide-react';
import { useDictation } from '../../contexts/DictationContext';
import { useTimeTheme } from '../../hooks/useTimeTheme';

export default function DictationToggle() {
  const { isDictationEnabled, toggleDictation } = useDictation();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleDictation}
      aria-label="Toggle dictation mode"
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center gap-2
        rounded-full px-4 py-3
        text-sm font-medium
        shadow-lg
        transition-all duration-300
        border
        ${isDictationEnabled
          ? isDark
            ? 'bg-violet-600/80 border-violet-400/50 text-white shadow-violet-500/40 shadow-lg hover:bg-violet-500/90'
            : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-400/40 shadow-lg hover:bg-indigo-500'
          : isDark
            ? 'bg-gray-800/80 border-white/10 text-white/60 backdrop-blur-sm hover:text-white hover:border-white/20'
            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      {isDictationEnabled ? (
        <>
          <Volume2 size={18} className={isDark ? 'text-violet-300' : 'text-indigo-200'} />
          <span>Dictation ON</span>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-violet-300' : 'bg-indigo-200'}`} />
        </>
      ) : (
        <>
          <VolumeX size={18} />
          <span>Dictation OFF</span>
        </>
      )}
    </button>
  );
}
