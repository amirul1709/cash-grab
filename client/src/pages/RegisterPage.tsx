import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(email, name, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(msg ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left dark panel — hidden on mobile */}
      <div className="hidden md:flex w-[45%] bg-[#111111] flex-col justify-between p-12">
        <div>
          <span className="text-lg font-semibold text-gold-400 tracking-tight">Cash Grab</span>
          <p className="text-[10px] font-mono tracking-editorial uppercase text-white/30 mt-1">Finance Tracker</p>
        </div>
        <div>
          <p className="text-3xl font-light text-white leading-snug tracking-tight">
            Take control of<br />your finances.
          </p>
          <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-xs">
            Set budgets, track spending, and understand where your money goes.
          </p>
        </div>
        <p className="text-[10px] font-mono text-white/20 tracking-editorial uppercase">
          &copy; {new Date().getFullYear()} Cash Grab
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-cream-100 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="md:hidden mb-8">
            <span className="text-lg font-semibold text-gray-900 tracking-tight">Cash Grab</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Create account</h1>
          <p className="text-[10px] font-mono tracking-editorial uppercase text-gray-400 mb-8">
            Start tracking your finances
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-mono tracking-editorial uppercase text-gray-400 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="Your name"
              />
            </div>
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
                minLength={8}
                className="w-full bg-transparent border-0 border-b border-cream-300 pb-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-900 transition-colors"
                placeholder="Min. 8 characters"
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 hover:text-gold-600 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
