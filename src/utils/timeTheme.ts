export type ThemeMode = "light" | "dark" | "time";

export type EffectiveTheme = "light" | "dark";

/**
 * Returns theme based on current time.
 * Used when ThemeMode is set to "time".
 */
export function getInitialTheme(): EffectiveTheme {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 18) {
    return "light";
  }

  return "dark";
}