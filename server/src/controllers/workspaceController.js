const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');

// @desc    Get user workspaces
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res, next) => {
  try {
    // Find workspaces where user is owner or member
    const memberships = await WorkspaceMember.find({ user: req.user._id });
    const workspaceIds = memberships.map(m => m.workspace);

    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { _id: { $in: workspaceIds } }],
    })
      .populate('owner', 'name email avatar jobTitle')
      .populate('members', 'name email avatar jobTitle status')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single workspace by ID
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar jobTitle department')
      .populate('members', 'name email avatar jobTitle department status');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const membersDetail = await WorkspaceMember.find({ workspace: workspace._id }).populate(
      'user',
      'name email avatar jobTitle department status'
    );

    res.status(200).json({
      success: true,
      workspace,
      membersDetail,
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

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required',
      });
    }

    const membersList = Array.isArray(memberIds) ? memberIds : [];
    if (!membersList.includes(req.user._id.toString())) {
      membersList.push(req.user._id);
    }

    const workspace = await Workspace.create({
      name,
      description: description || '',
      owner: req.user._id,
      members: membersList,
    });

    // Create WorkspaceMember entry for owner
    await WorkspaceMember.create({
      workspace: workspace._id,
      user: req.user._id,
      role: 'Admin',
    });

    // Create entries for other members
    for (const mId of membersList) {
      if (mId.toString() !== req.user._id.toString()) {
        await WorkspaceMember.create({
          workspace: workspace._id,
          user: mId,
          role: 'Member',
        });
      }
    }

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(201).json({
      success: true,
      workspace: populatedWorkspace,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    if (workspace.owner.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner or Admin can modify workspace details',
      });
    }

    const { name, description } = req.body;
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;

    await workspace.save();

    res.status(200).json({
      success: true,
      workspace,
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
    const { userId, role } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    if (!workspace.members.includes(userId)) {
      workspace.members.push(userId);
      await workspace.save();
    }

    await WorkspaceMember.findOneAndUpdate(
      { workspace: workspace._id, user: userId },
      { workspace: workspace._id, user: userId, role: role || 'Member' },
      { upsert: true, new: true }
    );

    const updatedWorkspace = await Workspace.findById(workspace._id).populate('members', 'name email avatar jobTitle');

    res.status(200).json({
      success: true,
      workspace: updatedWorkspace,
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
    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    workspace.members = workspace.members.filter(m => m.toString() !== userId);
    await workspace.save();

    await WorkspaceMember.findOneAndDelete({ workspace: id, user: userId });

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace',
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
  addWorkspaceMember,
  removeWorkspaceMember,
};
