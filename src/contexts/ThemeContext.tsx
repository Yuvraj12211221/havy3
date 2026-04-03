import React, { createContext, useEffect, useState } from "react";
import { ThemeMode, EffectiveTheme, getInitialTheme } from "../utils/timeTheme";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  effectiveTheme: EffectiveTheme;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "havy-theme-mode";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Read stored mode or default to "time"
  const getStoredMode = (): ThemeMode => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored ?? "time";
  };

  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => {
    if (mode === "time") {
      return getInitialTheme();
    }
    return mode;
  });

  // Update effective theme when mode changes
  useEffect(() => {
    let resolved: EffectiveTheme;

    if (mode === "time") {
      resolved = getInitialTheme();
    } else {
      resolved = mode;
    }

    setEffectiveTheme(resolved);

    // Apply to <html>
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);

    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};