import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthGate() {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setError('');
    setMessage('');
  };

  return (
    <div className="phone-frame" style={{ background: 'var(--ios-bg)' }}>
      <div
        className="flex flex-col items-center justify-center flex-1 px-8"
        style={{ background: 'var(--ios-bg)' }}
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--ios-blue)' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.25.2 2.45.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--ios-label)' }}
          >
            ArctiCalls
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ios-label3)' }}>
            Arctic Insulation soft phone
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div
            className="rounded-2xl overflow-hidden divide-y"
            style={{ background: 'var(--ios-surface)', borderColor: 'var(--ios-sep)' }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 text-base outline-none"
              style={{ color: 'var(--ios-label)', background: 'transparent' }}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 text-base outline-none"
              style={{ color: 'var(--ios-label)', background: 'transparent', borderTop: '1px solid var(--ios-sep)' }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-center px-2" style={{ color: 'var(--ios-red)' }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-center px-2" style={{ color: 'var(--ios-green)' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-semibold text-base transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--ios-blue)' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={switchMode}
          className="mt-6 text-sm"
          style={{ color: 'var(--ios-blue)' }}
        >
          {mode === 'login'
            ? "Don't have an account? Sign Up"
            : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}
