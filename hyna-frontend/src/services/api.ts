// ============================================================
// Service layer - API abstraction
// Currently uses mock data, will be replaced with real API calls
// ============================================================

import {
  mockUsers, mockProjects, mockModules, mockTasks, mockMeetings,
  mockAttendance, mockDailyReports, mockNotifications, mockChannels,
  mockMessages, mockFiles, mockFolders, mockLeaveRequests, mockAnnouncements,
  getUserById, getProjectById, getModulesByProject, getTasksByProject,
  getTasksByModule, getTasksByUser, getAttendanceByUser, getAttendanceByDate,
  getNotificationsByUser, getMeetingsByUser,
} from '../mock/data';

import type {
  User, Project, Module, Task, Meeting, AttendanceRecord,
  DailyReport, Notification, ChatChannel, ChatMessage,
  FileItem, Folder, LeaveRequest, Announcement,
} from '../types';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ---- Users ----
export async function getUsers(): Promise<User[]> {
  await delay();
  return mockUsers;
}

export async function getUser(id: string): Promise<User | undefined> {
  await delay();
  return getUserById(id);
}

// ---- Projects ----
export async function getProjects(): Promise<Project[]> {
  await delay();
  return mockProjects;
}

export async function getProject(id: string): Promise<Project | undefined> {
  await delay();
  return getProjectById(id);
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  await delay();
  const newProject: Project = {
    id: `p${Date.now()}`,
    name: project.name || 'New Project',
    description: project.description || '',
    status: 'planning',
    progress: 0,
    managerId: project.managerId || 'u1',
    memberIds: project.memberIds || [],
    startDate: project.startDate || new Date().toISOString().split('T')[0],
    deadline: project.deadline || '',
    lastUpdated: new Date().toISOString(),
    modules: [],
    color: project.color || '#6366f1',
    tags: project.tags || [],
  };
  mockProjects.push(newProject);
  return newProject;
}

// ---- Modules ----
export async function getModules(projectId: string): Promise<Module[]> {
  await delay();
  return getModulesByProject(projectId);
}

export async function createModule(module: Partial<Module>): Promise<Module> {
  await delay();
  const newModule: Module = {
    id: `m${Date.now()}`,
    projectId: module.projectId || '',
    name: module.name || 'New Module',
    description: module.description || '',
    progress: 0,
    totalTasks: 0,
    completedTasks: 0,
    inReviewTasks: 0,
    blockedTasks: 0,
    assigneeIds: module.assigneeIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockModules.push(newModule);
  return newModule;
}

// ---- Tasks ----
export async function getTasks(): Promise<Task[]> {
  await delay();
  return mockTasks;
}

export async function getTask(id: string): Promise<Task | undefined> {
  await delay();
  return mockTasks.find(t => t.id === id);
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  await delay();
  return getTasksByProject(projectId);
}

export async function getModuleTasks(moduleId: string): Promise<Task[]> {
  await delay();
  return getTasksByModule(moduleId);
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  await delay();
  return getTasksByUser(userId);
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  await delay();
  const newTask: Task = {
    id: `t${Date.now()}`,
    title: task.title || 'New Task',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assigneeId: task.assigneeId || '',
    projectId: task.projectId || '',
    moduleId: task.moduleId || '',
    deadline: task.deadline || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: task.tags || [],
    attachments: 0,
    comments: 0,
  };
  mockTasks.push(newTask);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  await delay();
  const idx = mockTasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    mockTasks[idx] = { ...mockTasks[idx], ...updates, updatedAt: new Date().toISOString() };
    return mockTasks[idx];
  }
  throw new Error('Task not found');
}

export async function submitTask(taskId: string, submission: { description: string; githubUrl?: string; deploymentUrl?: string; notes?: string }): Promise<Task> {
  await delay();
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');
  task.status = 'in-review';
  task.submission = {
    id: `ts${Date.now()}`,
    taskId,
    submittedBy: task.assigneeId,
    submittedAt: new Date().toISOString(),
    description: submission.description,
    githubUrl: submission.githubUrl,
    deploymentUrl: submission.deploymentUrl,
    attachments: [],
    notes: submission.notes,
    reviewStatus: 'pending',
  };
  return task;
}

export async function reviewTask(taskId: string, action: 'approve' | 'request-changes', notes?: string): Promise<Task> {
  await delay();
  const task = mockTasks.find(t => t.id === taskId);
  if (!task || !task.submission) throw new Error('Task or submission not found');
  if (action === 'approve') {
    task.status = 'completed';
    task.submission.reviewStatus = 'approved';
  } else {
    task.status = 'in-progress';
    task.submission.reviewStatus = 'changes-requested';
  }
  task.submission.reviewedAt = new Date().toISOString();
  task.submission.reviewedBy = 'u1';
  task.submission.reviewNotes = notes;
  return task;
}

// ---- Meetings ----
export async function getMeetings(): Promise<Meeting[]> {
  await delay();
  return mockMeetings;
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  await delay();
  return mockMeetings.find(m => m.id === id);
}

export async function getUserMeetings(userId: string): Promise<Meeting[]> {
  await delay();
  return getMeetingsByUser(userId);
}

export async function createMeeting(meeting: Partial<Meeting>): Promise<Meeting> {
  await delay();
  const newMeeting: Meeting = {
    id: `mt${Date.now()}`,
    title: meeting.title || 'New Meeting',
    description: meeting.description || '',
    date: meeting.date || new Date().toISOString().split('T')[0],
    startTime: meeting.startTime || '10:00',
    endTime: meeting.endTime || '11:00',
    hostId: meeting.hostId || 'u1',
    participantIds: meeting.participantIds || [],
    type: meeting.type || 'team',
    isRecurring: meeting.isRecurring || false,
    meetingLink: meeting.meetingLink,
    status: 'scheduled',
  };
  mockMeetings.push(newMeeting);
  return newMeeting;
}

// ---- Attendance ----
export async function getAttendance(): Promise<AttendanceRecord[]> {
  await delay();
  return mockAttendance;
}

export async function getUserAttendance(userId: string): Promise<AttendanceRecord[]> {
  await delay();
  return getAttendanceByUser(userId);
}

export async function getDateAttendance(date: string): Promise<AttendanceRecord[]> {
  await delay();
  return getAttendanceByDate(date);
}

export async function checkIn(): Promise<AttendanceRecord> {
  await delay();
  return {
    id: `att-${Date.now()}`,
    userId: 'u2',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

export async function checkOut(): Promise<AttendanceRecord> {
  await delay();
  return {
    id: `att-${Date.now()}`,
    userId: 'u2',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '09:12',
    checkOut: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    workingHours: '8h 15m',
  };
}

// ---- Daily Reports ----
export async function getDailyReports(): Promise<DailyReport[]> {
  await delay();
  return mockDailyReports;
}

export async function submitDailyReport(report: Partial<DailyReport>): Promise<DailyReport> {
  await delay();
  const newReport: DailyReport = {
    id: `dr${Date.now()}`,
    userId: report.userId || 'u2',
    date: new Date().toISOString().split('T')[0],
    content: report.content || '',
    achievements: report.achievements || '',
    challenges: report.challenges || '',
    tomorrowPlan: report.tomorrowPlan || '',
    hoursWorked: report.hoursWorked || 0,
    submittedAt: new Date().toISOString(),
  };
  mockDailyReports.push(newReport);
  return newReport;
}

// ---- Notifications ----
export async function getNotifications(userId?: string): Promise<Notification[]> {
  await delay();
  if (userId) return getNotificationsByUser(userId);
  return mockNotifications;
}

export async function markNotificationRead(id: string): Promise<void> {
  await delay();
  const notification = mockNotifications.find(n => n.id === id);
  if (notification) notification.read = true;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await delay();
  mockNotifications
    .filter(n => n.userId === userId || n.userId === 'all')
    .forEach(n => { n.read = true; });
}

// ---- Messages ----
export async function getChannels(): Promise<ChatChannel[]> {
  await delay();
  return mockChannels;
}

export async function getChannelMessages(channelId: string): Promise<ChatMessage[]> {
  await delay();
  return mockMessages.filter(m => m.channelId === channelId);
}

export async function sendMessage(channelId: string, content: string, senderId: string): Promise<ChatMessage> {
  await delay();
  const msg: ChatMessage = {
    id: `msg${Date.now()}`,
    channelId,
    senderId,
    content,
    timestamp: new Date().toISOString(),
    type: 'text',
  };
  mockMessages.push(msg);
  return msg;
}

// ---- Files ----
export async function getFiles(): Promise<FileItem[]> {
  await delay();
  return mockFiles;
}

export async function getFolders(): Promise<Folder[]> {
  await delay();
  return mockFolders;
}

export async function getFilesByFolder(folder: string): Promise<FileItem[]> {
  await delay();
  return mockFiles.filter(f => f.folder === folder);
}

// ---- Leave Requests ----
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  await delay();
  return mockLeaveRequests;
}

export async function createLeaveRequest(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
  await delay();
  const newRequest: LeaveRequest = {
    id: `lr${Date.now()}`,
    userId: request.userId || 'u2',
    type: request.type || 'casual',
    startDate: request.startDate || '',
    endDate: request.endDate || '',
    reason: request.reason || '',
    status: 'pending',
    appliedAt: new Date().toISOString(),
  };
  mockLeaveRequests.push(newRequest);
  return newRequest;
}

export async function reviewLeaveRequest(id: string, action: 'approve' | 'reject', reviewerId: string): Promise<LeaveRequest> {
  await delay();
  const request = mockLeaveRequests.find(r => r.id === id);
  if (!request) throw new Error('Leave request not found');
  request.status = action === 'approve' ? 'approved' : 'rejected';
  request.reviewedBy = reviewerId;
  request.reviewedAt = new Date().toISOString();
  return request;
}

// ---- Announcements ----
export async function getAnnouncements(): Promise<Announcement[]> {
  await delay();
  return mockAnnouncements;
}

export async function createAnnouncement(announcement: Partial<Announcement>): Promise<Announcement> {
  await delay();
  const newAnnouncement: Announcement = {
    id: `ann${Date.now()}`,
    title: announcement.title || '',
    content: announcement.content || '',
    priority: announcement.priority || 'normal',
    createdBy: announcement.createdBy || 'u1',
    createdAt: new Date().toISOString(),
    audience: announcement.audience || 'all',
    isPublished: true,
  };
  mockAnnouncements.push(newAnnouncement);
  return newAnnouncement;
}
