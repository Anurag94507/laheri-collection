import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import { toast } from '../../store/toast.js';
import { IconArrowRight, IconLock, IconUser } from '../../components/Icons.jsx';

export default function AdminLogin() {
  const { login, user, check, checked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!checked) check();
  }, [checked, check]);

  useEffect(() => {
    if (user) navigate('/admin/dashboard', { replace: true });
  }, [user, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      toast.success('Welcome back to the shop.');
      navigate(location.state?.from || '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-surface lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'url(/images/hero.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy/90 to-navy/50" />

        <Link to="/" className="relative flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-12 w-12 rounded-full ring-1 ring-gold/40" />
          <div>
            <p className="font-display text-2xl">Laheri Collection</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-parchment/50">Shop operations</p>
          </div>
        </Link>

        <div className="relative max-w-md">
          <p className="eyebrow">Shopkeeper console</p>
          <h1 className="mt-3 text-[46px] leading-[1.02] text-surface">Run the counter and the catalogue from one place.</h1>
          <p className="mt-4 text-sm leading-relaxed text-parchment/55">
            Generate walk-in bills, keep every customer contact in the CRM, send WhatsApp campaigns and watch the
            day’s numbers — all without leaving the website.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-parchment/15 pt-6 text-xs text-parchment/55">
            <p>Today’s sales &amp; bills</p>
            <p>Offline billing with GST</p>
            <p>Customer CRM &amp; segments</p>
            <p>Bulk WhatsApp &amp; email</p>
          </div>
        </div>

        <p className="relative text-[10px] uppercase tracking-[0.2em] text-parchment/35">
          Protected area · JWT session · 24 hour expiry
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-2 text-xs text-ink/45 transition hover:text-navy lg:hidden">
            ← Back to shop
          </Link>
          <p className="eyebrow">Admin access</p>
          <h2 className="mt-2 text-[36px] leading-none">Sign in</h2>
          <p className="mt-2 text-sm text-ink/50">Only the shopkeeper can open this console.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <div className="relative">
                <IconUser size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  id="username"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  className="input pl-10"
                  placeholder="admin"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <IconLock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="input pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-navy w-full">
              {submitting ? 'Signing in…' : 'Open dashboard'} <IconArrowRight size={15} />
            </button>
          </form>

          <div className="mt-7 rounded-xl border border-navy/10 bg-white p-4 text-[11px] leading-relaxed text-ink/50">
            <p className="font-semibold uppercase tracking-[0.14em] text-navy/60">Demo login</p>
            <p className="mt-1.5">Username <span className="font-mono text-navy">admin</span> · Password <span className="font-mono text-navy">shop12345</span></p>
            <p className="mt-1">Change these in <span className="font-mono">server/.env</span> before going live.</p>
          </div>

          <Link to="/" className="mt-8 hidden text-xs text-ink/40 transition hover:text-navy lg:block">← Back to the shop</Link>
        </div>
      </div>
    </div>
  );
}
