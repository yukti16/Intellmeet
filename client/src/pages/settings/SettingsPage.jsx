import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { User, Shield, Video, Bell, Save } from 'lucide-react';

export const SettingsPage = () => {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [department, setDepartment] = useState(user?.department || 'Engineering');
  const [bio, setBio] = useState(user?.bio || '');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMsg('');

    try {
      const updateData = { name, jobTitle, department, bio };
      if (password) updateData.password = password;

      const res = await userService.updateUser(user._id, updateData);
      updateUserProfile(res.user);
      setStatusMsg('Profile and preferences updated successfully!');
      setPassword('');
    } catch (err) {
      console.error(err);
      setStatusMsg('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Account & Platform Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage profile, meeting hardware preferences, and security</p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded-xl">
          {statusMsg}
        </div>
      )}

      {/* Profile Section */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider mb-2">
            <User className="w-4 h-4" /> Personal Profile
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email Address" value={user?.email} disabled readOnly />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product Design">Product Design</option>
                <option value="Executive">Executive</option>
                <option value="Product Management">Product Management</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Bio / Note</label>
            <textarea
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your team a little about yourself..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Shield className="w-4 h-4" /> Security & Password
          </div>

          <Input
            label="New Password (Leave blank to keep unchanged)"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-1.5" /> Save All Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
