import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../../services/workspaceService';
import { meetingService } from '../../services/meetingService';
import { userService } from '../../services/userService';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Briefcase, Users, Plus, ArrowLeft, UserPlus } from 'lucide-react';

export const WorkspaceDetailsPage = () => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWorkspace = async () => {
    setIsLoading(true);
    try {
      const [wsRes, mRes, uRes] = await Promise.all([
        workspaceService.getWorkspaceById(id),
        meetingService.getMeetings({ workspace: id }),
        userService.getUsers(),
      ]);
      setWorkspace(wsRes.workspace);
      setMeetings(mRes.meetings || []);
      setUsers(uRes.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await workspaceService.addMember(id, { userId: selectedUser });
      setIsAddModalOpen(false);
      fetchWorkspace();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <LoadingSpinner label="Loading workspace data..." />;

  if (!workspace) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-slate-200">Workspace Not Found</h3>
        <Button onClick={() => navigate('/workspaces')} variant="secondary" className="mt-4">
          Back to Workspaces
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <button
        onClick={() => navigate('/workspaces')}
        className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Workspaces
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-extrabold text-white">{workspace.name}</h1>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">{workspace.description}</p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} variant="secondary" size="sm">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Team Member
        </Button>
      </div>

      {/* Members & Meetings Tabs */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-white">Workspace Meetings</h3>
        {meetings.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No meetings scheduled in this workspace yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((m) => (
              <MeetingCard key={m._id} meeting={m} />
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Member to Workspace">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Select Team Member
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Select User...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.jobTitle} • {u.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
