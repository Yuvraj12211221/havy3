import type { ReactNode } from "react";
import { useTimeTheme } from "../../hooks/useTimeTheme";

interface ThemedCardProps {
    children: ReactNode;
    className?: string;
    /** Apply accent highlight (blue tint) */
    accent?: boolean;
    /** Make card fully opaque (no glass) — for chart containers */
    solid?: boolean;
}

/**
 * A card that automatically adapts to the current time theme.
 *
 * Light mode → white card, subtle border + shadow
 * Dark mode  → glassmorphism: translucent bg, backdrop-blur, glowing border
 */
export function ThemedCard({ children, className = "", accent = false, solid = false }: ThemedCardProps) {
    const theme = useTimeTheme();

    const base =
        "rounded-2xl transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-[2px] ";

    const light = solid
        ? "bg-white border border-gray-200 shadow-md "
        : accent
            ? "bg-gradient-to-br from-blue-50 via-white to-white border border-blue-200 shadow-md "
            : "bg-white border border-gray-200 shadow-md ";

    const dark = solid
        ? "bg-gray-900/90 border border-white/10 shadow-2xl "
        : accent
            ? "bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-transparent border border-blue-400/30 shadow-2xl backdrop-blur-xl "
            : "bg-white/10 border border-white/15 shadow-2xl backdrop-blur-xl ";

    return (
        <div className={`${base} ${theme === "dark" ? dark : light} ${className}`}>
            {children}
        </div>
    );
}

interface ThemedStatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    accent?: boolean;
    unavailable?: boolean;
    icon?: ReactNode;
}

/**
 * A compact stat card with theme-aware styling.
 * Shows a soft "unavailable" state when data is blocked by browser/ad-blocker.
 */
export function ThemedStatCard({
    label, value, sub, accent = false, unavailable = false, icon
}: ThemedStatCardProps) {
    const theme = useTimeTheme();
    const isDark = theme === "dark";

    return (
        <ThemedCard accent={accent} className="p-5">
            <div className="flex items-start justify-between">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-white/50" : "text-gray-500"}`}>
                    {label}
                </p>
                {icon && (
                    <span className={`${isDark ? "text-white/40" : "text-gray-400"} transition-opacity duration-300`}>
                        {icon}
                    </span>
                )}
            </div>

            {unavailable ? (
                <>
                    <p className={`text-3xl font-semibold mt-2 ${isDark ? "text-white/20" : "text-gray-300"}`}>—</p>
                    <p className={`text-xs mt-1 font-medium ${isDark ? "text-orange-400/70" : "text-orange-500"}`}>
                        Limited by browser / ad-blocker
                    </p>
                </>
            ) : (
                <>
                    <p
                        className={`text-3xl font-semibold tracking-tight mt-2 ${accent
                            ? isDark
                                ? "text-blue-300 drop-shadow-[0_0_6px_rgba(59,130,246,0.35)]"
                                : "text-blue-600"
                            : isDark
                                ? "text-white"
                                : "text-gray-900"
                            }`}
                    >
                        {value}
                    </p>
                    {sub && (
                        <p className={`text-sm mt-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>
                            {sub}
                        </p>
                    )}
                </>
            )}
        </ThemedCard>
    );
}