import React, { useState, useRef, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { ThemeContext } from "../../contexts/ThemeContext";

// ─── 3-Position Sliding Theme Toggle ─────────────────────────────────────────

// ─── Integrated Pill Theme Toggle ─────────────────────────────────────────

const ThemeToggle: React.FC = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) return null;
  const { mode, setMode } = ctx;

  const isLight = mode === "light" || (mode === "time" && new Date().getHours() >= 6 && new Date().getHours() < 18);
  const isAuto = mode === "time";

  return (
    <div className="flex items-center bg-black/20 border border-white/10 rounded-full p-1 h-8 w-20 shadow-inner">
      {/* Auto (Time) Indicator button (approx left part) */}
      <button
        onClick={() => setMode(isAuto ? (isLight ? "light" : "dark") : "time")}
        title="Auto Theme (Time-based)"
        className={`
          flex items-center justify-center aspect-square h-full rounded-full transition-colors z-10
          ${isAuto ? "bg-indigo-500/80 text-white shadow-md" : "text-white/50 hover:text-white hover:bg-white/10"}
        `}
      >
        <span className="text-[11px] leading-none mb-px">{isAuto ? "🕐" : "🕛"}</span>
      </button>

      {/* Light/Dark Toggle in the remaining space */}
      <button
        onClick={() => setMode(isLight ? "dark" : "light")}
        className={`
          relative flex-1 h-full ml-1 rounded-full transition-colors duration-300 flex items-center px-0.5
          ${isLight ? "bg-slate-200" : "bg-slate-700"}
          ${isAuto ? "opacity-50" : "opacity-100"}
        `}
      >
        <div
          className={`
            w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center z-10
            ${isLight ? "translate-x-0" : "translate-x-5"}
          `}
        >
          {isLight ? (
            <span className="text-amber-300 text-[9px] leading-none font-bold" style={{ letterSpacing: '-1px' }}>◈</span>
          ) : (
            <span className="text-blue-300 text-[9px] leading-none">🌙</span>
          )}
        </div>
      </button>
    </div>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────

const Header: React.FC = () => {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="
      top-0 z-50
      bg-gradient-to-r
      from-[#0f1729] via-[#1a2540] to-[#0f1729]
      dark:from-[#070b14] dark:via-[#0d1220] dark:to-[#070b14]
      border-b border-white/8
      text-white
      shadow-[0_2px_24px_rgba(0,0,0,0.35)]
      backdrop-blur-md
      transition-all duration-300
    ">
      <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Bot className="w-8 h-8 text-indigo-400" />
            <span className="text-xl font-bold text-white tracking-tight">HAVY AI Services </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/#pricing">Pricing</NavLink>
                <NavLink to="/login">Login</NavLink>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all duration-200 shadow-sm"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/integrations">Integrations</NavLink>

                {/* Business Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setOpen(!open)}
                    className="
                      flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm
                      text-white/80 hover:text-white hover:bg-white/8
                      transition-all duration-200
                    "
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{business?.business_name || "My Business"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                  </button>

                  <div className={`
                    absolute right-0 mt-3 w-56 rounded-xl
                    bg-[#1a2540]/90 backdrop-blur-xl
                    border border-white/10
                    shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                    transform transition-all duration-200
                    ${open ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none"}
                  `}>
                    <div className="py-2">
                      <DropdownItem label="Update Business" onClick={() => navigate("/dashboard/business")} />
                      <DropdownItem label="Integrations" onClick={() => navigate("/dashboard/integrations")} />
                      <DropdownItem label="Subscription" onClick={() => navigate("/dashboard/billing")} />
                      <div className="border-t border-white/10 my-2" />
                      <DropdownItem label="Logout" danger onClick={handleLogout} />
                    </div>
                  </div>
                </div>

                {/* Logout pill */}
                <button
                  onClick={handleLogout}
                  className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    border border-white/15 bg-white/8
                    hover:bg-red-500/70 hover:border-red-400/60
                    text-white/70 hover:text-white
                    text-sm font-medium
                    transition-all duration-200
                  "
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}

            {/* ── Theme Slider – always last ── */}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className="text-sm text-white/70 hover:text-white font-medium transition-colors duration-150"
  >
    {children}
  </Link>
);

const DropdownItem = ({
  label, onClick, danger = false,
}: { label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`
      w-full text-left px-4 py-2 text-sm transition-colors duration-150
      ${danger
        ? "text-red-400 hover:bg-red-500/20"
        : "text-white/75 hover:text-white hover:bg-white/8"
      }
    `}
  >
    {label}
  </button>
);

export default Header;