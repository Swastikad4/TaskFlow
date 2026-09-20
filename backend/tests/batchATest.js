const { io: ioClient } = require('socket.io-client');
const { checkAndSendDueReminders } = require('../services/reminderService');

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

const mongoose = require('mongoose');

const runBatchATests = async () => {
  console.log('====================================================');
  console.log('🚀 Starting TaskFlow Batch A Advanced Features Test');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow');

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
    const adminEmail = `admin_ba_${timestamp}@taskflow.dev`;
    const memberEmail = `member_ba_${timestamp}@taskflow.dev`;

    // 1. Auth Setup
    console.log('--- 1. User Setup ---');
    const regAdmin = await request('POST', '/auth/register', {
      name: 'BatchA Admin',
      email: adminEmail,
      password: 'password123',
      role: 'Admin',
    });
    const adminToken = regAdmin.data?.data?.token;

    const regMember = await request('POST', '/auth/register', {
      name: 'BatchA Member',
      email: memberEmail,
      password: 'password123',
      role: 'Team Member',
    });
    const memberToken = regMember.data?.data?.token;
    const memberUser = regMember.data?.data?.user;

    assert(adminToken && memberToken, 'Admin and Member authenticated');

    // 2. Task Creation with Tags
    console.log('\n--- 2. Task Creation with Tags & Activity Logging ---');
    const taskData = {
      title: 'Implement Interactive Kanban Board',
      description: 'Build 3-column drag and drop board with optimistic state updates.',
      assignedTo: memberUser.id,
      priority: 'Urgent',
      status: 'To Do',
      tags: ['frontend', 'kanban', 'react'],
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // overdue date for reminder test
    };

    const createRes = await request('POST', '/tasks', taskData, adminToken);
    const createdTask = createRes.data?.data?.task;
    assert(
      createRes.status === 201 && createdTask?.tags?.includes('kanban'),
      'Task created with tags array (201 Created)'
    );

    // 3. Activity Timeline Verification
    console.log('\n--- 3. Activity Timeline Verification ---');
    const initialActivities = await request('GET', `/tasks/${createdTask._id}/activities`, null, adminToken);
    assert(
      initialActivities.status === 200 &&
      initialActivities.data.data.activities.some((a) => a.action === 'TASK_CREATED'),
      'Task creation logged in Activity timeline'
    );

    // 4. Kanban Move / Status Update Activity
    console.log('\n--- 4. Kanban Status Move & Activity Log ---');
    const moveRes = await request(
      'PUT',
      `/tasks/${createdTask._id}`,
      { status: 'In Progress' },
      memberToken
    );
    assert(
      moveRes.status === 200 && moveRes.data.data.task.status === 'In Progress',
      'Task moved to "In Progress" (200 OK)'
    );

    const postMoveActivities = await request('GET', `/tasks/${createdTask._id}/activities`, null, memberToken);
    const statusActivity = postMoveActivities.data?.data?.activities?.find(
      (a) => a.action === 'STATUS_CHANGED'
    );
    assert(
      statusActivity && statusActivity.metadata?.to === 'In Progress',
      'Status change recorded with metadata in Activity history'
    );

    // 5. Favorite / Star Toggle
    console.log('\n--- 5. Favorite / Star Toggle ---');
    const favToggle = await request('PUT', `/tasks/${createdTask._id}/favorite`, null, memberToken);
    assert(
      favToggle.status === 200 && favToggle.data.data.task.isFavorite === true,
      'Task marked as favorite (isFavorite: true)'
    );

    // 6. Advanced Search & Multi-Filters
    console.log('\n--- 6. Advanced Multi-Criteria Search & Filtering ---');
    // Search by Tag
    const tagFilterRes = await request('GET', '/tasks?tags=kanban', null, adminToken);
    assert(
      tagFilterRes.status === 200 && tagFilterRes.data.data.tasks.some((t) => t._id === createdTask._id),
      'Filter tasks by tag (tags=kanban)'
    );

    // Search by Favorite
    const favFilterRes = await request('GET', '/tasks?isFavorite=true', null, memberToken);
    assert(
      favFilterRes.status === 200 && favFilterRes.data.data.tasks.some((t) => t._id === createdTask._id),
      'Filter tasks by favorite (isFavorite=true)'
    );

    // Search by Date Range (Overdue)
    const overdueFilterRes = await request('GET', '/tasks?dateRange=overdue', null, adminToken);
    assert(
      overdueFilterRes.status === 200 && overdueFilterRes.data.data.tasks.some((t) => t._id === createdTask._id),
      'Filter tasks by dateRange=overdue'
    );

    // 7. Due-Date Reminders & Duplicate Prevention
    console.log('\n--- 7. Automated Due-Date Reminders & Duplicate Prevention ---');
    // First reminder scan
    const firstScan = await checkAndSendDueReminders();
    assert(firstScan.success && firstScan.remindersSent >= 1, 'First scan sent overdue reminder notification');

    // Verify member received notification
    const notifRes = await request('GET', '/notifications', null, memberToken);
    assert(
      notifRes.status === 200 &&
      notifRes.data.data.notifications.some((n) => n.type === 'TASK_OVERDUE'),
      'Member received TASK_OVERDUE notification'
    );

    // Second reminder scan immediately after -> should be 0 sent (Duplicate prevention)
    const secondScan = await checkAndSendDueReminders();
    assert(
      secondScan.success && secondScan.remindersSent === 0,
      'Second scan prevented duplicate reminder notifications (remindersSent: 0)'
    );

    console.log('\n====================================================');
    console.log(`🏁 Batch A Suite: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Batch A test suite exception:', error);
    process.exit(1);
  }
};

runBatchATests();
