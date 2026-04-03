import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  TtsEngine,
  setTtsEngine as _setTtsEngine,
} from '../lib/tts/speech';

type DictationContextType = {
  isDictationEnabled: boolean;
  enableDictation: () => void;
  disableDictation: () => void;
  toggleDictation: () => void;
  ttsEngine: TtsEngine;
  setTtsEngine: (engine: TtsEngine) => void;
};

const DictationContext = createContext<DictationContextType | undefined>(undefined);

const STORAGE_ENGINE_KEY = 'havy-tts-engine';

export const DictationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDictationEnabled, setIsDictationEnabled] = useState(false);

  const [ttsEngine, setTtsEngineState] = useState<TtsEngine>(() => {
    const stored = localStorage.getItem(STORAGE_ENGINE_KEY) as TtsEngine | null;
    return stored === 'huggingface' ? 'huggingface' : 'browser';
  });

  useEffect(() => {
    _setTtsEngine(ttsEngine);
    localStorage.setItem(STORAGE_ENGINE_KEY, ttsEngine);
  }, [ttsEngine]);

  const setTtsEngine = (engine: TtsEngine) => setTtsEngineState(engine);

  const enableDictation = () => setIsDictationEnabled(true);
  const disableDictation = () => setIsDictationEnabled(false);
  const toggleDictation = () => setIsDictationEnabled(prev => !prev);

  return (
    <DictationContext.Provider
      value={{
        isDictationEnabled,
        enableDictation,
        disableDictation,
        toggleDictation,
        ttsEngine,
        setTtsEngine,
      }}
    >
      {children}
    </DictationContext.Provider>
  );
};

export function useDictation() {
  const context = useContext(DictationContext);
  if (!context) {
    throw new Error('useDictation must be used within DictationProvider');
  }
  return context;
}
