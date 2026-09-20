# TaskFlow — Task Management & Collaboration Platform

TaskFlow is an enterprise-grade, real-time task management and team collaboration platform. Designed with a futuristic telemetry glassmorphism aesthetic, TaskFlow enables high-velocity product teams to organize, assign, track, and analyze complex project workflows with millisecond-level Socket.IO synchronization, multi-device session management, recurring task automation, and MongoDB analytics.

---

## 🎯 Problem Statement

Modern software teams struggle with fragmented workflows, disconnected task trackers, and stale dashboard metrics. Traditional tools often suffer from:
1. **Delayed Communication**: Team members miss task assignments and status transitions due to lack of instantaneous real-time sync.
2. **Repetitive Overhead**: Daily, weekly, and sprint recurring tasks require manual re-creation, leading to missed deadlines.
3. **Session Insecurity**: Inability to monitor active device logins, revoke compromised tokens, or enforce remote logouts.
4. **Siloed Productivity Metrics**: Lack of unified, high-performance workload aggregations across teams and date ranges.

**TaskFlow** solves these challenges by combining real-time bidirectional WebSocket telemetry, automated cron task recurrence, multi-device session control, role-based access control (RBAC), and aggregated productivity analytics into a unified, responsive application.

---

## 🚀 Objectives

* **Full-Stack Task Workflow**: End-to-end task lifecycle with priority weighting, tagging, checklists, attachments, and archiving.
* **Granular Authentication & Authorization**: Multi-role access control (`Admin`, `Manager`, `Team Member`) with bcrypt password hashing and active JWT session validation.
* **Instantaneous Real-Time Collaboration**: Sub-second synchronization of task mutations, live comment streams with `@mentions`, and targeted notifications via Socket.IO rooms.
* **Automated Recurring Engine**: Background cron scheduler calculating schedule maturity, generating recurring tasks with duplicate prevention, and logging activities.
* **Multi-Device Telemetry & Remote Logout**: Complete device/browser/IP tracking with individual or bulk session revocation.
* **Telemetry Productivity Analytics**: Fast MongoDB `$facet` aggregation pipelines providing status breakdowns, priority distributions, completion velocity timelines, and member workloads.
* **Responsive Dark / Light Themes**: Zero-flicker CSS custom properties with persistent user preferences across all screen breakpoints (Desktop, Laptop, Tablet, Mobile).

---

## 🌟 Core Features Breakdown

### 1. 🔐 Authentication & Session Security
- **Secure Registration & Login**: Validated inputs, lowercase email normalization, bcrypt password hashing (10 salt rounds).
- **Session Telemetry**: Device type (Desktop, Mobile, Tablet), browser engine, OS version, client IP, and last-active tracking.
- **Active Session Enforcement**: JWT tokens contain embedded `sessionId` checked against MongoDB on protected endpoints.
- **Remote Logout**: Revoke specific devices or trigger "Revoke All Other Sessions" to immediately invalidate remote clients via Socket.IO.

### 2. 👥 Role-Based Access Control (RBAC) & Team Management
- **Role Hierarchy**:
  - **Admin**: Full authority to create teams, delete tasks, manage users, and inspect platform analytics.
  - **Manager**: Create squads, assign squad managers, create/edit tasks, assign members, and view squad analytics.
  - **Team Member**: View assigned tasks and squads, update task progress/status, add checklist items, and post comments.
- **Squad Hub (`/teams`)**: Modal-driven team creation, member addition/removal, and task scoping.

### 3. 📋 Task Management, Kanban & Calendar
- **Multi-View Interface**: List view with multi-criteria search/filters, interactive drag-and-drop Kanban board, and monthly calendar schedule.
- **Task Attributes**: Priority (`Low`, `Medium`, `High`, `Urgent`), Status (`To Do`, `In Progress`, `Completed`), Due dates, Tags, and Squad assignments.
- **Interactive Checklists**: Multi-item subtask checklists with percentage completion progress bars.
- **File Attachments**: Drag-and-drop file attachments with MIME validation and secure downloads.
- **Task Archiving**: Soft-archive completed or dormant workflows with instant restoration.
- **User-Specific Favorites**: Star tasks with user-isolated favorite collections.

### 4. 🔁 Automated Recurring Tasks Engine
- **Flexible Recurrence Rules**: `Daily`, `Weekly`, and `Monthly` schedules with custom intervals.
- **Self-Healing Background Cron**: Worker process (`recurringService.js`) calculates `nextRun` dates and spawns new task instances upon maturity with duplicate prevention locks (`lastGeneratedAt`).
- **Visual Schedule Indicators**: Recurring badges and schedule info rendered across list, board, calendar, and detail views.

### 5. 💬 Real-Time Comments & @Mentions
- **Live Comment Threads**: Instantaneous messaging on tasks via Socket.IO task rooms.
- **@Mention Detection**: Regex parser detecting `@User` handles in comment bodies, generating targeted `TASK_MENTION` notifications.

### 6. 📊 Productivity Analytics (`/analytics`)
- **MongoDB `$facet` Aggregations**: Single-roundtrip metrics aggregation:
  - Overall KPIs (Total tasks, completed count, active workload, overdue count, completion rate %).
  - Status distribution meters.
  - Priority breakdown bars.
  - 30-day completion velocity timeline.
  - Team member workload allocation table.
- **Interactive Scoping**: Filter analytics by preset date ranges (`7d`, `30d`, `90d`, `custom`, `all`) and squad teams.

### 7. 🌓 Atmospheric Theme System
- **Dark Mode**: Cosmic slate backdrop (`#0B0F19`), frosted glass cards (`rgba(17, 24, 39, 0.75)`), and neon accents.
- **Light Mode**: Cool slate backdrop (`#F3F5F9`), frosted white panels (`rgba(255, 255, 255, 0.85)`), and soft drop shadows.
- **Header Toggle**: Sun/Moon switch in navbar with automatic `localStorage` synchronization.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Core** | React 18, Vite | High-performance SPA with fast HMR |
| **Frontend Routing** | React Router v6 | Client-side routing and protected route wrappers |
| **Styling & UI** | Vanilla CSS, Lucide Icons | Design tokens, glassmorphism, responsive CSS grid |
| **Real-Time Client** | Socket.IO Client | Real-time bi-directional event subscriptions |
| **HTTP Client** | Axios | REST API communication with JWT interceptors |
| **Backend Runtime** | Node.js, Express.js | REST API server and middleware pipeline |
| **Database** | MongoDB, Mongoose ODM | Document storage, faceted aggregations, indexing |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs | Stateless auth with database session validation |
| **Real-Time Server** | Socket.IO | Room-based event broadcasting and notification dispatch |
| **File Handling** | Multer | File uploads with extension & MIME validation |

---

## 🏗️ Architecture & Communication Flow

```text
┌────────────────────────────────────────────────────────┐
│                   React Frontend                       │
│  (AuthContext, SocketContext, ThemeContext, Axios API) │
└───────────────────────┬───────────────────▲────────────┘
                        │ HTTP REST         │ WebSocket
                        ▼                   │ Events
┌───────────────────────────────────────────┴────────────┐
│                 Node.js / Express Server               │
│  (authMiddleware, roleMiddleware, Sockets, Cron Engine) │
└───────────────────────┬────────────────────────────────┘
                        │ Mongoose ODM / Aggregations
                        ▼
┌────────────────────────────────────────────────────────┐
│                   MongoDB Database                     │
│  (Users, Sessions, Teams, Tasks, Comments, Activities) │
└────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schemas

### 1. `User` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `name` | `String` | Required, Trimmed, Max 50 chars | Full name of the user |
| `email` | `String` | Required, Unique, Lowercase, Regex | Normalized email address |
| `password` | `String` | Required, Hashed (min 6), `select: false` | Bcrypt-hashed password |
| `role` | `String` | Enum: `['Admin', 'Manager', 'Team Member']` | Role for RBAC authorization |

### 2. `Session` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `user` | `ObjectId` | Ref: `User`, Required, Indexed | Session owner |
| `device` | `String` | Desktop / Mobile / Tablet / Unknown | Detected device category |
| `ipAddress` | `String` | IP string | Client IP address |
| `userAgent` | `String` | Full User-Agent header | Browser and OS telemetry |
| `isValid` | `Boolean` | Default: `true` | Active session validity flag |
| `lastActive` | `Date` | Default: `Date.now` | Timestamp of last user request |

### 3. `Team` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `name` | `String` | Required, Unique, Trimmed, Max 60 chars | Squad name |
| `description`| `String` | Max 300 chars | Squad mission/description |
| `manager` | `ObjectId` | Ref: `User`, Required | Designated squad manager |
| `members` | `[ObjectId]`| Ref: `User` | Array of squad members |

### 4. `Task` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `title` | `String` | Required, Trimmed, Max 120 chars | Task headline |
| `description`| `String`| Optional | Detailed task description |
| `createdBy` | `ObjectId`| Ref: `User`, Required | Task creator |
| `assignedTo` | `ObjectId`| Ref: `User`, Default: `null` | Assigned member |
| `team` | `ObjectId`| Ref: `Team`, Default: `null` | Associated squad |
| `status` | `String` | Enum: `['To Do', 'In Progress', 'Completed']` | Current task status |
| `priority` | `String` | Enum: `['Low', 'Medium', 'High', 'Urgent']` | Urgency level |
| `dueDate` | `Date` | Optional | Due date deadline |
| `tags` | `[String]` | Array of strings | Categorization tags |
| `isRecurring`| `Boolean`| Default: `false` | Recurring task flag |
| `recurrence` | `Object` | Frequency, Interval, Start/End, NextRun | Recurrence rule configuration |
| `parentTaskId`| `ObjectId`| Ref: `Task` | Link to recurring template parent |
| `checklist` | `[Object]` | Subtask title, completed status | Subtask checklist items |
| `favoritedBy`| `[ObjectId]`| Ref: `User` | User-isolated favorites list |
| `isArchived` | `Boolean` | Default: `false` | Soft-archiving flag |

### 5. `Comment` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `task` | `ObjectId` | Ref: `Task`, Required, Indexed | Target task |
| `user` | `ObjectId` | Ref: `User`, Required | Comment author |
| `text` | `String` | Required, Max 1000 chars | Comment body |
| `mentions` | `[ObjectId]`| Ref: `User` | Tagged `@user` mentions |

### 6. `Notification` Schema
| Field | Type | Attributes | Description |
|---|---|---|---|
| `user` | `ObjectId` | Ref: `User`, Required, Indexed | Recipient user |
| `message` | `String` | Required | Notification message text |
| `type` | `String` | Enum (`TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_MENTION`, etc.) | Notification event type |
| `task` | `ObjectId` | Ref: `Task`, Optional | Associated task reference |
| `isRead` | `Boolean` | Default: `false` | Read status indicator |

---

## 🌐 API Documentation

All endpoints return standardized JSON envelopes:
`{ success: true, message: "...", data: { ... } }`

### Authentication & Sessions (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user, create session, return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user, create session, return JWT |
| `GET` | `/api/auth/me` | Private | Retrieve authenticated user profile |
| `GET` | `/api/auth/sessions` | Private | List active sessions with device telemetry |
| `DELETE` | `/api/auth/sessions/:id`| Private | Revoke specific session (triggers remote logout) |
| `POST` | `/api/auth/sessions/revoke-others` | Private | Revoke all other active sessions |
| `POST` | `/api/auth/logout` | Private | Invalidate current session and log out |

### Teams & Squads (`/api/teams`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/teams` | Private | List accessible teams |
| `POST` | `/api/teams` | Admin/Manager | Create new team squad |
| `GET` | `/api/teams/:id` | Private | Get single team squad details |
| `PUT` | `/api/teams/:id` | Admin/Manager | Update team name, description, or manager |
| `DELETE` | `/api/teams/:id` | Admin/Manager | Delete team squad |
| `POST` | `/api/teams/:id/members` | Admin/Manager | Add members to squad |
| `DELETE` | `/api/teams/:id/members/:userId` | Admin/Manager | Remove member from squad |

### Productivity Analytics (`/api/analytics`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics` | Private | Retrieve faceted analytics (`range`, `startDate`, `endDate`, `teamId`) |

### Tasks (`/api/tasks`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | Private | Filtered task list (`status`, `priority`, `team`, `search`, `tags`, etc.) |
| `POST` | `/api/tasks` | Admin/Manager | Create new task (supports recurrence rules) |
| `GET` | `/api/tasks/:id` | Private | Get single task details |
| `PUT` | `/api/tasks/:id` | Private | Update task fields (Members can update status) |
| `DELETE` | `/api/tasks/:id` | Admin/Manager | Delete task |
| `PUT` | `/api/tasks/:id/favorite` | Private | Toggle user-isolated favorite |
| `PUT` | `/api/tasks/:id/archive` | Private | Soft-archive task |
| `PUT` | `/api/tasks/:id/restore` | Private | Restore archived task |
| `POST` | `/api/tasks/:id/checklist` | Private | Add checklist subtask item |
| `PUT` | `/api/tasks/:id/checklist/:itemId` | Private | Toggle checklist item completion |

### Comments (`/api/tasks/:id/comments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tasks/:id/comments` | Private | List chronological comments for a task |
| `POST` | `/api/tasks/:id/comments` | Private | Post comment with `@mention` detection |

### Notifications (`/api/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Private | Fetch notifications & unread count |
| `PUT` | `/api/notifications/:id/read` | Private | Mark notification as read |
| `PUT` | `/api/notifications/read-all` | Private | Mark all notifications as read |

---

## ⚡ Socket.IO Event Registry

| Event Name | Scope | Description |
|---|---|---|
| `taskCreated` | Global | Broadcasted when a new task is created |
| `taskUpdated` | Global / Task Room | Dispatched when task metadata or status changes |
| `taskAssigned` | User Room (`user:<id>`) | Targeted dispatch to assigned member |
| `taskStatusChanged` | Global | Broadcasted when a task moves across Kanban columns |
| `commentAdded` | Task Room (`task:<id>`) | Dispatched to active viewers of a task thread |
| `notificationCreated` | User Room (`user:<id>`) | Dispatched for live in-app toasts & unread badges |
| `recurringTaskGenerated` | Global / User Room | Dispatched when recurring cron generates a child task |
| `teamCreated` / `teamUpdated` / `teamDeleted` | Global | Broadcasted when squad team structure changes |
| `sessionRevoked` | User Room (`user:<id>`) | Triggers instant remote logout on revoked clients |
| `analyticsUpdated` | Global | Broadcasted on task lifecycle events to refresh analytics |

---

## 💻 Installation & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017` or MongoDB Atlas URI

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev   # Starts backend on http://localhost:5000
```

### 4. Frontend Setup
```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev   # Starts frontend on http://localhost:5173
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=supersecret_jwt_key_taskflow_production_grade_token_2026
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🔑 Demo Credentials

You can register any new user with chosen roles (`Admin`, `Manager`, or `Team Member`), or use the automated test runner accounts:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@taskflow.io` | `Password123!` | Global administration, team creation, task deletion |
| **Manager** | `manager@taskflow.io` | `Password123!` | Squad creation, task creation/assignment, analytics |
| **Team Member** | `member@taskflow.io` | `Password123!` | Task status updates, comments, subtask checklist |

---

## 🧪 Comprehensive Automated Test Suites

TaskFlow includes 137+ automated end-to-end assertions covering all functional layers:

```bash
# Run Phase 5 Master Comprehensive E2E Test Suite (34 assertions)
npm run test:phase5

# Run Batch C Advanced Features Test Suite (26 assertions)
npm run test:batchC

# Run Batch B Attachments, Mentions, Checklists Test Suite (20 assertions)
npm run test:batchB

# Run Batch A Search, Tags, Reminders Test Suite (12 assertions)
npm run test:batchA

# Run Multi-User Real-Time Socket.IO Test Suite (14 assertions)
npm run test:realtime

# Run Core Backend API Test Suite (31 assertions)
npm test
```
