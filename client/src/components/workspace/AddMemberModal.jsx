import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { workspaceService } from '../../services/workspaceService';
import {
  Search,
  UserPlus,
  Mail,
  Check,
  ChevronDown,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
} from 'lucide-react';

export const AddMemberModal = ({
  isOpen,
  onClose,
  workspaceId,
  onMemberAdded,
  onInvitationSent,
}) => {
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' | 'invite'
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [role, setRole] = useState('Member');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Invite by email state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch eligible users directly from backend MongoDB whenever modal opens
  const fetchEligibleUsers = async () => {
    if (!workspaceId) return;
    setIsLoadingUsers(true);
    setError('');
    try {
      const res = await workspaceService.getEligibleUsers(workspaceId);
      setEligibleUsers(res.users || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch eligible users from server');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEligibleUsers();
      setSelectedUser(null);
      setSearchQuery('');
      setInviteEmail('');
      setError('');
      setActiveTab('existing');
      setIsDropdownOpen(false);
    }
  }, [isOpen, workspaceId]);

  // Handle clicking outside custom dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users by search query (name, email, jobTitle, department)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return eligibleUsers;
    const q = searchQuery.toLowerCase().trim();
    return eligibleUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.jobTitle?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [eligibleUsers, searchQuery]);

  // Handle adding an existing registered user
  const handleAddExistingUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select a team member from the list');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onMemberAdded({ userId: selectedUser._id, role });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inviting unregistered / external user via email
  const handleInviteEmail = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = inviteEmail.trim().toLowerCase();

    if (!trimmed || !emailRegex.test(trimmed)) {
      setError('Please provide a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onInvitationSent({ email: trimmed, role: inviteRole });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member to Workspace">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 pb-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('existing');
              setError('');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'existing'
                ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Registered Team Members
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('invite');
              setError('');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'invite'
                ? 'bg-brand-600/10 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Invite by Email
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: Search & Select Registered User */}
        {activeTab === 'existing' && (
          <form onSubmit={handleAddExistingUser} className="space-y-4">
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Team Member *
              </label>

              {/* Custom Searchable Dropdown */}
              <div className="relative">
                <div
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-xl text-slate-100 text-sm flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors"
                >
                  {selectedUser ? (
                    <div className="flex items-center gap-2.5 truncate">
                      <img
                        src={
                          selectedUser.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            selectedUser.name
                          )}`
                        }
                        alt={selectedUser.name}
                        className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"
                      />
                      <span className="font-semibold text-white">{selectedUser.name}</span>
                      <span className="text-xs text-slate-400 truncate">({selectedUser.email})</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">
                      {isLoadingUsers ? 'Loading members...' : 'Search or choose registered user...'}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-72">
                    {/* Search Field */}
                    <div className="p-2 border-b border-slate-800 bg-slate-950/70 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <input
                        type="text"
                        placeholder="Search by name, email, department or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    {/* Users List */}
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-850">
                      {isLoadingUsers ? (
                        <div className="p-4 text-center">
                          <LoadingSpinner label="Fetching registered members..." />
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-6 text-center space-y-2">
                          <p className="text-xs text-slate-400">
                            {searchQuery
                              ? `No eligible users matching "${searchQuery}"`
                              : 'All registered users are already in this workspace.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('invite');
                              setIsDropdownOpen(false);
                            }}
                            className="text-xs text-brand-400 hover:underline font-semibold"
                          >
                            Invite someone new via email →
                          </button>
                        </div>
                      ) : (
                        filteredUsers.map((u) => {
                          const isSelected = selectedUser?._id === u._id;
                          return (
                            <div
                              key={u._id}
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDropdownOpen(false);
                              }}
                              className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-colors ${
                                isSelected ? 'bg-brand-500/10' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={
                                    u.avatar ||
                                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                      u.name
                                    )}`
                                  }
                                  alt={u.name}
                                  className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-white truncate">
                                      {u.name}
                                    </span>
                                    {u.department && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                        {u.department}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {u.email} {u.jobTitle ? `• ${u.jobTitle}` : ''}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Workspace Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="Member">Member (View meetings & participate in tasks)</option>
                <option value="Manager">Manager (Schedule meetings & manage action items)</option>
                <option value="Admin">Admin (Full workspace and member management)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !selectedUser}
              >
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: Invite by Email (Unregistered or External) */}
        {activeTab === 'invite' && (
          <form onSubmit={handleInviteEmail} className="space-y-4">
            <div className="p-3 bg-brand-950/20 border border-brand-800/30 rounded-xl text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-brand-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Workspace Email Invitation
              </p>
              <p className="text-[11px] text-slate-400">
                If the email is already registered, they will be enrolled directly. If not, a pending invitation will be created securely until they sign up.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Member Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="colleague@yourcompany.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Assigned Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="Member">Member (View & Participate)</option>
                <option value="Manager">Manager (Schedule & Manage Items)</option>
                <option value="Admin">Admin (Manage Members & Settings)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !inviteEmail.trim()}
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
