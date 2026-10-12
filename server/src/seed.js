const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('./models/User');
const Workspace = require('./models/Workspace');
const WorkspaceMember = require('./models/WorkspaceMember');
const Meeting = require('./models/Meeting');
const Message = require('./models/Message');
const ActionItem = require('./models/ActionItem');
const Notification = require('./models/Notification');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intellmeet';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMember.deleteMany({});
    await Meeting.deleteMany({});
    await Message.deleteMany({});
    await ActionItem.deleteMany({});
    await Notification.deleteMany({});

    console.log('[Seed] Cleared existing collection data.');

    // 1. Create Demo Users
    const adminUser = await User.create({
      name: 'Sarah Connor',
      email: 'admin@intellmeet.com',
      password: 'password123',
      role: 'Admin',
      department: 'Executive',
      jobTitle: 'VP of Engineering',
      bio: 'Leading cross-functional product and infrastructure teams at IntellMeet.',
      status: 'active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahConnor',
    });

    const managerUser = await User.create({
      name: 'Alex Rivera',
      email: 'manager@intellmeet.com',
      password: 'password123',
      role: 'Manager',
      department: 'Engineering',
      jobTitle: 'Engineering Manager',
      bio: 'Focused on developer productivity and real-time media streams.',
      status: 'active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexRivera',
    });

    const memberUser = await User.create({
      name: 'Priya Sharma',
      email: 'member@intellmeet.com',
      password: 'password123',
      role: 'Member',
      department: 'Product Design',
      jobTitle: 'Senior UI/UX Specialist',
      bio: 'Designing accessible, high-performance meeting interfaces.',
      status: 'active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaSharma',
    });

    console.log('[Seed] Demo Users Created:');
    console.log('  1. Admin: admin@intellmeet.com / password123');
    console.log('  2. Manager: manager@intellmeet.com / password123');
    console.log('  3. Member: member@intellmeet.com / password123');

    // 2. Create Demo Workspace
    const workspace = await Workspace.create({
      name: 'Core Architecture Workspace',
      description: 'Primary collaboration space for platform development & product roadmap syncs.',
      owner: adminUser._id,
      members: [adminUser._id, managerUser._id, memberUser._id],
    });

    await WorkspaceMember.create([
      { workspace: workspace._id, user: adminUser._id, role: 'Admin' },
      { workspace: workspace._id, user: managerUser._id, role: 'Manager' },
      { workspace: workspace._id, user: memberUser._id, role: 'Member' },
    ]);

    console.log('[Seed] Demo Workspace Created:', workspace.name);

    // 3. Create Demo Meetings
    const demoMeeting1 = await Meeting.create({
      title: 'Q4 Product Roadmap & WebRTC Architecture Sync',
      description: 'Review quarter goals, WebRTC signaling performance, and AI transcript integration.',
      host: adminUser._id,
      workspace: workspace._id,
      participants: [adminUser._id, managerUser._id, memberUser._id],
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      duration: 45,
      meetingCode: 'INT-8F3K29',
      status: 'ended',
      transcript: [
        { speaker: 'Sarah Connor', text: 'Welcome everyone! Today we are aligning on our WebRTC stream latency and AI summary engine.', timestamp: '10:00:15' },
        { speaker: 'Alex Rivera', text: 'Our Socket.io signaling layer now handles 50+ concurrent peers seamlessly.', timestamp: '10:01:40' },
        { speaker: 'Priya Sharma', text: 'The new responsive video grid layout is fully optimized for mobile devices.', timestamp: '10:03:10' },
        { speaker: 'Sarah Connor', text: 'Awesome. Let us ensure all action items are assigned and tracked in IntellMeet dashboard.', timestamp: '10:05:00' },
      ],
      summary: {
        executiveSummary: 'The engineering leadership team reviewed Q4 priorities, confirming successful WebRTC optimization and responsive UI upgrades.',
        mainPoints: [
          'Socket.io signaling layer scaled for high-concurrency room connections.',
          'UI/UX team completed responsive video grid tile design.',
          'OpenAI summary extraction pipeline integrated into meeting post-processing.',
        ],
        decisions: [
          'Approved deployment of WebRTC fallback TURN server config.',
          'Standardized single-click meeting link creation.',
        ],
        risks: ['Screen share resolution scaling on ultra-high DPI mobile screens.'],
        followUp: ['Schedule deep dive on socket authentication middleware next week.'],
      },
      keyPoints: [
        'WebRTC video streams maintaining sub-100ms latency.',
        'AI Action Item extraction pipeline active.',
        'Team velocity increased by 25%.',
      ],
    });

    const demoMeeting2 = await Meeting.create({
      title: 'Weekly Engineering & Sprint Planning',
      description: 'Sprint planning and backlog refinement session.',
      host: managerUser._id,
      workspace: workspace._id,
      participants: [adminUser._id, managerUser._id, memberUser._id],
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30,
      meetingCode: 'INT-9X4M77',
      status: 'scheduled',
    });

    console.log('[Seed] Demo Meetings Created: INT-8F3K29, INT-9X4M77');

    // 4. Create Demo Action Items
    const action1 = await ActionItem.create({
      meeting: demoMeeting1._id,
      title: 'Finalize WebRTC Signaling Reconnection Logic',
      description: 'Ensure ICE candidate renegotiation happens cleanly when user toggles networks.',
      assignedTo: managerUser._id,
      priority: 'High',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'In Progress',
    });

    const action2 = await ActionItem.create({
      meeting: demoMeeting1._id,
      title: 'Audit Dark Navy & Soft Pink UI Color Contrast',
      description: 'Verify accessibility contrast scores across all dashboard cards.',
      assignedTo: memberUser._id,
      priority: 'Medium',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'Pending',
    });

    demoMeeting1.actionItems = [action1._id, action2._id];
    await demoMeeting1.save();

    console.log('[Seed] Demo Action Items Created.');

    // 5. Create Demo Messages
    await Message.create([
      {
        meeting: demoMeeting1._id,
        sender: adminUser._id,
        content: 'Starting the meeting now, please join the audio stream!',
      },
      {
        meeting: demoMeeting1._id,
        sender: managerUser._id,
        content: 'Joined! Video and mic are crystal clear.',
      },
      {
        meeting: demoMeeting1._id,
        sender: memberUser._id,
        content: 'Sharing the Figma mockups in screen share now.',
      },
    ]);

    // 6. Create Demo Notifications
    await Notification.create([
      {
        user: adminUser._id,
        type: 'summary_ready',
        title: 'AI Summary Ready: Q4 Product Roadmap',
        message: 'Your meeting summary and 3 action items have been processed.',
        link: `/meetings/${demoMeeting1._id}`,
      },
      {
        user: managerUser._id,
        type: 'action_assigned',
        title: 'Action Item Assigned: WebRTC Signaling Logic',
        message: 'Sarah Connor assigned you a high priority action item.',
        link: `/meetings/${demoMeeting1._id}`,
      },
    ]);

    console.log('[Seed] Database Seeding Completed Successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedData();
