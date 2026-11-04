import React, { useState, useEffect, useMemo } from 'react';
import { workspaceService } from '../../services/workspaceService';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceCard } from '../../components/workspace/WorkspaceCard';
import { CreateWorkspaceModal } from '../../components/workspace/CreateWorkspaceModal';
import { EditWorkspaceModal } from '../../components/workspace/EditWorkspaceModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Briefcase, Plus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export const WorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const { user, isAdmin } = useAuth();

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.workspaces || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (workspaceData) => {
    const res = await workspaceService.createWorkspace(workspaceData);
    setWorkspaces((prev) => [res.workspace, ...prev]);
    toast.success('Workspace created successfully');
  };

  const handleUpdate = async (workspaceId, updateData) => {
    const res = await workspaceService.updateWorkspace(workspaceId, updateData);
    setWorkspaces((prev) =>
      prev.map((ws) => (ws._id === workspaceId ? { ...ws, ...res.workspace } : ws))
    );
    toast.success('Workspace updated successfully');
  };

  const handleDelete = async (workspace) => {
    if (
      !window.confirm(
        `Are you sure you want to delete workspace "${workspace.name}"? Associated meetings will be safely kept and unlinked. This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await workspaceService.deleteWorkspace(workspace._id);
      setWorkspaces((prev) => prev.filter((ws) => ws._id !== workspace._id));
      toast.success('Workspace deleted successfully');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete workspace';
      toast.error(msg);
    }
  };

  const displayedWorkspaces = useMemo(() => {
    let result = [...workspaces];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (ws) =>
          ws.name?.toLowerCase().includes(q) ||
          ws.description?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'members') {
      result.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
    } else {
      // Recent (default)
      result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    return result;
  }, [workspaces, search, sortBy]);

  if (isLoading) return <LoadingSpinner label="Loading workspaces..." />;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Team Workspaces</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize meetings, documentations, and members into focused collaboration spaces
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" /> Create Workspace
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex-1 w-full sm:w-auto relative">
          <input
            type="text"
            placeholder="Search workspaces by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="recent">Recently Active</option>
            <option value="name">Alphabetical (A-Z)</option>
            <option value="members">Most Members</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty State */}
      {displayedWorkspaces.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search ? 'No matching workspaces found' : 'No workspaces yet'}
          description={
            search
              ? 'Try modifying your search criteria to find relevant team spaces.'
              : 'Create your first workspace to organize meetings, share resources, and assign tasks with your team.'
          }
          actionLabel="Create Workspace"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedWorkspaces.map((ws) => {
            const isOwner = ws.owner?._id === user?._id || ws.owner === user?._id;
            const isOwnerOrAdmin = isOwner || isAdmin;

            return (
              <WorkspaceCard
                key={ws._id}
                workspace={ws}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onEdit={(target) => setEditingWorkspace(target)}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreate}
      />

      {/* Edit Modal */}
      <EditWorkspaceModal
        isOpen={!!editingWorkspace}
        workspace={editingWorkspace}
        onClose={() => setEditingWorkspace(null)}
        onUpdated={handleUpdate}
      />
    </div>
  );
};
