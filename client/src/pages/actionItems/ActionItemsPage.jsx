import React, { useState, useEffect } from 'react';
import { actionItemService } from '../../services/actionItemService';
import { ActionItemCard } from '../../components/actionItem/ActionItemCard';
import { CreateActionItemModal } from '../../components/actionItem/CreateActionItemModal';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { CheckSquare, Plus, Search, Filter, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ActionItemsPage = () => {
  const [actionItems, setActionItems] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchActionItems = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;

      const res = await actionItemService.getActionItems(params);
      setActionItems(res.actionItems || []);
    } catch (err) {
      console.error('[ActionItemsPage Error]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [filterStatus, filterPriority]);

  const handleStatusChange = (updatedItem) => {
    setActionItems((prev) =>
      prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
    );
  };

  const handleCreated = (newItem) => {
    setActionItems((prev) => [newItem, ...prev]);
  };

  // Filter client-side by search query
  const displayedItems = actionItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const titleMatch = item.title?.toLowerCase().includes(q);
    const descMatch = item.description?.toLowerCase().includes(q);
    const assigneeMatch = item.assignedTo?.name?.toLowerCase().includes(q);
    const meetingMatch = item.meeting?.title?.toLowerCase().includes(q);
    return titleMatch || descMatch || assigneeMatch || meetingMatch;
  });

  const pendingCount = actionItems.filter((i) => i.status === 'Pending').length;
  const inProgressCount = actionItems.filter((i) => i.status === 'In Progress').length;
  const completedCount = actionItems.filter((i) => i.status === 'Completed').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-brand-500" />
            Action Items & Tasks
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track, assign, and complete meeting deliverables and AI-extracted tasks
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" /> Add Action Item
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-sm">
            {actionItems.length}
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            <h4 className="text-lg font-extrabold text-white">{actionItems.length}</h4>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
            <h4 className="text-lg font-extrabold text-white">{pendingCount}</h4>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
            <h4 className="text-lg font-extrabold text-white">{inProgressCount}</h4>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed</span>
            <h4 className="text-lg font-extrabold text-white">{completedCount}</h4>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex-1 w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search action items by title, assignee, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Filters */}
          {['all', 'Pending', 'In Progress', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all' ? 'All Status' : st}
            </button>
          ))}

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Action Items Grid */}
      {isLoading ? (
        <LoadingSpinner label="Loading action items..." />
      ) : displayedItems.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No action items found"
          description={
            search || filterStatus !== 'all' || filterPriority !== 'all'
              ? 'No action items match the active filters or search terms.'
              : 'You have no action items recorded yet. Action items will be extracted automatically from your meeting transcripts or you can add one manually.'
          }
          actionLabel="Add Action Item"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map((item) => (
            <ActionItemCard
              key={item._id}
              actionItem={item}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create Action Item Modal */}
      <CreateActionItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};
