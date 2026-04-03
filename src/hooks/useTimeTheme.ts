import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import type { EffectiveTheme } from "../utils/timeTheme";

/**
 * Returns the current effective theme ("light" | "dark").
 * Falls back to "light" if ThemeContext is unavailable.
 * Use this hook on any page/component that participates in the time-aware theme.
 */
export function useTimeTheme(): EffectiveTheme {
    const ctx = useContext(ThemeContext);
    return ctx?.effectiveTheme ?? "light";
}
