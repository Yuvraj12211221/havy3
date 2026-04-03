import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/reset-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password reset link sent to your email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="card max-w-md w-full space-y-4">
        <h2 className="text-xl font-semibold text-center">
          Reset your password
        </h2>

        <input
          type="email"
          required
          placeholder="Enter your email"
          className="w-full border p-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="w-full btn-primary">
          Send reset link
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}
      </form>
    </div>
  );
};

export default ForgotPassword;
