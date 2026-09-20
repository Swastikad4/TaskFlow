const { io: ioClient } = require('socket.io-client');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const request = async (method, path, body = null, token = null) => {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = res.status;
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status, data };
};

const runRealtimeTests = async () => {
  console.log('====================================================');
  console.log('⚡ Starting TaskFlow Phase 4 Multi-User Real-Time Test');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();
    const managerEmail = `manager_rt_${timestamp}@taskflow.dev`;
    const memberEmail = `member_rt_${timestamp}@taskflow.dev`;
    const adminEmail = `admin_rt_${timestamp}@taskflow.dev`;

    // 1. Register Manager, Member, Admin
    console.log('--- 1. User Setup for Multi-Client Session ---');
    const regManager = await request('POST', '/auth/register', {
      name: 'Manager Alice',
      email: managerEmail,
      password: 'password123',
      role: 'Manager',
    });
    const managerToken = regManager.data?.data?.token;
    const managerUser = regManager.data?.data?.user;

    const regMember = await request('POST', '/auth/register', {
      name: 'Developer Bob',
      email: memberEmail,
      password: 'password123',
      role: 'Team Member',
    });
    const memberToken = regMember.data?.data?.token;
    const memberUser = regMember.data?.data?.user;

    const regAdmin = await request('POST', '/auth/register', {
      name: 'Admin Charlie',
      email: adminEmail,
      password: 'password123',
      role: 'Admin',
    });
    const adminToken = regAdmin.data?.data?.token;

    assert(managerToken && memberToken && adminToken, 'All 3 test users created with tokens');

    // 2. Connect Two Concurrent Sockets (Manager & Member)
    console.log('\n--- 2. Multi-Client Socket.IO Initialization ---');
    const socketManager = ioClient(SOCKET_URL, { transports: ['websocket'] });
    const socketMember = ioClient(SOCKET_URL, { transports: ['websocket'] });

    await Promise.all([
      new Promise((resolve) => socketManager.on('connect', resolve)),
      new Promise((resolve) => socketMember.on('connect', resolve)),
    ]);

    assert(socketManager.connected && socketMember.connected, 'Both Manager and Team Member sockets connected');

    // Join user-specific rooms
    socketManager.emit('join_user_room', managerUser.id);
    socketMember.emit('join_user_room', memberUser.id);
    await new Promise((r) => setTimeout(r, 200));

    // 3. Real-Time Task Creation & Direct Assignment
    console.log('\n--- 3. Real-Time Task Creation & Targeted Assignment ---');
    let memberReceivedAssignedEvent = null;
    let memberReceivedNotifEvent = null;
    let globalTaskCreatedEvent = null;

    socketMember.on('taskAssigned', (task) => {
      memberReceivedAssignedEvent = task;
    });

    socketMember.on('notificationCreated', (notif) => {
      memberReceivedNotifEvent = notif;
    });

    socketManager.on('taskCreated', (task) => {
      globalTaskCreatedEvent = task;
    });

    // Manager creates task and assigns to Member
    const createTaskRes = await request(
      'POST',
      '/tasks',
      {
        title: 'Optimize Database Query Caching',
        description: 'Add compound indexes and implement read caches.',
        assignedTo: memberUser.id,
        priority: 'High',
        status: 'To Do',
      },
      managerToken
    );

    const createdTaskId = createTaskRes.data?.data?.task?._id;
    assert(createTaskRes.status === 201 && createdTaskId, 'Manager successfully created task via REST API');

    // Wait 400ms for websocket delivery
    await new Promise((r) => setTimeout(r, 400));

    assert(
      globalTaskCreatedEvent && globalTaskCreatedEvent._id === createdTaskId,
      'Manager received global "taskCreated" event'
    );

    assert(
      memberReceivedAssignedEvent && memberReceivedAssignedEvent._id === createdTaskId,
      'Team Member received targeted "taskAssigned" event in real-time'
    );

    assert(
      memberReceivedNotifEvent && memberReceivedNotifEvent.type === 'TASK_ASSIGNED',
      'Team Member received targeted "notificationCreated" event in real-time'
    );

    // 4. Real-Time Status Change & Room Collaboration
    console.log('\n--- 4. Real-Time Task Status Change ---');
    // Both join the specific task room
    socketManager.emit('join_task_room', createdTaskId);
    socketMember.emit('join_task_room', createdTaskId);
    await new Promise((r) => setTimeout(r, 200));

    let managerReceivedStatusChangeEvent = null;
    let managerReceivedNotifOnStatusChange = null;

    socketManager.on('taskStatusChanged', (task) => {
      managerReceivedStatusChangeEvent = task;
    });

    socketManager.on('notificationCreated', (notif) => {
      managerReceivedNotifOnStatusChange = notif;
    });

    // Team Member updates status to "In Progress"
    const updateStatusRes = await request(
      'PUT',
      `/tasks/${createdTaskId}`,
      { status: 'In Progress' },
      memberToken
    );

    assert(updateStatusRes.status === 200, 'Team Member updated task status to "In Progress"');

    await new Promise((r) => setTimeout(r, 400));

    assert(
      managerReceivedStatusChangeEvent && managerReceivedStatusChangeEvent.status === 'In Progress',
      'Manager received real-time "taskStatusChanged" broadcast'
    );

    assert(
      managerReceivedNotifOnStatusChange && managerReceivedNotifOnStatusChange.type === 'TASK_STATUS_CHANGED',
      'Manager received "TASK_STATUS_CHANGED" notification in real-time'
    );

    // 5. Real-Time Comments Stream
    console.log('\n--- 5. Real-Time Live Comments Stream ---');
    let managerReceivedCommentEvent = null;
    let managerReceivedCommentNotif = null;

    socketManager.on('commentAdded', (comment) => {
      managerReceivedCommentEvent = comment;
    });

    socketManager.on('notificationCreated', (notif) => {
      if (notif.type === 'COMMENT_ADDED') {
        managerReceivedCommentNotif = notif;
      }
    });

    // Team Member posts comment
    const postCommentRes = await request(
      'POST',
      `/tasks/${createdTaskId}/comments`,
      { text: 'Indexes created and tested with explain plan!' },
      memberToken
    );

    assert(postCommentRes.status === 201, 'Team Member posted a comment');

    await new Promise((r) => setTimeout(r, 400));

    assert(
      managerReceivedCommentEvent && managerReceivedCommentEvent.text.includes('explain plan'),
      'Manager received real-time "commentAdded" event in task room'
    );

    assert(
      managerReceivedCommentNotif && managerReceivedCommentNotif.type === 'COMMENT_ADDED',
      'Manager received real-time "COMMENT_ADDED" notification'
    );

    // 6. Real-Time Task Deletion
    console.log('\n--- 6. Real-Time Task Deletion ---');
    let memberReceivedDeleteEvent = null;

    socketMember.on('taskDeleted', ({ taskId }) => {
      memberReceivedDeleteEvent = taskId;
    });

    // Admin deletes task
    const deleteRes = await request('DELETE', `/tasks/${createdTaskId}`, null, adminToken);
    assert(deleteRes.status === 200, 'Admin deleted task');

    await new Promise((r) => setTimeout(r, 400));

    assert(
      memberReceivedDeleteEvent === createdTaskId,
      'Team Member received real-time "taskDeleted" event'
    );

    // Cleanup sockets
    socketManager.disconnect();
    socketMember.disconnect();

    console.log('\n====================================================');
    console.log(`🏁 Real-Time Multi-User Suite: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Real-time test suite exception:', error);
    process.exit(1);
  }
};

runRealtimeTests();
