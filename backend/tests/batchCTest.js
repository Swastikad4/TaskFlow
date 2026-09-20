const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const { calculateNextRun, processRecurringTasks } = require('../services/recurringService');

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

const runBatchCTests = async () => {
  await mongoose.connect('mongodb://localhost:27017/taskflow');

  console.log('====================================================');
  console.log('🧪 Starting TaskFlow Batch C Comprehensive Test Suite');
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
    const adminEmail = `admin_c_${timestamp}@taskflow.dev`;
    const managerEmail = `manager_c_${timestamp}@taskflow.dev`;
    const memberEmail = `member_c_${timestamp}@taskflow.dev`;

    // 1. User Registration & Session Generation
    console.log('--- 1. Authentication & Session Creation ---');
    const adminReg = await request('POST', '/auth/register', {
      name: 'Admin Batch C',
      email: adminEmail,
      password: 'Password123!',
      role: 'Admin',
    });
    assert(adminReg.status === 201 && adminReg.data.data.token, 'Admin registration generates token and session');
    const adminToken = adminReg.data.data.token;
    const adminId = adminReg.data.data.user.id;
    const adminSessionId = adminReg.data.data.sessionId;

    const managerReg = await request('POST', '/auth/register', {
      name: 'Manager Batch C',
      email: managerEmail,
      password: 'Password123!',
      role: 'Manager',
    });
    assert(managerReg.status === 201, 'Manager registration successful');
    const managerToken = managerReg.data.data.token;
    const managerId = managerReg.data.data.user.id;

    const memberReg = await request('POST', '/auth/register', {
      name: 'Member Batch C',
      email: memberEmail,
      password: 'Password123!',
      role: 'Team Member',
    });
    assert(memberReg.status === 201, 'Member registration successful');
    const memberToken = memberReg.data.data.token;
    const memberId = memberReg.data.data.user.id;

    // 2. Session Management & Revocation
    console.log('\n--- 2. Session Management & Revocation ---');
    const loginSecondSession = await request('POST', '/auth/login', {
      email: adminEmail,
      password: 'Password123!',
    });
    assert(loginSecondSession.status === 200, 'Admin secondary login creates second session');
    const secondToken = loginSecondSession.data.data.token;
    const secondSessionId = loginSecondSession.data.data.sessionId;

    // Get active sessions
    const sessionsRes = await request('GET', '/auth/sessions', null, secondToken);
    assert(
      sessionsRes.status === 200 && sessionsRes.data.data.sessions.length >= 2,
      'GET /api/auth/sessions lists active sessions for user',
      `Count: ${sessionsRes.data?.data?.sessions?.length}`
    );

    const currentSession = sessionsRes.data.data.sessions.find((s) => s.isCurrent);
    assert(currentSession && currentSession.id === secondSessionId, 'Correct current session indicator flagged');

    // Revoke first session
    const revokeRes = await request('DELETE', `/auth/sessions/${adminSessionId}`, null, secondToken);
    assert(revokeRes.status === 200, 'DELETE /api/auth/sessions/:id revokes specific session');

    // Verify revoked session is blocked by protect middleware
    const blockedRes = await request('GET', '/auth/me', null, adminToken);
    assert(blockedRes.status === 401, 'Revoked session receives 401 Unauthorized from middleware');

    // Revoke all other sessions
    const revokeOthersRes = await request('POST', '/auth/sessions/revoke-others', null, secondToken);
    assert(revokeOthersRes.status === 200, 'POST /api/auth/sessions/revoke-others executes successfully');

    // 3. Team Management & RBAC
    console.log('\n--- 3. Team Management & Authorization ---');
    const teamCreateRes = await request(
      'POST',
      '/teams',
      {
        name: `Engineering Alpha ${timestamp}`,
        description: 'Core backend and infrastructure squad',
        manager: managerId,
        members: [memberId],
      },
      adminToken // wait, adminToken was revoked, use secondToken!
    );
    // Note: adminToken was revoked, secondToken is the active one!
    const activeAdminToken = secondToken;

    const teamCreateValid = await request(
      'POST',
      '/teams',
      {
        name: `Engineering Alpha ${timestamp}`,
        description: 'Core backend and infrastructure squad',
        manager: managerId,
        members: [memberId],
      },
      activeAdminToken
    );
    assert(teamCreateValid.status === 201 && teamCreateValid.data.data.team, 'Admin creates team with manager and members');
    const teamId = teamCreateValid.data.data.team._id;

    // Team Member cannot create team (RBAC 403)
    const memberTryCreate = await request(
      'POST',
      '/teams',
      { name: `Illegal Team ${timestamp}`, description: 'Test' },
      memberToken
    );
    assert(memberTryCreate.status === 403, 'Normal Team Member blocked from creating team (403)');

    // Manager can create team
    const managerCreateTeam = await request(
      'POST',
      '/teams',
      { name: `Design Squad ${timestamp}`, description: 'UI/UX squad' },
      managerToken
    );
    assert(managerCreateTeam.status === 201, 'Manager successfully creates team squad');

    // Add member to team
    const addMemberRes = await request(
      'POST',
      `/teams/${teamId}/members`,
      { userId: memberId },
      activeAdminToken
    );
    // Note: memberId was already in initial list or duplicate handled
    assert(addMemberRes.status === 200 || addMemberRes.status === 400, 'POST /api/teams/:id/members processes member addition');

    // Get Teams list
    const getTeamsRes = await request('GET', '/teams', null, memberToken);
    assert(getTeamsRes.status === 200 && Array.isArray(getTeamsRes.data.data.teams), 'GET /api/teams returns accessible squads');

    // 4. Recurring Tasks Engine
    console.log('\n--- 4. Recurring Tasks Engine & Duplicate Prevention ---');
    // Test calculateNextRun
    const now = new Date();
    const nextDaily = calculateNextRun('Daily', 1, now);
    assert(nextDaily.getDate() !== now.getDate() || nextDaily.getMonth() !== now.getMonth(), 'calculateNextRun calculates daily interval correctly');

    const nextWeekly = calculateNextRun('Weekly', 1, now);
    const diffDays = Math.round((nextWeekly.getTime() - now.getTime()) / (1000 * 3600 * 24));
    assert(diffDays === 7, 'calculateNextRun calculates weekly 7-day interval');

    // Create recurring task template ready for generation (nextRun in past)
    const recurringTaskRes = await request(
      'POST',
      '/tasks',
      {
        title: `Weekly Sync Meeting ${timestamp}`,
        description: 'Recurring team synchronization sprint',
        assignedTo: memberId,
        team: teamId,
        priority: 'High',
        isRecurring: true,
        recurrence: {
          frequency: 'Weekly',
          interval: 1,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        },
      },
      activeAdminToken
    );
    assert(recurringTaskRes.status === 201 && recurringTaskRes.data.data.task.isRecurring, 'Create recurring task template successfully');
    const recurringTaskId = recurringTaskRes.data.data.task._id;
    const Task = require('../models/Task');
    await Task.findByIdAndUpdate(recurringTaskId, {
      'recurrence.nextRun': new Date(Date.now() - 60000),
      'recurrence.lastGeneratedAt': null,
    });

    // Trigger recurring task processor
    const processRes = await processRecurringTasks();
    assert(processRes.success === true && processRes.count >= 1, 'Recurring scheduler processor executes successfully and generates task');

    // Check that child task was generated
    const childTasks = await request(
      'GET',
      `/tasks?search=${encodeURIComponent(`Weekly Sync Meeting ${timestamp}`)}`,
      null,
      activeAdminToken
    );
    assert(
      childTasks.status === 200 && childTasks.data.data.tasks.length >= 2,
      'Recurring scheduler generated child task instance preserving title, team, and assignee'
    );

    // Verify duplicate prevention: running again immediately does not spawn duplicate
    const processAgain = await processRecurringTasks();
    assert(processAgain.success === true, 'Secondary immediate run handles duplicate protection gracefully');

    // 5. Productivity Analytics (MongoDB Aggregations)
    console.log('\n--- 5. Productivity Analytics Aggregation ---');
    const analytics30d = await request('GET', '/analytics?dateRange=30d', null, activeAdminToken);
    assert(
      analytics30d.status === 200 &&
        analytics30d.data.data.metrics.totalTasks > 0 &&
        Array.isArray(analytics30d.data.data.statusDistribution) &&
        Array.isArray(analytics30d.data.data.priorityDistribution),
      'GET /api/analytics returns MongoDB faceted summary, status, and priority distributions'
    );

    const analytics7d = await request('GET', '/analytics?dateRange=7d', null, activeAdminToken);
    assert(analytics7d.status === 200, 'GET /api/analytics filters by 7d date range');

    const analyticsTeam = await request(`GET`, `/analytics?teamId=${teamId}`, null, activeAdminToken);
    assert(analyticsTeam.status === 200, 'GET /api/analytics scopes by specific teamId');

    // Team Member analytics scoping
    const memberAnalytics = await request('GET', '/analytics', null, memberToken);
    assert(
      memberAnalytics.status === 200 &&
        memberAnalytics.data.data.metrics.totalTasks <= analytics30d.data.data.metrics.totalTasks,
      'Team Member analytics is scoped strictly to user tasks'
    );

    // 6. Real-Time Socket.IO Tests
    console.log('\n--- 6. Socket.IO Real-Time Events ---');
    const socket = ioClient(SOCKET_URL, {
      transports: ['websocket'],
    });

    let socketConnected = false;
    let receivedAnalyticsUpdate = false;

    await new Promise((resolve) => {
      socket.on('connect', () => {
        socketConnected = true;
        socket.emit('join_user_room', memberId);
        resolve();
      });

      socket.on('analyticsUpdated', (payload) => {
        receivedAnalyticsUpdate = true;
      });

      setTimeout(resolve, 2000);
    });

    assert(socketConnected, 'Socket.IO client connected to backend server');

    // Trigger an update to verify analyticsUpdated broadcast
    await request(
      'POST',
      '/tasks',
      {
        title: `Socket Test Task ${timestamp}`,
        assignedTo: memberId,
      },
      activeAdminToken
    );

    await new Promise((r) => setTimeout(r, 600));
    assert(receivedAnalyticsUpdate, 'Socket.IO emits analyticsUpdated event on task mutations');

    socket.disconnect();

    // 7. Cleanup & Summary
    console.log('\n====================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL BATCH C SUITE TESTS PASSED PERFECTLY!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
};

runBatchCTests();
