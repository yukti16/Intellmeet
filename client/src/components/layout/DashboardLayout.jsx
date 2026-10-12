import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Menu, Search, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { meetingService } from '../../services/meetingService';
import { userService } from '../../services/userService';

export const DashboardLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ meetings: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ meetings: [], users: [] });
      return;
    }

    setIsSearching(true);
    try {
      const [mRes, uRes] = await Promise.all([
        meetingService.getMeetings({ search: query }),
        userService.getUsers({ search: query }),
      ]);
      setSearchResults({
        meetings: mRes.meetings || [],
        users: uRes.users || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm tracking-tight text-white">
            INTELL<span className="text-brand-500">MEET</span>
          </span>
          <div className="w-8" />
        </div>

        {/* Top Navbar */}
        <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

        {/* Page Body View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery('');
          setSearchResults({ meetings: [], users: [] });
        }}
        title="Global Search"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search meetings by title/code or team members..."
            value={searchQuery}
            onChange={handleSearch}
            autoFocus
          />

          {isSearching && (
            <p className="text-xs text-slate-400 text-center py-4">Searching IntellMeet database...</p>
          )}

          {!isSearching && searchQuery.trim() && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Meetings */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Meetings</h5>
                {searchResults.meetings.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">No matching meetings found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.meetings.map((m) => (
                      <div
                        key={m._id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/meetings/${m._id}`);
                        }}
                        className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <h6 className="text-xs font-bold text-slate-200">{m.title}</h6>
                          <span className="text-[10px] text-slate-400">Code: {m.meetingCode} • Status: {m.status}</span>
                        </div>
                        <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">View</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users */}
              <div>
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Team Members</h5>
                {searchResults.users.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">No matching members found.</p>
                ) : (
                  <div className="space-y-1.5">
                    {searchResults.users.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          navigate(`/team`);
                        }}
                        className="p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors flex items-center gap-3"
                      >
                        <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full bg-slate-700" />
                        <div>
                          <h6 className="text-xs font-bold text-slate-200">{u.name}</h6>
                          <span className="text-[10px] text-slate-400">{u.jobTitle} • {u.department}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
