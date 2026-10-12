import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Mic, ArrowRight } from 'lucide-react';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [department, setDepartment] = useState('Engineering');
  const [jobTitle, setJobTitle] = useState('Software Specialist');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register({
        name,
        email,
        password,
        role,
        department,
        jobTitle,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated with a valid session
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 text-white shadow-xl shadow-brand-600/30 mb-4">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Active Session Detected</h2>
          <p className="mt-2 text-xs text-slate-400">You are already logged in to IntellMeet</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-center">
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 mb-6 flex items-center gap-4 text-left">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                alt={user.name}
                className="w-12 h-12 rounded-full border border-slate-600 bg-slate-700 object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] bg-brand-500/20 text-brand-400 font-semibold px-2 py-0.5 rounded">
                  {user.role} • {user.department || 'General'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="primary"
                size="lg"
                className="w-full"
              >
                Continue to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                onClick={async () => {
                  await logout();
                  setName('');
                  setEmail('');
                  setPassword('');
                }}
                variant="secondary"
                size="lg"
                className="w-full text-slate-300 hover:text-white"
              >
                Register a New Account (Sign Out)
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-purple-600 text-white shadow-xl shadow-brand-600/30 mb-4">
          <Mic className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Create IntellMeet Account</h2>
        <p className="mt-2 text-xs text-slate-400">Join enterprise collaboration powered by AI</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Eleanor Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Work Email *"
              type="email"
              placeholder="eleanor@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password *"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="Member">Member</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
              Register Account <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
