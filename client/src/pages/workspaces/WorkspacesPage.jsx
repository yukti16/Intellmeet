import React, { useState, useEffect } from 'react';
import { workspaceService } from '../../services/workspaceService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Briefcase, Plus, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const res = await workspaceService.getWorkspaces();
      setWorkspaces(res.workspaces || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await workspaceService.createWorkspace({ name, description });
      setWorkspaces((prev) => [res.workspace, ...prev]);
      setIsModalOpen(false);
      setName('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading workspaces..." />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Team Workspaces</h1>
          <p className="text-xs text-slate-400 mt-1">Organize meetings, documentation, and members by team</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" /> Create Workspace
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws) => (
          <div
            key={ws._id}
            onClick={() => navigate(`/workspaces/${ws._id}`)}
            className="bg-slate-900 border border-slate-800 hover:border-brand-500/40 rounded-2xl p-6 shadow-xl transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-400 transition-colors">
                {ws.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {ws.description || 'No description specified.'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{ws.members?.length || 1} Members</span>
              </div>

              <span className="text-brand-400 font-semibold flex items-center gap-1">
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Workspace Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Team Workspace">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Workspace Name *"
            placeholder="e.g. Core Architecture Squad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows="3"
              placeholder="What does this workspace focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
