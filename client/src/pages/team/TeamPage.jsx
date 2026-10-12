import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Users, Search, Mail, Shield } from 'lucide-react';

export const TeamPage = () => {
  const [users, setUsers] = useState([]);
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (department) params.department = department;
      if (search.trim()) params.search = search;

      const res = await userService.getUsers(params);
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [department]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Team Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Cross-functional enterprise team members and roles</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <form onSubmit={handleSearch} className="flex-1 w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search team members by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </form>

        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full sm:w-48 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Product Design">Product Design</option>
          <option value="Executive">Executive</option>
          <option value="Product Management">Product Management</option>
        </select>
      </div>

      {/* Member Cards Grid */}
      {isLoading ? (
        <LoadingSpinner label="Loading team members..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => (
            <div key={u._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-start gap-4">
              <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100 truncate">{u.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {u.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{u.jobTitle}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{u.department}</p>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <a href={`mailto:${u.email}`} className="text-slate-400 hover:text-brand-400 flex items-center gap-1.5 transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[140px]">{u.email}</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
