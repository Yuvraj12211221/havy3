import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="card max-w-md w-full space-y-4">
        <h2 className="text-xl font-semibold text-center">
          Set new password
        </h2>

        <input
          type="password"
          required
          placeholder="New password"
          className="w-full border p-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full btn-primary">
          Update password
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
};

export default ResetPassword;
