import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Dark panel — top on mobile, left on desktop */}
      <div className="bg-[#111111] flex flex-col p-8 sm:p-10 md:p-12 md:w-[45%] md:justify-between gap-8 md:gap-0">
        <div>
          <span className="text-lg font-semibold text-gold-400 tracking-tight">Cash Grab</span>
          <p className="text-[10px] font-mono tracking-editorial uppercase text-white/30 mt-1">Finance Tracker</p>
        </div>
        <div className="hidden md:block">
          <p className="text-3xl font-light text-white leading-snug tracking-tight">
            Know where every<br />dollar goes.
          </p>
          <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-xs">
            Track accounts, categories, and budgets in one clean view.
          </p>
        </div>
        <p className="hidden md:block text-[10px] font-mono text-white/20 tracking-editorial uppercase">
          &copy; {new Date().getFullYear()} Cash Grab
        </p>
      </div>

      {/* Form panel — bottom on mobile, right on desktop */}
      <div className="flex-1 flex items-start md:items-center justify-center bg-cream-100 px-6 pt-10 pb-10 md:py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Welcome back</h1>
          <p className="text-[10px] font-mono tracking-editorial uppercase text-gray-400 mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono tracking-editorial uppercase text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-editorial uppercase text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#111111] text-white py-3 text-xs font-mono tracking-editorial uppercase hover:bg-gray-800 disabled:opacity-40 transition-colors rounded-md"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-gray-400">
            No account?{' '}
            <Link to="/register" className="text-gray-900 hover:text-gold-600 transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
