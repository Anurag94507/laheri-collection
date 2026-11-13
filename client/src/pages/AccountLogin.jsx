import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  customerPasswordLogin,
  requestOtp,
  resetCustomerPassword,
  verifyOtp,
} from '../api/index.js';
import { loadBagIntoCart, useCustomer } from '../store/customer.js';
import { toast } from '../store/toast.js';
import { IconCheck, IconLock, IconMail, IconPhone, IconWhatsApp } from '../components/Icons.jsx';

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: IconWhatsApp },
  { value: 'sms', label: 'SMS', icon: IconPhone },
  { value: 'email', label: 'Email', icon: IconMail },
];

export default function AccountLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAccount = useCustomer((state) => state.setAccount);
  const redirectTo = location.state?.from || '/account';

  const [mode, setMode] = useState('otp'); // otp | password | reset
  const [step, setStep] = useState('identify'); // identify | code
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);

  const isEmail = identifier.includes('@');

  const finish = async (account) => {
    setAccount(account);
    await loadBagIntoCart();
    toast.success(`Welcome${account?.name ? `, ${account.name.split(' ')[0]}` : ''}!`);
    navigate(redirectTo, { replace: true });
  };

  const sendCode = async (event) => {
    event?.preventDefault();
    if (!identifier.trim()) return toast.error('Enter your mobile number or email.');
    setBusy(true);
    try {
      const purposes = mode === 'reset' ? 'reset' : 'login';
      const result = await requestOtp({
        identifier: identifier.trim(),
        channel: isEmail ? 'email' : channel,
        purpose: purposes,
      });
      setDevCode(result.devCode || '');
      setCode('');
      setStep('code');
      toast.success(result.message || 'Code sent.');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    if (code.trim().length !== 6) return toast.error('Enter the 6-digit code.');
    setBusy(true);
    try {
      if (mode === 'reset') {
        if (newPassword.length < 6) {
          toast.error('Use at least 6 characters for the new password.');
          return;
        }
        const result = await resetCustomerPassword({
          identifier: identifier.trim(),
          code: code.trim(),
          password: newPassword,
        });
        toast.success(result.message || 'Password updated.');
        setMode('password');
        setStep('identify');
        setCode('');
        setNewPassword('');
      } else {
        const result = await verifyOtp({ identifier: identifier.trim(), code: code.trim() });
        await finish(result.account);
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await customerPasswordLogin({ identifier: identifier.trim(), password });
      await finish(result.account);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Email or password is incorrect.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setStep('identify');
    setCode('');
    setPassword('');
    setNewPassword('');
    setDevCode('');
  };

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-navy/10 bg-surface shadow-lift">
        <div className="bg-navy px-7 py-7 text-surface">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-12 w-12 rounded-full ring-1 ring-gold/40" />
            <div>
              <p className="font-display text-2xl leading-none">Customer login</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-parchment/50">
                Bag · orders · offers
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-parchment/60">
            Browse the collection freely — login is only needed to save your bag, place an order and see
            your past purchases.
          </p>
        </div>

        <div className="px-7 py-7">
          <div className="mb-6 flex rounded-full bg-navy/5 p-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => switchMode('otp')}
              className={`flex-1 rounded-full px-3 py-2 transition ${mode === 'otp' ? 'bg-navy text-surface' : 'text-ink/55'}`}
            >
              OTP login
            </button>
            <button
              type="button"
              onClick={() => switchMode('password')}
              className={`flex-1 rounded-full px-3 py-2 transition ${mode === 'password' ? 'bg-navy text-surface' : 'text-ink/55'}`}
            >
              Email + password
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${step}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {mode === 'password' ? (
                <form onSubmit={submitPassword} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                      Email address
                    </span>
                    <input
                      type="email"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className="input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                      Password
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="input"
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </label>
                  <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60">
                    {busy ? 'Checking…' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      switchMode('reset');
                    }}
                    className="w-full text-center text-[11px] text-ink/45 underline underline-offset-4 hover:text-gold-dark"
                  >
                    Forgot password?
                  </button>
                </form>
              ) : step === 'identify' ? (
                <form onSubmit={sendCode} className="space-y-4">
                  {mode === 'reset' && (
                    <p className="rounded-xl bg-gold/10 px-4 py-3 text-xs text-navy/70">
                      Enter the email on your account. We will send a code to reset your password.
                    </p>
                  )}
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                      Mobile number or email
                    </span>
                    <input
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      className="input"
                      placeholder="98765 43210 or you@example.com"
                      autoComplete="username"
                    />
                  </label>

                  {!isEmail && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                        Send the code on
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {CHANNELS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setChannel(option.value)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition ${
                              channel === option.value
                                ? 'border-gold bg-gold/10 text-navy'
                                : 'border-navy/10 text-ink/50 hover:border-gold/50'
                            }`}
                          >
                            <option.icon size={14} />
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60">
                    {busy ? 'Sending…' : mode === 'reset' ? 'Send reset code' : 'Send OTP'}
                  </button>
                  <p className="text-center text-[11px] text-ink/40">
                    No password needed — we send a 6-digit code each time.
                  </p>
                </form>
              ) : (
                <form onSubmit={submitCode} className="space-y-4">
                  <p className="rounded-xl bg-navy/5 px-4 py-3 text-xs leading-relaxed text-navy/60">
                    Code sent to <span className="font-semibold text-navy">{identifier}</span>.
                    {devCode && (
                      <>
                        {' '}
                        Demo code:{' '}
                        <span className="font-mono text-sm font-bold tracking-[0.2em] text-gold-dark">{devCode}</span>
                      </>
                    )}
                  </p>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                      6-digit code
                    </span>
                    <input
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input text-center font-mono text-xl tracking-[0.4em]"
                      inputMode="numeric"
                      placeholder="000000"
                      autoFocus
                    />
                  </label>

                  {mode === 'reset' && (
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
                        New password
                      </span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="input"
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                      />
                    </label>
                  )}

                  <button type="submit" disabled={busy} className="btn-gold w-full disabled:opacity-60">
                    {busy ? 'Verifying…' : mode === 'reset' ? 'Save new password' : 'Verify & login'}
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-ink/45">
                    <button type="button" onClick={() => setStep('identify')} className="underline underline-offset-4 hover:text-navy">
                      Change number
                    </button>
                    <button type="button" onClick={sendCode} disabled={busy} className="underline underline-offset-4 hover:text-gold-dark">
                      Resend code
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 space-y-2 border-t border-navy/10 pt-5 text-[11px] text-ink/45">
            <p className="flex items-start gap-2">
              <IconCheck size={13} className="mt-0.5 flex-none text-gold-dark" />
              Any mobile number works — an account is created the first time you login.
            </p>
            <p className="flex items-start gap-2">
              <IconLock size={13} className="mt-0.5 flex-none text-gold-dark" />
              Your bag and every order stay attached to your number and email.
            </p>
          </div>

          <p className="mt-5 text-center text-[11px] text-ink/40">
            Shopkeeper?{' '}
            <Link to="/admin/login" className="font-medium text-navy underline underline-offset-4">
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
