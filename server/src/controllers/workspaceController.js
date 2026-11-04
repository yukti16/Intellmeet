const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const Notification = require('../models/Notification');

// Helper: check user permission in workspace
// Returns { isOwner, isWorkspaceAdmin, isMember, membership }
const getWorkspaceUserRole = async (workspace, userId, globalRole) => {
  const isGlobalAdmin = globalRole === 'Admin';
  const isOwner = workspace.owner.toString() === userId.toString();

  const membership = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: userId,
  });

  const isWorkspaceAdmin = isOwner || isGlobalAdmin || (membership && membership.role === 'Admin');
  const isMember = isOwner || isGlobalAdmin || Boolean(membership) || workspace.members.some(m => m.toString() === userId.toString());

  return { isOwner, isWorkspaceAdmin, isMember, membership, isGlobalAdmin };
};

// @desc    Get user workspaces
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res, next) => {
  try {
    const { search } = req.query;

    // Find workspaces where user is owner or member
    const memberships = await WorkspaceMember.find({ user: req.user._id });
    const workspaceIds = memberships.map(m => m.workspace);

    let filter = {
      $or: [{ owner: req.user._id }, { _id: { $in: workspaceIds } }, { members: req.user._id }],
    };

    if (search && search.trim()) {
      filter.$and = [
        { $or: [{ owner: req.user._id }, { _id: { $in: workspaceIds } }, { members: req.user._id }] },
        {
          $or: [
            { name: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } },
          ],
        },
      ];
    }

    const workspaces = await Workspace.find(filter)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle status')
      .sort({ updatedAt: -1 });

    // Include counts for meetings and pending action items for each workspace
    const enrichedWorkspaces = await Promise.all(
      workspaces.map(async (ws) => {
        const meetingCount = await Meeting.countDocuments({ workspace: ws._id });
        return {
          ...ws.toObject(),
          meetingCount,
          memberCount: ws.members?.length || 1,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedWorkspaces.length,
      workspaces: enrichedWorkspaces,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single workspace by ID with populated details
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const workspace = await Workspace.findById(id)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department status')
      .populate('resources.createdBy', 'name email avatar')
      .populate('invitations.invitedBy', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Permission check: must be owner, member, or global admin
    const { isMember } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace',
      });
    }

    const membersDetail = await WorkspaceMember.find({ workspace: workspace._id }).populate(
      'user',
      'name email avatar jobTitle department status'
    );

    // Get workspace meetings
    const meetings = await Meeting.find({ workspace: workspace._id })
      .populate('host', 'name email avatar jobTitle')
      .populate('participants', 'name email avatar jobTitle status')
      .populate('actionItems')
      .sort({ scheduledAt: -1 });

    const meetingIds = meetings.map(m => m._id);

    // Get workspace action items linked to its meetings
    const actionItems = await ActionItem.find({ meeting: { $in: meetingIds } })
      .populate('meeting', 'title meetingCode scheduledAt')
      .populate('assignedTo', 'name email avatar jobTitle')
      .populate('createdBy', 'name email avatar')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      workspace,
      membersDetail,
      meetings,
      actionItems,
      stats: {
        totalMembers: workspace.members.length,
        totalMeetings: meetings.length,
        upcomingMeetings: meetings.filter(m => m.status === 'scheduled' || new Date(m.scheduledAt) > new Date()).length,
        pendingActionItems: actionItems.filter(a => a.status !== 'Completed').length,
        completedActionItems: actionItems.filter(a => a.status === 'Completed').length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required and cannot be empty',
      });
    }

    const membersList = Array.isArray(memberIds)
      ? memberIds.filter(id => mongoose.Types.ObjectId.isValid(id))
      : [];
    if (!membersList.some(id => id.toString() === req.user._id.toString())) {
      membersList.push(req.user._id);
    }

    const workspace = await Workspace.create({
      name: trimmedName,
      description: typeof description === 'string' ? description.trim() : '',
      owner: req.user._id,
      members: membersList,
      resources: [],
    });

    // Create WorkspaceMember entry for owner (Admin role)
    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: req.user._id },
      { workspace: workspace._id, user: req.user._id, role: 'Admin' },
      { upsert: true, new: true }
    );

    // Create entries for other members
    for (const mId of membersList) {
      if (mId.toString() !== req.user._id.toString()) {
        await WorkspaceMember.findOneAndUpdate(
          { workspace: workspace._id, user: mId },
          { workspace: workspace._id, user: mId, role: 'Member' },
          { upsert: true, new: true }
        );
      }
    }

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle status');

    res.status(201).json({
      success: true,
      workspace: populatedWorkspace,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace details
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace Owner, Admin, or system Admin can modify workspace details',
      });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: 'Workspace name cannot be empty',
        });
      }
      workspace.name = trimmed;
    }
    if (description !== undefined) {
      workspace.description = typeof description === 'string' ? description.trim() : '';
    }

    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department status');

    res.status(200).json({
      success: true,
      workspace: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete workspace (safe deletion - nullifies meeting workspace ref, retains records)
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const isOwner = workspace.owner.toString() === req.user._id.toString();
    const isGlobalAdmin = req.user.role === 'Admin';

    if (!isOwner && !isGlobalAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner or system Admin can delete this workspace',
      });
    }

    // Safe deletion: nullify workspace field in associated meetings rather than silently deleting meetings
    await Meeting.updateMany({ workspace: workspace._id }, { $set: { workspace: null } });

    // Remove workspace member records
    await WorkspaceMember.deleteMany({ workspace: workspace._id });

    // Delete workspace document
    await Workspace.findByIdAndDelete(workspace._id);

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully. Associated meetings were safely disassociated.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get eligible users for workspace (registered users not yet in workspace)
// @route   GET /api/workspaces/:id/eligible-users
// @access  Private
const getEligibleWorkspaceUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isMember } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace members can view eligible users',
      });
    }

    // Exclude current workspace members
    const memberIds = workspace.members.map((m) => m.toString());

    let userQuery = {
      _id: { $nin: memberIds },
    };

    if (search && search.trim()) {
      const q = search.trim();
      userQuery.$and = [
        { _id: { $nin: memberIds } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { jobTitle: { $regex: q, $options: 'i' } },
            { department: { $regex: q, $options: 'i' } },
          ],
        },
      ];
    }

    const users = await User.find(userQuery)
      .select('name email avatar jobTitle department status')
      .sort({ name: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Invite external / unregistered user to workspace via email
// @route   POST /api/workspaces/:id/invitations
// @access  Private
const inviteWorkspaceMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    // RFC-compliant email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace Owner, Admin, or system Admin can invite members',
      });
    }

    // Check if user with this email is already registered
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      // Check if already a member
      const isAlreadyMember = workspace.members.some((m) => m.toString() === existingUser._id.toString());
      if (isAlreadyMember) {
        return res.status(400).json({
          success: false,
          message: `${existingUser.name} (${trimmedEmail}) is already a member of this workspace`,
        });
      }

      // Add them directly as a member since they are already registered
      workspace.members.push(existingUser._id);
      await workspace.save();

      const validRole = ['Admin', 'Manager', 'Member'].includes(role) ? role : 'Member';
      await WorkspaceMember.findOneAndUpdate(
        { workspace: workspace._id, user: existingUser._id },
        { workspace: workspace._id, user: existingUser._id, role: validRole },
        { upsert: true, new: true }
      );

      // Notify the registered user
      await Notification.create({
        user: existingUser._id,
        type: 'workspace_added',
        title: `Added to ${workspace.name}`,
        message: `${req.user.name} added you to workspace "${workspace.name}" as ${validRole}`,
        link: `/workspaces/${workspace._id}`,
      });

      const updatedWorkspace = await Workspace.findById(workspace._id)
        .populate('owner', 'name email avatar jobTitle department')
        .populate('members', 'name email avatar jobTitle department status')
        .populate('resources.createdBy', 'name email avatar')
        .populate('invitations.invitedBy', 'name email avatar');

      const membersDetail = await WorkspaceMember.find({ workspace: workspace._id }).populate(
        'user',
        'name email avatar jobTitle department status'
      );

      return res.status(200).json({
        success: true,
        message: `Registered user ${existingUser.name} was added directly to the workspace`,
        joinedDirectly: true,
        workspace: updatedWorkspace,
        membersDetail,
      });
    }

    // If not registered, create or update a pending invitation
    if (!Array.isArray(workspace.invitations)) {
      workspace.invitations = [];
    }

    const existingInvite = workspace.invitations.find(
      (inv) => inv.email.toLowerCase() === trimmedEmail && inv.status === 'pending'
    );

    const validRole = ['Admin', 'Manager', 'Member'].includes(role) ? role : 'Member';

    if (existingInvite) {
      existingInvite.role = validRole;
      existingInvite.invitedBy = req.user._id;
      existingInvite.invitedAt = new Date();
    } else {
      workspace.invitations.push({
        email: trimmedEmail,
        role: validRole,
        invitedBy: req.user._id,
        status: 'pending',
        invitedAt: new Date(),
      });
    }

    await workspace.save();

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('invitations.invitedBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${trimmedEmail}. They will be automatically enrolled once they sign up.`,
      invitations: populatedWorkspace.invitations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel workspace invitation
// @route   DELETE /api/workspaces/:id/invitations/:inviteId
// @access  Private
const cancelWorkspaceInvitation = async (req, res, next) => {
  try {
    const { id, inviteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(inviteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID or invitation ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace Owner, Admin, or system Admin can cancel invitations',
      });
    }

    workspace.invitations.pull(inviteId);
    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
      invitations: workspace.invitations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to workspace
// @route   POST /api/workspaces/:id/members
// @access  Private
const addWorkspaceMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID or user ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace Owner, Admin, or system Admin can add members',
      });
    }

    // Check if already a member
    const alreadyMember = workspace.members.some(m => m.toString() === userId.toString());
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this workspace',
      });
    }

    workspace.members.push(userId);
    await workspace.save();

    const validRole = ['Admin', 'Manager', 'Member'].includes(role) ? role : 'Member';
    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: userId },
      { workspace: workspace._id, user: userId, role: validRole },
      { upsert: true, new: true }
    );

    const membersDetail = await WorkspaceMember.find({ workspace: workspace._id }).populate(
      'user',
      'name email avatar jobTitle department status'
    );

    const updatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department status');

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
      workspace: updatedWorkspace,
      membersDetail,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace member role
// @route   PUT /api/workspaces/:id/members/:userId
// @access  Private
const updateWorkspaceMemberRole = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID or user ID',
      });
    }

    if (!['Admin', 'Manager', 'Member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Admin, Manager, or Member',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isOwner, isGlobalAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isOwner && !isGlobalAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner or system Admin can change member roles',
      });
    }

    // Owner role cannot be changed through this endpoint
    if (workspace.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change owner role directly',
      });
    }

    const updatedMember = await WorkspaceMember.findOneAndUpdate(
      { workspace: id, user: userId },
      { role },
      { new: true }
    ).populate('user', 'name email avatar jobTitle department status');

    if (!updatedMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in workspace',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from workspace
// @route   DELETE /api/workspaces/:id/members/:userId
// @access  Private
const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID or user ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Cannot remove owner
    if (workspace.owner.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the workspace owner from the workspace',
      });
    }

    const isSelf = req.user._id.toString() === userId.toString();
    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);

    // User can remove themselves (leave workspace) or an admin can remove them
    if (!isSelf && !isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace Owner, Admin, or the member themselves can perform removal',
      });
    }

    workspace.members = workspace.members.filter(m => m.toString() !== userId.toString());
    await workspace.save();

    await WorkspaceMember.findOneAndDelete({ workspace: id, user: userId });

    const membersDetail = await WorkspaceMember.find({ workspace: workspace._id }).populate(
      'user',
      'name email avatar jobTitle department status'
    );

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace',
      membersDetail,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add resource/note to workspace
// @route   POST /api/workspaces/:id/resources
// @access  Private
const addWorkspaceResource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, category, linkUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const { isMember } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace members can add resources',
      });
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Resource title is required',
      });
    }

    const resource = {
      title: trimmedTitle,
      content: typeof content === 'string' ? content.trim() : '',
      category: ['note', 'document', 'link', 'guideline'].includes(category) ? category : 'note',
      linkUrl: typeof linkUrl === 'string' ? linkUrl.trim() : '',
      createdBy: req.user._id,
    };

    workspace.resources.push(resource);
    await workspace.save();

    const populated = await Workspace.findById(workspace._id).populate('resources.createdBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Resource added successfully',
      resources: populated.resources,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete resource/note from workspace
// @route   DELETE /api/workspaces/:id/resources/:resourceId
// @access  Private
const deleteWorkspaceResource = async (req, res, next) => {
  try {
    const { id, resourceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID or resource ID',
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const resource = workspace.resources.id(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const isCreator = resource.createdBy.toString() === req.user._id.toString();
    const { isWorkspaceAdmin } = await getWorkspaceUserRole(workspace, req.user._id, req.user.role);

    if (!isCreator && !isWorkspaceAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the resource creator or workspace Admin can delete this resource',
      });
    }

    workspace.resources.pull(resourceId);
    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'Resource removed successfully',
      resources: workspace.resources,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getEligibleWorkspaceUsers,
  inviteWorkspaceMember,
  cancelWorkspaceInvitation,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  addWorkspaceResource,
  deleteWorkspaceResource,
};
