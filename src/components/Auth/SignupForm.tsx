import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ThemeContext } from '../../contexts/ThemeContext';

const SignupForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', name: '', company: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const themeCtx = useContext(ThemeContext);
  const effectiveTheme = themeCtx?.effectiveTheme ?? 'light';
  const isDark = effectiveTheme === 'dark';

  // Switch video by theme
  const videoSrc = isDark ? 'videos/randomnight.mp4' : '/videos/signuppageday.mp4';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Signup failed');
      setIsLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: formData.name, company_name: formData.company })
      .eq('id', data.user.id);

    if (profileError) {
      setError(profileError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    navigate('/pricing-select');
  };

  // ── Shared field style ───────────────────────────────────────────
  const inputCls = isDark
    ? 'w-full pl-10 pr-4 py-3 bg-transparent text-white border border-white/30 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all placeholder:text-white/30'
    : 'w-full pl-10 pr-4 py-3 bg-white/50 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none transition-all';

  const labelCls = 'block text-sm font-medium text-white/80 mb-1.5';

  const btnCls = isDark
    ? 'w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-700 via-violet-600 to-purple-600 hover:from-indigo-600 hover:to-purple-500 shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">

      {/* Background video */}
      <video
        key={videoSrc}
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Card */}
      <div className="relative z-20 w-full max-w-lg space-y-6">

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white drop-shadow">Create your account</h2>
          <p className="mt-1.5 text-white/70">Start your AI-powered journey today</p>
        </div>

        <div className="rounded-2xl shadow-2xl p-8 bg-white/5 backdrop-blur-md border border-white/20 space-y-5">

          {error && (
            <div className="bg-red-500/20 border border-red-400 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name + Company row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input id="name" name="name" type="text" required
                    value={formData.name} onChange={handleChange}
                    className={inputCls} placeholder="Your name" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input id="company" name="company" type="text" required
                    value={formData.company} onChange={handleChange}
                    className={inputCls} placeholder="Company name" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelCls}>Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  className={inputCls} placeholder="your@email.com" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input id="password" name="password"
                  type={showPassword ? 'text' : 'password'} required
                  value={formData.password} onChange={handleChange}
                  className={`${inputCls} pr-12`} placeholder="Create password" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelCls}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input id="confirmPassword" name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'} required
                  value={formData.confirmPassword} onChange={handleChange}
                  className={`${inputCls} pr-12`} placeholder="Confirm password" />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input type="checkbox" required
                className="w-4 h-4 mt-0.5 rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-400" />
              <span className="text-sm text-white/70">
                I agree to the{' '}
                <Link to="/terms" className="text-indigo-300 hover:text-indigo-200 underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-indigo-300 hover:text-indigo-200 underline">Privacy Policy</Link>
              </span>
            </div>

            <button type="submit" disabled={isLoading} className={btnCls}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <Link to="/login" className={`font-semibold underline ${isDark ? 'text-violet-300 hover:text-violet-200' : 'text-indigo-300 hover:text-indigo-200'}`}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
