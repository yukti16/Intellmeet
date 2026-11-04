import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceService } from '../../services/workspaceService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceOverview } from '../../components/workspace/WorkspaceOverview';
import { WorkspaceMembers } from '../../components/workspace/WorkspaceMembers';
import { WorkspaceMeetings } from '../../components/workspace/WorkspaceMeetings';
import { WorkspaceActionItems } from '../../components/workspace/WorkspaceActionItems';
import { WorkspaceResources } from '../../components/workspace/WorkspaceResources';
import { AddMemberModal } from '../../components/workspace/AddMemberModal';
import { EditWorkspaceModal } from '../../components/workspace/EditWorkspaceModal';
import { CreateMeetingModal } from '../../components/meeting/CreateMeetingModal';
import { CreateActionItemModal } from '../../components/actionItem/CreateActionItemModal';
import { EditActionItemModal } from '../../components/actionItem/EditActionItemModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import {
  Briefcase,
  Users,
  Video,
  CheckSquare,
  FileText,
  ArrowLeft,
  Edit2,
  Trash2,
  LayoutDashboard,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const WorkspaceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [workspace, setWorkspace] = useState(null);
  const [membersDetail, setMembersDetail] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [isCreateActionItemOpen, setIsCreateActionItemOpen] = useState(false);
  const [editingActionItem, setEditingActionItem] = useState(null);

  const fetchWorkspaceData = async () => {
    setIsLoading(true);
    try {
      const wsRes = await workspaceService.getWorkspaceById(id);

      setWorkspace(wsRes.workspace);
      setMembersDetail(wsRes.membersDetail || []);
      setMeetings(wsRes.meetings || []);
      setActionItems(wsRes.actionItems || []);
      setStats(wsRes.stats || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to load workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  if (isLoading) return <LoadingSpinner label="Loading workspace data & resources..." />;

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

  const currentUserId = user?._id;
  const isOwner = workspace.owner?._id === currentUserId || workspace.owner === currentUserId;
  const currentMembership = membersDetail.find((m) => m.user?._id === currentUserId);
  const isWorkspaceAdmin = isOwner || isAdmin || currentMembership?.role === 'Admin';

  // Available users to add (filter out current members)
  const memberUserIds = new Set(workspace.members?.map((m) => m._id || m) || []);
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u._id));

  // Handlers
  const handleUpdateWorkspace = async (workspaceId, updateData) => {
    const res = await workspaceService.updateWorkspace(workspaceId, updateData);
    setWorkspace(res.workspace);
    toast.success('Workspace updated successfully');
  };

  const handleDeleteWorkspace = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${workspace.name}"? All associated meetings and tasks will be safely preserved. This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await workspaceService.deleteWorkspace(workspace._id);
      toast.success('Workspace deleted successfully');
      navigate('/workspaces');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const handleAddMember = async ({ userId, role }) => {
    const res = await workspaceService.addMember(workspace._id, { userId, role });
    setWorkspace(res.workspace);
    setMembersDetail(res.membersDetail || []);
    setStats((prev) => (prev ? { ...prev, totalMembers: res.workspace.members.length } : prev));
    toast.success('Member added to workspace');
  };

  const handleInvitationSent = async ({ email, role }) => {
    const res = await workspaceService.inviteMember(workspace._id, { email, role });
    if (res.joinedDirectly) {
      setWorkspace(res.workspace);
      setMembersDetail(res.membersDetail || []);
      setStats((prev) => (prev ? { ...prev, totalMembers: res.workspace.members.length } : prev));
      toast.success(res.message || 'User added directly to workspace');
    } else {
      setWorkspace((prev) => ({
        ...prev,
        invitations: res.invitations,
      }));
      toast.success(res.message || 'Invitation sent successfully');
    }
  };

  const handleCancelInvitation = async (inviteId, email) => {
    if (!window.confirm(`Cancel invitation for ${email}?`)) return;
    try {
      const res = await workspaceService.cancelInvitation(workspace._id, inviteId);
      setWorkspace((prev) => ({
        ...prev,
        invitations: res.invitations,
      }));
      toast.success('Invitation cancelled');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await workspaceService.updateMemberRole(workspace._id, userId, newRole);
      setMembersDetail((prev) =>
        prev.map((m) => (m.user?._id === userId ? { ...m, role: newRole } : m))
      );
      toast.success('Role updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId, memberName, isSelf) => {
    const promptMsg = isSelf
      ? 'Are you sure you want to leave this workspace?'
      : `Are you sure you want to remove ${memberName || 'this member'} from the workspace?`;

    if (!window.confirm(promptMsg)) return;

    try {
      const res = await workspaceService.removeMember(workspace._id, userId);
      if (isSelf) {
        toast.success('You have left the workspace');
        navigate('/workspaces');
      } else {
        setMembersDetail(res.membersDetail || []);
        setWorkspace((prev) => ({
          ...prev,
          members: prev.members.filter((m) => (m._id || m) !== userId),
        }));
        setStats((prev) => (prev ? { ...prev, totalMembers: Math.max(0, prev.totalMembers - 1) } : prev));
        toast.success('Member removed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleMeetingDelete = (deletedMeeting) => {
    setMeetings((prev) => prev.filter((m) => m._id !== deletedMeeting._id));
    setStats((prev) =>
      prev
        ? {
            ...prev,
            totalMeetings: Math.max(0, prev.totalMeetings - 1),
            upcomingMeetings:
              deletedMeeting.status === 'scheduled'
                ? Math.max(0, prev.upcomingMeetings - 1)
                : prev.upcomingMeetings,
          }
        : prev
    );
  };

  const handleAddResource = async (resourceData) => {
    const res = await workspaceService.addResource(workspace._id, resourceData);
    setWorkspace((prev) => ({ ...prev, resources: res.resources }));
    toast.success('Resource added to workspace');
  };

  const handleDeleteResource = async (resourceId, title) => {
    if (!window.confirm(`Delete resource "${title}"?`)) return;
    try {
      const res = await workspaceService.deleteResource(workspace._id, resourceId);
      setWorkspace((prev) => ({ ...prev, resources: res.resources }));
      toast.success('Resource removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove resource');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'members', label: `Members (${workspace.members?.length || 0})`, icon: Users },
    { id: 'meetings', label: `Meetings (${meetings.length})`, icon: Video },
    { id: 'action-items', label: `Action Items (${actionItems.length})`, icon: CheckSquare },
    { id: 'resources', label: `Resources (${workspace.resources?.length || 0})`, icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={() => navigate('/workspaces')}
        className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Workspaces
      </button>

      {/* Workspace Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Team Workspace
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl">
            {workspace.description || 'No description specified for this team workspace.'}
          </p>
        </div>

        {isWorkspaceAdmin && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsEditOpen(true)} variant="secondary" size="sm">
              <Edit2 className="w-4 h-4 mr-1.5 text-brand-400" /> Edit Details
            </Button>
            {isOwner && (
              <Button onClick={handleDeleteWorkspace} variant="outline" size="sm" className="text-rose-400 hover:bg-rose-950/40 border-rose-800/40">
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <WorkspaceOverview
          workspace={workspace}
          stats={stats}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'members' && (
        <WorkspaceMembers
          workspace={workspace}
          membersDetail={membersDetail}
          invitations={workspace.invitations || []}
          currentUserId={currentUserId}
          isOwner={isOwner}
          isWorkspaceAdmin={isWorkspaceAdmin}
          onOpenAddModal={() => setIsAddMemberOpen(true)}
          onUpdateRole={handleUpdateMemberRole}
          onRemoveMember={handleRemoveMember}
          onCancelInvitation={handleCancelInvitation}
        />
      )}

      {activeTab === 'meetings' && (
        <WorkspaceMeetings
          meetings={meetings}
          onOpenCreateMeeting={() => setIsCreateMeetingOpen(true)}
          onMeetingDelete={handleMeetingDelete}
        />
      )}

      {activeTab === 'action-items' && (
        <WorkspaceActionItems
          actionItems={actionItems}
          onOpenCreateActionItem={
            meetings.length > 0 ? () => setIsCreateActionItemOpen(true) : null
          }
          onEditActionItem={(item) => setEditingActionItem(item)}
          onRefresh={fetchWorkspaceData}
        />
      )}

      {activeTab === 'resources' && (
        <WorkspaceResources
          resources={workspace.resources || []}
          currentUserId={currentUserId}
          isWorkspaceAdmin={isWorkspaceAdmin}
          onAddResource={handleAddResource}
          onDeleteResource={handleDeleteResource}
        />
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        workspaceId={workspace._id}
        onMemberAdded={handleAddMember}
        onInvitationSent={handleInvitationSent}
      />

      <EditWorkspaceModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        workspace={workspace}
        onUpdated={handleUpdateWorkspace}
      />

      <CreateMeetingModal
        isOpen={isCreateMeetingOpen}
        onClose={() => setIsCreateMeetingOpen(false)}
        defaultWorkspaceId={workspace._id}
        onCreated={() => fetchWorkspaceData()}
      />

      {meetings.length > 0 && (
        <CreateActionItemModal
          isOpen={isCreateActionItemOpen}
          onClose={() => setIsCreateActionItemOpen(false)}
          meetingId={meetings[0]._id}
          onCreated={() => fetchWorkspaceData()}
        />
      )}

      <EditActionItemModal
        isOpen={!!editingActionItem}
        actionItem={editingActionItem}
        onClose={() => setEditingActionItem(null)}
        onUpdated={() => {
          fetchWorkspaceData();
          setEditingActionItem(null);
        }}
        onDeleted={() => {
          fetchWorkspaceData();
          setEditingActionItem(null);
        }}
      />
    </div>
  );
};
