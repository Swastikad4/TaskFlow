const http = require('http');
const { io: ioClient } = require('socket.io-client');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// Helper for HTTP requests
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

// Test Runner
const runBackendTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting TaskFlow Phase 2 Complete Backend Test Suite');
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
    // 1. Health Check
    console.log('--- 1. Health Check & API Connectivity ---');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.status === 'online', 'GET /api/health returns 200 online status');

    // 2. Authentication: Registration
    console.log('\n--- 2. Authentication: User Registration ---');
    const uniqueSuffix = Date.now();
    const adminEmail = `admin_${uniqueSuffix}@taskflow.dev`;
    const managerEmail = `manager_${uniqueSuffix}@taskflow.dev`;
    const memberEmail = `member_${uniqueSuffix}@taskflow.dev`;

    const regAdmin = await request('POST', '/auth/register', {
      name: 'System Admin',
      email: adminEmail,
      password: 'password123',
      role: 'Admin',
    });
    assert(regAdmin.status === 201 && regAdmin.data.data.token, 'Register Admin returns 201 and JWT token');
    const adminToken = regAdmin.data?.data?.token;
    const adminUser = regAdmin.data?.data?.user;

    const regManager = await request('POST', '/auth/register', {
      name: 'Product Manager',
      email: managerEmail,
      password: 'password123',
      role: 'Manager',
    });
    assert(regManager.status === 201 && regManager.data.data.token, 'Register Manager returns 201 and JWT token');
    const managerToken = regManager.data?.data?.token;
    const managerUser = regManager.data?.data?.user;

    const regMember = await request('POST', '/auth/register', {
      name: 'Core Developer',
      email: memberEmail,
      password: 'password123',
      role: 'Team Member',
    });
    assert(regMember.status === 201 && regMember.data.data.token, 'Register Team Member returns 201 and JWT token');
    const memberToken = regMember.data?.data?.token;
    const memberUser = regMember.data?.data?.user;

    // Duplicate email check
    const dupReg = await request('POST', '/auth/register', {
      name: 'Duplicate User',
      email: adminEmail,
      password: 'password123',
    });
    assert(dupReg.status === 400, 'Duplicate email registration rejected with 400');

    // Missing field check
    const invalidReg = await request('POST', '/auth/register', {
      name: 'Incomplete',
      email: 'bademail',
    });
    assert(invalidReg.status === 400, 'Missing password / invalid payload rejected with 400');

    // 3. Authentication: Login & JWT verification
    console.log('\n--- 3. Authentication: Login & JWT Tokens ---');
    const loginValid = await request('POST', '/auth/login', {
      email: adminEmail,
      password: 'password123',
    });
    assert(loginValid.status === 200 && loginValid.data.data.token, 'Valid login returns 200 and token');

    const loginWrongPass = await request('POST', '/auth/login', {
      email: adminEmail,
      password: 'wrong_password',
    });
    assert(loginWrongPass.status === 401, 'Invalid password rejected with 401 Unauthorized');

    const loginWrongEmail = await request('POST', '/auth/login', {
      email: 'nonexistent@taskflow.dev',
      password: 'password123',
    });
    assert(loginWrongEmail.status === 401, 'Non-existent email rejected with 401 Unauthorized');

    // Test GET /auth/me
    const meValid = await request('GET', '/auth/me', null, adminToken);
    assert(meValid.status === 200 && meValid.data.data.user.email === adminEmail, 'GET /auth/me with valid token returns user profile');

    const meNoToken = await request('GET', '/auth/me');
    assert(meNoToken.status === 401, 'GET /auth/me without token returns 401');

    const meBadToken = await request('GET', '/auth/me', null, 'invalid_jwt_token');
    assert(meBadToken.status === 401, 'GET /auth/me with bad token returns 401');

    // 4. Socket.IO Real-Time Listener Setup
    console.log('\n--- 4. Socket.IO Real-Time Connection & Events ---');
    const socketClient = ioClient(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    let socketConnected = false;
    let receivedTaskCreated = false;
    let receivedCommentAdded = false;

    await new Promise((resolve) => {
      socketClient.on('connect', () => {
        socketConnected = true;
        socketClient.emit('join_user_room', memberUser.id);
        resolve();
      });
      setTimeout(resolve, 1500);
    });
    assert(socketConnected, 'Socket.IO client connected to backend server');

    socketClient.on('taskCreated', () => {
      receivedTaskCreated = true;
    });

    socketClient.on('commentAdded', () => {
      receivedCommentAdded = true;
    });

    // 5. Tasks CRUD & Role Authorization
    console.log('\n--- 5. Tasks CRUD & RBAC Authorization ---');

    // 5a. Team Member tries to create task -> should fail (403)
    const memberCreateTask = await request(
      'POST',
      '/tasks',
      { title: 'Unauthorized Task Creation' },
      memberToken
    );
    assert(memberCreateTask.status === 403, 'Team Member cannot create tasks (403 Forbidden)');

    // 5b. Manager creates task assigned to Member -> should succeed (201)
    const managerCreateTask = await request(
      'POST',
      '/tasks',
      {
        title: 'Build Telemetry Segmented Progress Bar',
        description: 'Implement multi-color LED bars with CSS transitions.',
        assignedTo: memberUser.id,
        priority: 'High',
        status: 'To Do',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      managerToken
    );
    assert(managerCreateTask.status === 201 && managerCreateTask.data.data.task._id, 'Manager creates task & assigns to Member (201 Created)');
    const createdTask = managerCreateTask.data?.data?.task;

    // Join task room
    if (createdTask) {
      socketClient.emit('join_task_room', createdTask._id);
    }

    // 5c. Admin creates a second task (unassigned)
    const adminCreateTask = await request(
      'POST',
      '/tasks',
      {
        title: 'Global System Architecture Review',
        description: 'Verify database indexing and caching strategy.',
        priority: 'Urgent',
        status: 'To Do',
      },
      adminToken
    );
    assert(adminCreateTask.status === 201, 'Admin creates task (201 Created)');
    const adminTaskId = adminCreateTask.data?.data?.task?._id;

    // 5d. Role-based Visibility:
    // Admin should see both tasks
    const adminTasksList = await request('GET', '/tasks', null, adminToken);
    assert(adminTasksList.status === 200 && adminTasksList.data.data.count >= 2, `Admin sees all tasks (${adminTasksList.data.data.count} tasks)`);

    // Member should only see their assigned task
    const memberTasksList = await request('GET', '/tasks', null, memberToken);
    assert(
      memberTasksList.status === 200 &&
      memberTasksList.data.data.tasks.every(
        (t) => t.assignedTo?._id === memberUser.id || t.createdBy?._id === memberUser.id
      ),
      'Team Member only sees tasks assigned to/created by them'
    );

    // 5e. Filtering & Search
    const searchFilter = await request('GET', '/tasks?search=Telemetry', null, adminToken);
    assert(
      searchFilter.status === 200 && searchFilter.data.data.tasks.length >= 1,
      'Search query parameter filters tasks by title/description'
    );

    const priorityFilter = await request('GET', '/tasks?priority=High', null, adminToken);
    assert(
      priorityFilter.status === 200 && priorityFilter.data.data.tasks.every((t) => t.priority === 'High'),
      'Priority query parameter filters tasks by priority'
    );

    // 5f. Team Member attempts to edit title (restricted field) -> 403
    const memberEditTitle = await request(
      'PUT',
      `/tasks/${createdTask._id}`,
      { title: 'Hacked Title' },
      memberToken
    );
    assert(memberEditTitle.status === 403, 'Team Member cannot edit restricted task fields (403 Forbidden)');

    // 5g. Team Member updates status to "In Progress" -> 200
    const memberUpdateStatus = await request(
      'PUT',
      `/tasks/${createdTask._id}`,
      { status: 'In Progress' },
      memberToken
    );
    assert(
      memberUpdateStatus.status === 200 && memberUpdateStatus.data.data.task.status === 'In Progress',
      'Team Member can update status on assigned task (200 OK)'
    );

    // 5h. Deletion RBAC:
    // Team Member attempts to delete -> 403
    const memberDelete = await request('DELETE', `/tasks/${adminTaskId}`, null, memberToken);
    assert(memberDelete.status === 403, 'Team Member cannot delete tasks (403 Forbidden)');

    // Manager attempts to delete -> 403
    const managerDelete = await request('DELETE', `/tasks/${adminTaskId}`, null, managerToken);
    assert(managerDelete.status === 403, 'Manager cannot delete tasks (403 Forbidden)');

    // Admin deletes task -> 200
    const adminDelete = await request('DELETE', `/tasks/${adminTaskId}`, null, adminToken);
    assert(adminDelete.status === 200, 'Admin can delete tasks (200 OK)');

    // 6. Comments
    console.log('\n--- 6. Comments API ---');
    const addComment = await request(
      'POST',
      `/tasks/${createdTask._id}/comments`,
      { text: 'Initial implementation finished. Ready for review!' },
      memberToken
    );
    assert(addComment.status === 201 && addComment.data.data.comment.text, 'Post comment on task (201 Created)');

    const getComments = await request('GET', `/tasks/${createdTask._id}/comments`, null, managerToken);
    assert(getComments.status === 200 && getComments.data.data.count >= 1, 'Get comments for task (200 OK)');

    // 7. Notifications
    console.log('\n--- 7. Notifications API ---');
    // Team Member received notification on task assignment
    const memberNotifs = await request('GET', '/notifications', null, memberToken);
    assert(
      memberNotifs.status === 200 && memberNotifs.data.data.count >= 1,
      `Notifications fetched for user (${memberNotifs.data.data.count} notifications)`
    );

    const firstNotif = memberNotifs.data?.data?.notifications?.[0];
    if (firstNotif) {
      const readOne = await request('PUT', `/notifications/${firstNotif._id}/read`, null, memberToken);
      assert(readOne.status === 200 && readOne.data.data.notification.isRead === true, 'Mark individual notification as read (200 OK)');
    }

    const readAll = await request('PUT', '/notifications/read-all', null, memberToken);
    assert(readAll.status === 200, 'Mark all notifications as read (200 OK)');

    // 8. Users List API
    console.log('\n--- 8. Users Directory API ---');
    const usersList = await request('GET', '/users', null, managerToken);
    assert(usersList.status === 200 && usersList.data.data.count >= 3, 'GET /api/users returns team directory');

    // Give socket events 500ms to register
    await new Promise((r) => setTimeout(r, 600));
    socketClient.disconnect();

    console.log('\n====================================================');
    console.log(`🏁 Test Suite Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Test suite execution exception:', error);
    process.exit(1);
  }
};

runBackendTests();
