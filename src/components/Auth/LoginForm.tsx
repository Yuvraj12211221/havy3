import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ThemeContext } from "../../contexts/ThemeContext";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const themeContext = useContext(ThemeContext);
  const effectiveTheme = themeContext?.effectiveTheme ?? "light";

  // Clean video switching
  const videoSrc =
    effectiveTheme === "dark"
      ? "/videos/dancingbotnight.mp4"
      : "/videos/dancingrobotday.mp4";

  //TimeAware input fields
  const inputClasses = effectiveTheme === "dark"
    ? `
      w-full pl-10 pr-4 py-3
      bg-transparent
      text-white
      border border-white/30
      rounded-lg
      focus:ring-2 focus:ring-purple-100
      focus:border-purple-400
      outline-none transition-all
    `
    : `
      w-full pl-10 pr-4 py-3
      bg-white/50
      text-gray-900
      border border-gray-300
      rounded-lg
      focus:ring-2 focus:ring-indigo-500
      focus:border-blue-500
      outline-none transition-all
    `;

    //TimeAware Buttons
const buttonClasses =
  effectiveTheme === "dark"
    ? `
      w-full py-3 rounded-lg font-semibold transition-all duration-300
      text-white
      bg-gradient-to-r
      from-[#1E3A8A]
      via-[#2563EB]
      to-[#7C3AED]
      hover:from-[#1D4ED8]
      hover:via-[#3B82F6]
      hover:to-[#8B5CF6]
      shadow-lg shadow-[#3B82F6]/40
      hover:shadow-[#3B82F6]/30
      disabled:opacity-50 disabled:cursor-not-allowed
    `
    : `
      w-full py-3 rounded-lg font-semibold transition-all duration-300
      text-white
      bg-gradient-to-r
      from-[#1D4ED8]
      via-[#2563EB]
      to-[#38BDF8]
      hover:from-[#2563EB]
      hover:via-[#3B82F6]
      hover:to-[#60A5FA]
      shadow-lg shadow-[#3B82F6]/30
      hover:shadow-[#3B82F6]/50
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">

      {/* Background Video */}
      <video
        key={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Subtle cinematic overlay */}
      <div className="absolute inset-0 bg-black/5 z-10"></div>

      {/* Content */}
      <div className="relative z-20 w-full max-w-md space-y-8">

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">
            Yay! You're back!
          </h2>
          <p className="mt-2 text-white/80">
            Sign in to your account
          </p>
        </div>

        <div className="
          rounded-2xl shadow-2xl p-8
          bg-white/5 backdrop-blur-md
          border border-white/20
        ">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-400 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray/60" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClasses} pr-12`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 gray/50" />
                  ) : (
                    <Eye className="w-5 h-5 gray/50" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={buttonClasses}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-white/70">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className={`font-semibold transition-colors duration-200 ${
                        effectiveTheme === "dark"
                          ? "text-purple-400 hover:text-purple-300"
                          : "text-blue-800 hover:text-blue-500"
                      }`}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginForm;