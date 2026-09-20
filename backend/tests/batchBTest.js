const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

const makeRequest = (url, options = {}, body = null, isMultipart = false, multipartData = null) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const headers = {
      ...options.headers,
    };

    if (body && !isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (isMultipart && multipartData) {
      req.write(multipartData);
    } else if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const makeMultipartUpload = (url, token, fieldName, fileName, fileBuffer, mimeType) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let header = `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n`;
    header += `Content-Type: ${mimeType}\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const headerBuf = Buffer.from(header, 'utf-8');
    const footerBuf = Buffer.from(footer, 'utf-8');
    const fullBody = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(fullBody);
    req.end();
  });
};

const runBatchBTests = async () => {
  console.log('\n====================================================');
  console.log('🚀 Starting TaskFlow Batch B Advanced Features Test');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const pass = (desc) => {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  };

  const fail = (desc, reason) => {
    console.error(`  ❌ FAIL: ${desc} - ${reason}`);
    failed++;
  };

  try {
    const timestamp = Date.now();
    const adminEmail = `admin_b_${timestamp}@taskflow.dev`;
    const memberAEmail = `member_a_${timestamp}@taskflow.dev`;
    const memberBEmail = `member_b_${timestamp}@taskflow.dev`;

    // 1. Setup Users
    console.log('--- 1. User Setup & Auth ---');
    const [adminRes, memberARes, memberBRes] = await Promise.all([
      makeRequest(`${BASE_URL}/auth/register`, { method: 'POST' }, {
        name: `Admin User ${timestamp}`,
        email: adminEmail,
        password: 'Password123!',
        role: 'Admin',
      }),
      makeRequest(`${BASE_URL}/auth/register`, { method: 'POST' }, {
        name: `Rahul Sharma`,
        email: memberAEmail,
        password: 'Password123!',
        role: 'Team Member',
      }),
      makeRequest(`${BASE_URL}/auth/register`, { method: 'POST' }, {
        name: `Sarah Jenkins`,
        email: memberBEmail,
        password: 'Password123!',
        role: 'Team Member',
      }),
    ]);

    const adminToken = adminRes.data.data.token;
    const memberAToken = memberARes.data.data.token;
    const memberBToken = memberBRes.data.data.token;
    const memberAId = memberARes.data.data.user.id || memberARes.data.data.user._id;
    const memberBId = memberBRes.data.data.user.id || memberBRes.data.data.user._id;

    if (adminToken && memberAToken && memberBToken) {
      pass('Admin, Rahul (Member A), and Sarah (Member B) registered & authenticated');
    } else {
      fail('User setup', 'Failed to register test users');
    }

    // 2. Create Task for Testing
    console.log('\n--- 2. Task Creation ---');
    const taskRes = await makeRequest(
      `${BASE_URL}/tasks`,
      { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
      {
        title: 'Batch B Core Work Package',
        description: 'Complete attachments, mentions, tags, subtasks, and archive verification.',
        assignedTo: memberAId,
        priority: 'High',
        status: 'To Do',
        tags: ['backend', 'security'],
      }
    );

    const task = taskRes.data.data.task;
    const taskId = task._id;
    if (taskRes.status === 201 && taskId) {
      pass(`Test task created with ID: ${taskId}`);
    } else {
      fail('Task creation', JSON.stringify(taskRes.data));
    }

    // 3. File Attachments: Upload, Validate, Download, Delete
    console.log('\n--- 3. File Attachments ---');
    // A: Upload valid PDF
    const dummyPdfContent = Buffer.from('%PDF-1.4 Mock test PDF content for TaskFlow attachments', 'utf-8');
    const uploadRes = await makeMultipartUpload(
      `${BASE_URL}/tasks/${taskId}/attachments`,
      adminToken,
      'file',
      'architecture_specs.pdf',
      dummyPdfContent,
      'application/pdf'
    );

    if (uploadRes.status === 201 && uploadRes.data.attachment) {
      pass('Valid PDF file uploaded successfully (201 Created)');
    } else {
      fail('Upload valid PDF', JSON.stringify(uploadRes.data));
    }

    const attachmentId = uploadRes.data.attachment?._id;

    // B: Reject unsupported file type (.exe)
    const dummyExeContent = Buffer.from('MZ Mock Exe', 'utf-8');
    const invalidUploadRes = await makeMultipartUpload(
      `${BASE_URL}/tasks/${taskId}/attachments`,
      adminToken,
      'file',
      'malware.exe',
      dummyExeContent,
      'application/x-msdownload'
    );

    if (invalidUploadRes.status === 400 || invalidUploadRes.status === 500) {
      pass('Unsupported file extension (.exe) rejected with error');
    } else {
      fail('Reject unsupported file', `Expected error status, got: ${invalidUploadRes.status}`);
    }

    // C: List Attachments for Task
    const getAttachRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/attachments`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (getAttachRes.status === 200 && getAttachRes.data.attachments.length === 1) {
      pass('List attachments returns uploaded attachment with metadata');
    } else {
      fail('List attachments', JSON.stringify(getAttachRes.data));
    }

    // D: Download Attachment
    const downloadRes = await makeRequest(
      `${BASE_URL}/attachments/${attachmentId}/download`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (downloadRes.status === 200) {
      pass('Attachment downloaded successfully (200 OK)');
    } else {
      fail('Download attachment', `Status: ${downloadRes.status}`);
    }

    // E: Unauthorized Delete check (Member B tries to delete Admin's file)
    const unauthDelRes = await makeRequest(
      `${BASE_URL}/attachments/${attachmentId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${memberBToken}` } }
    );

    if (unauthDelRes.status === 403) {
      pass('Unauthorized user delete rejected (403 Forbidden)');
    } else {
      fail('Unauthorized attachment delete', `Expected 403, got: ${unauthDelRes.status}`);
    }

    // 4. Task Mentions in Comments
    console.log('\n--- 4. Task Mentions & Notifications ---');
    // Admin mentions @Rahul in a comment
    const mentionCommentRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/comments`,
      { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
      {
        text: 'Hello @Rahul please review the uploaded architecture specs.',
      }
    );

    if (mentionCommentRes.status === 201 && mentionCommentRes.data.data.comment.mentions.length > 0) {
      pass('Comment posted with @Rahul mention detected and stored');
    } else {
      fail('Comment mention detection', JSON.stringify(mentionCommentRes.data));
    }

    // Verify Rahul received TASK_MENTION notification
    const rahulNotifRes = await makeRequest(
      `${BASE_URL}/notifications`,
      { headers: { Authorization: `Bearer ${memberAToken}` } }
    );

    const hasMentionNotif = rahulNotifRes.data.data.notifications.some(
      (n) => n.type === 'TASK_MENTION' && n.message.includes('mentioned you')
    );

    if (hasMentionNotif) {
      pass('Mentioned user (Rahul) received TASK_MENTION notification');
    } else {
      fail('Mention notification', 'No TASK_MENTION notification found for Rahul');
    }

    // Self-mention check: Rahul mentions himself in comment
    await makeRequest(
      `${BASE_URL}/tasks/${taskId}/comments`,
      { method: 'POST', headers: { Authorization: `Bearer ${memberAToken}` } },
      {
        text: 'I will handle this @Rahul',
      }
    );

    const rahulNotifAfterSelf = await makeRequest(
      `${BASE_URL}/notifications`,
      { headers: { Authorization: `Bearer ${memberAToken}` } }
    );

    const mentionNotifCount = rahulNotifAfterSelf.data.data.notifications.filter(
      (n) => n.type === 'TASK_MENTION'
    ).length;

    if (mentionNotifCount === 1) {
      pass('Self-mention did NOT produce duplicate self-notification');
    } else {
      fail('Self-mention prevention', `Expected 1 notification, got ${mentionNotifCount}`);
    }

    // 5. Reusable Tags / Labels System
    console.log('\n--- 5. Tags / Labels Management ---');
    // Get all tags (auto-seeds defaults)
    const tagListRes = await makeRequest(
      `${BASE_URL}/tags`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (tagListRes.status === 200 && tagListRes.data.tags.length >= 8) {
      pass(`Tags API auto-seeded ${tagListRes.data.tags.length} default reusable tags`);
    } else {
      fail('Get tags / auto-seed', JSON.stringify(tagListRes.data));
    }

    // Create custom tag
    const createTagRes = await makeRequest(
      `${BASE_URL}/tags`,
      { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
      { name: `infra_${timestamp}`, color: '#0EA5E9' }
    );

    if (createTagRes.status === 201 && createTagRes.data.tag.name === `infra_${timestamp}`) {
      pass(`Custom tag "infra_${timestamp}" created successfully (201 Created)`);
    } else {
      fail('Create tag', JSON.stringify(createTagRes.data));
    }

    // 6. User-Specific Favorites / Starred Tasks
    console.log('\n--- 6. User-Specific Favorites Isolation ---');
    // Admin stars the task
    const starRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/favorite`,
      { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (starRes.status === 200 && starRes.data.data.task.isFavorite === true) {
      pass('Admin successfully starred task (isFavorite: true)');
    } else {
      fail('Admin star task', JSON.stringify(starRes.data));
    }

    // Verify Rahul (Member A) sees isFavorite === false for the same task
    const rahulTaskView = await makeRequest(
      `${BASE_URL}/tasks/${taskId}`,
      { headers: { Authorization: `Bearer ${memberAToken}` } }
    );

    if (rahulTaskView.status === 200 && rahulTaskView.data.data.task.isFavorite === false) {
      pass('User-specific isolation verified: Task is NOT starred for Rahul (Member A)');
    } else {
      fail('User-specific favorites isolation', `Status: ${rahulTaskView.status}, Data: ${JSON.stringify(rahulTaskView.data)}`);
    }

    // 7. Task Checklists / Subtasks
    console.log('\n--- 7. Task Checklists & Subtasks ---');
    // Add checklist items
    const item1Res = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/checklist`,
      { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
      { title: 'Define REST endpoints schema' }
    );

    const item2Res = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/checklist`,
      { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } },
      { title: 'Implement Multer upload handler' }
    );

    if (item2Res.status === 201 && item2Res.data.data.checklist.length === 2) {
      pass('Added 2 subtask checklist items');
    } else {
      fail('Add checklist item', JSON.stringify(item2Res.data));
    }

    const item1Id = item1Res.data.data.checklist[0]._id;

    // Toggle complete on item 1
    const toggleItemRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/checklist/${item1Id}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } },
      { completed: true }
    );

    const completedItems = toggleItemRes.data.data.checklist.filter((i) => i.completed).length;
    if (toggleItemRes.status === 200 && completedItems === 1) {
      pass('Subtask marked as complete (1/2 items completed = 50%)');
    } else {
      fail('Toggle checklist item', JSON.stringify(toggleItemRes.data));
    }

    // 8. Task Archiving & Restoring
    console.log('\n--- 8. Task Archiving & Restoring ---');
    // Archive task
    const archiveRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/archive`,
      { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (archiveRes.status === 200 && archiveRes.data.data.task.isArchived === true) {
      pass('Task successfully archived (200 OK)');
    } else {
      fail('Archive task', JSON.stringify(archiveRes.data));
    }

    // Verify task is NOT returned in standard active task list
    const activeTasksRes = await makeRequest(
      `${BASE_URL}/tasks`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const inActiveList = activeTasksRes.data.data.tasks.some((t) => t._id === taskId);
    if (!inActiveList) {
      pass('Archived task is properly excluded from active tasks list');
    } else {
      fail('Archive list filtering', 'Archived task still appeared in active tasks query');
    }

    // Verify task IS returned when isArchived=true is requested
    const archivedTasksRes = await makeRequest(
      `${BASE_URL}/tasks?isArchived=true`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const inArchivedList = archivedTasksRes.data.data.tasks.some((t) => t._id === taskId);
    if (inArchivedList) {
      pass('Archived task is retrieved in /api/tasks?isArchived=true query');
    } else {
      fail('Archived tasks retrieval', 'Task not found in isArchived=true query');
    }

    // Restore task
    const restoreRes = await makeRequest(
      `${BASE_URL}/tasks/${taskId}/restore`,
      { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (restoreRes.status === 200 && restoreRes.data.data.task.isArchived === false) {
      pass('Task restored to active workflow successfully');
    } else {
      fail('Restore task', JSON.stringify(restoreRes.data));
    }

    console.log('\n====================================================');
    console.log(`🏁 Batch B Suite: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error during Batch B test run:', err);
    process.exit(1);
  }
};

runBatchBTests();
