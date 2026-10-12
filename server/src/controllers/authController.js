const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, jobTitle, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'Member',
      department: department || 'Engineering',
      jobTitle: jobTitle || 'Team Member',
      bio: bio || '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    console.log('[Login] Received email:', email);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log('[Login] User found:', !!user);
    if (!user) {
      console.error('[Login] No user found for email');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const passwordMatches = await bcrypt.compare(password, user.password);
    console.log('[Login] Password matches:', passwordMatches);
    if (!passwordMatches) {
      console.error('[Login] Invalid password');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    user.status = 'active';
    user.lastSeen = new Date();
    try {
      await user.save({ validateBeforeSave: false });
    } catch (saveErr) {
      console.error('[Login] Error saving user:', saveErr);
      return res.status(500).json({ success: false, message: 'Server error during login' });
    }
    let token;
    try {
      token = generateToken(user._id, user.role);
    } catch (tokenErr) {
      console.error('[Login] Token generation error:', tokenErr);
      return res.status(500).json({ success: false, message: 'Token generation failed' });
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear session
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
};
