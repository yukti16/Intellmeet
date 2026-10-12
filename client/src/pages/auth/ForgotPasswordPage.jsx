import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mic, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 text-white shadow-xl shadow-brand-600/30 mb-4">
          <Mic className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Reset Password</h2>
        <p className="mt-2 text-xs text-slate-400">Enter your email to receive password reset instructions</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Reset Link Dispatched</h4>
              <p className="text-xs text-slate-400">
                If an account exists for <span className="text-slate-200 font-semibold">{email}</span>, password reset instructions have been sent.
              </p>
              <Link to="/login">
                <Button variant="secondary" size="sm" className="w-full mt-4">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" size="lg" className="w-full">
                Send Reset Link
              </Button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-slate-200">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
