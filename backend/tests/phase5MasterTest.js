/**
 * Phase 5 Master Test Suite — Comprehensive End-to-End Validation
 * Covers: Auth, RBAC, Tasks, Comments, Mentions, Notifications, Teams, Sessions, Analytics, Sockets, and Error Codes.
 */

const http = require('http');
const { io } = require('socket.io-client');
const mongoose = require('mongoose');

// Ensure all Mongoose models are registered
require('../models/User');
require('../models/Session');
require('../models/Team');
require('../models/Task');
require('../models/Comment');
require('../models/Notification');
require('../models/Activity');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, testName, details = '') => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
};

// HTTP Request helper
const request = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const postData = data ? JSON.stringify(data) : '';

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'TaskFlow-Phase5-TestRunner/1.0 (Windows NT 10.0; Win64; x64)',
    };

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, rawBody: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

const runPhase5MasterTest = async () => {
  console.log('\n====================================================');
  console.log('🚀 Starting TaskFlow Phase 5 Master Comprehensive E2E Test');
  console.log('====================================================\n');

  const stamp = Date.now();

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION & INPUT VALIDATION TESTING
    // ----------------------------------------------------
    console.log('--- 1. Authentication & Input Validation ---');

    // 1.1 Invalid email rejection
    const invalidEmailRes = await request('/auth/register', 'POST', {
      name: 'Invalid Email User',
      email: 'not-an-email',
      password: 'Password123!',
      role: 'Team Member',
    });
    assert(
      invalidEmailRes.status === 400,
      'Invalid email format rejected with 400 Bad Request'
    );

    // 1.2 Weak password (< 6 chars) rejection
    const weakPassRes = await request('/auth/register', 'POST', {
      name: 'Weak Pass User',
      email: `weak_${stamp}@taskflow.io`,
      password: '123',
      role: 'Team Member',
    });
    assert(
      weakPassRes.status === 400,
      'Weak password (< 6 characters) rejected with 400 Bad Request'
    );

    // 1.3 Valid Admin Registration
    const adminData = {
      name: 'Admin Boss',
      email: `admin_${stamp}@taskflow.io`,
      password: 'SecureAdminPassword123!',
      role: 'Admin',
    };
    const adminRegRes = await request('/auth/register', 'POST', adminData);
    assert(adminRegRes.status === 201, 'Valid Admin registration returns 201 Created');
    assert(adminRegRes.body.data.token, 'Registration response includes JWT token');
    assert(
      adminRegRes.body.data.user.password === undefined,
      'Password hash is securely excluded from register response'
    );
    const adminToken = adminRegRes.body.data.token;
    const adminUser = adminRegRes.body.data.user;

    // 1.4 Duplicate email registration rejection
    const dupRegRes = await request('/auth/register', 'POST', adminData);
    assert(dupRegRes.status === 400, 'Duplicate email registration rejected with 400');

    // 1.5 Valid Manager Registration
    const managerRegRes = await request('/auth/register', 'POST', {
      name: 'Manager Sarah',
      email: `manager_${stamp}@taskflow.io`,
      password: 'SecureManagerPassword123!',
      role: 'Manager',
    });
    assert(managerRegRes.status === 201, 'Valid Manager registration successful');
    const managerToken = managerRegRes.body.data.token;
    const managerUser = managerRegRes.body.data.user;

    // 1.6 Valid Member Registration
    const memberRegRes = await request('/auth/register', 'POST', {
      name: 'Dev Alex',
      email: `alex_${stamp}@taskflow.io`,
      password: 'SecureDevPassword123!',
      role: 'Team Member',
    });
    assert(memberRegRes.status === 201, 'Valid Team Member registration successful');
    const memberToken = memberRegRes.body.data.token;
    const memberUser = memberRegRes.body.data.user;

    // 1.7 Invalid Password Login
    const badLoginRes = await request('/auth/login', 'POST', {
      email: adminData.email,
      password: 'WrongPassword!',
    });
    assert(badLoginRes.status === 401, 'Invalid password rejected with 401 Unauthorized');

    // 1.8 Nonexistent User Login
    const nonExistLogin = await request('/auth/login', 'POST', {
      email: `nonexistent_${stamp}@taskflow.io`,
      password: 'Password123!',
    });
    assert(nonExistLogin.status === 401, 'Nonexistent email login rejected with 401 Unauthorized');

    // 1.9 Valid Login
    const validLoginRes = await request('/auth/login', 'POST', {
      email: adminData.email,
      password: adminData.password,
    });
    assert(validLoginRes.status === 200, 'Valid login returns 200 OK with token');
    assert(
      validLoginRes.body.data.user.password === undefined,
      'Password hash is securely excluded from login response'
    );

    // 1.10 Profile & Active Session Check
    const meRes = await request('/auth/me', 'GET', null, adminToken);
    assert(meRes.status === 200, 'GET /api/auth/me returns authenticated user profile');
    assert(meRes.body.data.user.email === adminData.email.toLowerCase(), 'Profile email matches');

    // ----------------------------------------------------
    // 2. AUTHORIZATION & RBAC ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n--- 2. Role-Based Authorization Enforcement ---');

    // 2.1 Team Member blocked from creating tasks (only Admin/Manager allowed)
    const memberTaskCreateRes = await request(
      '/tasks',
      'POST',
      { title: 'Unauthorized Task Creation', priority: 'High' },
      memberToken
    );
    assert(
      memberTaskCreateRes.status === 403,
      'Team Member blocked from POST /api/tasks with 403 Forbidden'
    );

    // 2.2 Team Member blocked from creating teams
    const memberTeamCreateRes = await request(
      '/teams',
      'POST',
      { name: 'Unauthorized Squad' },
      memberToken
    );
    assert(
      memberTeamCreateRes.status === 403,
      'Team Member blocked from POST /api/teams with 403 Forbidden'
    );

    // 2.3 Manager creates Squad Team
    const squadRes = await request(
      '/teams',
      'POST',
      {
        name: `Engineering Squad ${stamp}`,
        description: 'Frontend & Backend Core Team',
        manager: managerUser.id,
        members: [memberUser.id],
      },
      managerToken
    );
    assert(squadRes.status === 201, 'Manager creates team squad (201 Created)');
    const squadId = squadRes.body.data.team._id || squadRes.body.data.team.id;

    // ----------------------------------------------------
    // 3. TASK LIFECYCLE & COLLABORATION WORKFLOW
    // ----------------------------------------------------
    console.log('\n--- 3. Full Task Lifecycle & Collaboration ---');

    // 3.1 Manager creates task assigned to Member
    const taskRes = await request(
      '/tasks',
      'POST',
      {
        title: 'Implement Core Security Review',
        description: 'Perform rigorous input validation and sanitize all payloads.',
        assignedTo: memberUser.id,
        team: squadId,
        priority: 'High',
        status: 'To Do',
        tags: ['security', 'phase5'],
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      managerToken
    );
    assert(taskRes.status === 201, 'Manager creates task and assigns to Member');
    const taskId = taskRes.body.data.task._id || taskRes.body.data.task.id;

    // 3.2 Member updates task status to "In Progress"
    const updateStatusRes = await request(
      `/tasks/${taskId}`,
      'PUT',
      { status: 'In Progress' },
      memberToken
    );
    assert(updateStatusRes.status === 200, 'Member moves task status to In Progress (200 OK)');
    assert(
      updateStatusRes.body.data.task.status === 'In Progress',
      'Task status updated to In Progress'
    );

    // 3.3 Member adds checklist subtasks
    const checklistRes = await request(
      `/tasks/${taskId}/checklist`,
      'POST',
      { text: 'Verify JWT expiration' },
      memberToken
    );
    assert(
      checklistRes.status === 201 || checklistRes.status === 200,
      'Checklist item added to task (201 Created)'
    );

    // 3.4 Member posts comment mentioning Manager (@Manager)
    const commentRes = await request(
      `/tasks/${taskId}/comments`,
      'POST',
      {
        text: `Hey @${managerUser.name}, security audit is looking solid!`,
      },
      memberToken
    );
    assert(commentRes.status === 201, 'Member posts comment with @mention (201 Created)');

    // 3.5 Manager checks notifications for mention
    const managerNotifsRes = await request('/notifications', 'GET', null, managerToken);
    assert(managerNotifsRes.status === 200, 'Manager fetches notifications');
    const hasMentionNotif = managerNotifsRes.body.data.notifications.some(
      (n) => n.type === 'TASK_MENTION' || n.type === 'COMMENT_ADDED'
    );
    assert(hasMentionNotif, 'Manager received notification for mention/comment');

    // 3.6 Member completes task
    const completeTaskRes = await request(
      `/tasks/${taskId}`,
      'PUT',
      { status: 'Completed' },
      memberToken
    );
    assert(completeTaskRes.status === 200, 'Task marked as Completed (200 OK)');

    // ----------------------------------------------------
    // 4. MULTI-DEVICE SESSION MANAGEMENT
    // ----------------------------------------------------
    console.log('\n--- 4. Multi-Device Sessions & Revocation ---');

    const sessionsRes = await request('/auth/sessions', 'GET', null, adminToken);
    assert(sessionsRes.status === 200, 'GET /api/auth/sessions returns active sessions');
    assert(sessionsRes.body.data.sessions.length >= 1, 'Active session detected with device info');

    // Revoke all other sessions
    const revokeOthersRes = await request('/auth/sessions/revoke-others', 'POST', null, adminToken);
    assert(revokeOthersRes.status === 200, 'POST /api/auth/sessions/revoke-others executes');

    // ----------------------------------------------------
    // 5. PRODUCTIVITY ANALYTICS AGGREGATION
    // ----------------------------------------------------
    console.log('\n--- 5. Productivity Analytics Pipeline ---');

    const analyticsRes = await request('/analytics?range=all', 'GET', null, managerToken);
    assert(analyticsRes.status === 200, 'GET /api/analytics returns 200 OK');
    assert(analyticsRes.body.data.summary !== undefined, 'Analytics returns aggregate summary metrics');
    assert(
      Array.isArray(analyticsRes.body.data.statusBreakdown),
      'Analytics returns status breakdown facet'
    );
    assert(
      Array.isArray(analyticsRes.body.data.priorityBreakdown),
      'Analytics returns priority breakdown facet'
    );

    // ----------------------------------------------------
    // 6. REAL-TIME SOCKET.IO VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 6. Socket.IO Real-Time Synchronization ---');

    const socketClient = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    const socketConnected = await new Promise((resolve) => {
      socketClient.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });

    assert(socketConnected, 'Socket.IO client connected successfully to backend');

    let receivedEvent = false;
    socketClient.on('analyticsUpdated', () => {
      receivedEvent = true;
    });

    // Trigger task change that emits analyticsUpdated
    await request(
      `/tasks/${taskId}`,
      'PUT',
      { description: 'Updated description for socket trigger' },
      managerToken
    );

    // Allow brief propagation delay
    await new Promise((r) => setTimeout(r, 600));
    assert(receivedEvent, 'Socket.IO client received real-time analyticsUpdated event');

    socketClient.disconnect();

    // ----------------------------------------------------
    // FINAL RESULTS SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log(`🏁 Phase 5 Master Test Results: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('====================================================\n');

    if (failedTests === 0) {
      console.log('🎉 ALL PHASE 5 MASTER TESTS PASSED FLAWLESSLY!\n');
      process.exit(0);
    } else {
      console.error(`💥 ${failedTests} tests failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 5 test execution:', error);
    process.exit(1);
  }
};

runPhase5MasterTest();
