// ============================================================
// Service Layer - Supabase Integration
// Replaces static mock data with live Supabase database queries
// ============================================================

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  User, Project, Module, Task, Meeting, AttendanceRecord,
  DailyReport, Notification, ChatChannel, ChatMessage,
  FileItem, Folder, LeaveRequest, Announcement,
} from '@/types';

// In-memory cache for synchronous lookups (e.g. getUserById in UI rendering)
let usersCache: User[] = [];
let projectsCache: Project[] = [];
let modulesCache: Module[] = [];
let tasksCache: Task[] = [];

// Helper: Transform Database User row to Frontend User
function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name || 'Unknown User',
    email: row.email || '',
    avatar: row.avatar || '',
    role: row.role || 'member',
    department: row.department || '',
    designation: row.designation || '',
    phone: row.phone || '',
    joinDate: row.join_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    status: row.status || 'active',
    activeProjects: row.active_projects || 0,
    lastActive: row.last_active || row.updated_at || new Date().toISOString(),
    bio: row.bio || '',
    skills: row.skills || [],
  };
}

// Helper: Transform Database Project row to Frontend Project
function mapProject(row: any): Project {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    status: row.status || 'planning',
    progress: row.progress ?? 0,
    managerId: row.manager_id || '',
    memberIds: row.member_ids || [],
    startDate: row.start_date || '',
    deadline: row.deadline || '',
    lastUpdated: row.updated_at || row.created_at || new Date().toISOString(),
    modules: [],
    color: row.color || '#6366f1',
    tags: row.tags || [],
  };
}

// Helper: Transform Database Module row to Frontend Module
function mapModule(row: any): Module {
  return {
    id: row.id,
    projectId: row.project_id || '',
    name: row.name || '',
    description: row.description || '',
    progress: row.progress ?? 0,
    totalTasks: row.total_tasks ?? 0,
    completedTasks: row.completed_tasks ?? 0,
    inReviewTasks: row.in_review_tasks ?? 0,
    blockedTasks: row.blocked_tasks ?? 0,
    assigneeIds: row.assignee_ids || [],
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// Helper: Transform Database Task row to Frontend Task
function mapTask(row: any): Task {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    assigneeId: row.assignee_id || '',
    projectId: row.project_id || '',
    moduleId: row.module_id || '',
    deadline: row.deadline || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    tags: row.tags || [],
    attachments: row.attachments ?? 0,
    comments: row.comments ?? 0,
    checklist: row.task_checklists?.map((c: any) => ({
      id: c.id,
      text: c.text,
      completed: c.completed,
    })),
    submission: row.task_submissions?.[0]
      ? {
          id: row.task_submissions[0].id,
          taskId: row.id,
          submittedBy: row.task_submissions[0].submitted_by,
          submittedAt: row.task_submissions[0].submitted_at,
          description: row.task_submissions[0].description,
          githubUrl: row.task_submissions[0].github_url,
          deploymentUrl: row.task_submissions[0].deployment_url,
          attachments: row.task_submissions[0].attachments || [],
          notes: row.task_submissions[0].notes,
          reviewStatus: row.task_submissions[0].review_status,
          reviewedBy: row.task_submissions[0].reviewed_by,
          reviewedAt: row.task_submissions[0].reviewed_at,
          reviewNotes: row.task_submissions[0].review_notes,
        }
      : undefined,
  };
}

// Helper: Transform Meeting row to Frontend Meeting
function mapMeeting(row: any): Meeting {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    date: row.date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    hostId: row.host_id || '',
    participantIds: row.participant_ids || [],
    type: row.type || 'team',
    isRecurring: row.is_recurring ?? false,
    meetingLink: row.meeting_link || '',
    notes: row.notes || '',
    status: row.status || 'scheduled',
  };
}

// Helper: Transform Attendance row
function mapAttendance(row: any): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    workingHours: row.working_hours,
    notes: row.notes,
  };
}

// Helper: Transform Daily Report row
function mapDailyReport(row: any): DailyReport {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    content: row.content || '',
    achievements: row.achievements || '',
    challenges: row.challenges || '',
    tomorrowPlan: row.tomorrow_plan || '',
    hoursWorked: Number(row.hours_worked) || 0,
    submittedAt: row.submitted_at || row.created_at,
  };
}

// Helper: Transform Notification row
function mapNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    userId: row.user_id,
    read: row.read,
    createdAt: row.created_at,
    actionUrl: row.action_url,
    icon: row.icon,
  };
}

// Helper: Transform Channel row
function mapChannel(row: any): ChatChannel {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    memberIds: row.member_ids || [],
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count ?? 0,
    icon: row.icon,
  };
}

// Helper: Transform Message row
function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    content: row.content,
    timestamp: row.timestamp || row.created_at,
    type: row.type,
    attachments: row.attachments || [],
    reactions: row.reactions || [],
  };
}

// Helper: Transform File row
function mapFile(row: any): FileItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    size: Number(row.size) || 0,
    folder: row.folder,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at || row.created_at || new Date().toISOString(),
    url: row.url || '#',
    mimeType: row.mime_type || '',
    projectId: row.project_id,
  };
}

// Helper: Transform Folder row
function mapFolder(row: any): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    fileCount: row.file_count ?? 0,
    icon: row.icon || 'folder',
  };
}

// Helper: Transform Leave Request row
function mapLeaveRequest(row: any): LeaveRequest {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    appliedAt: row.applied_at || row.created_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

// Helper: Transform Announcement row
function mapAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    priority: row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    audience: row.audience,
    isPublished: row.is_published ?? true,
    scheduledAt: row.scheduled_at,
  };
}

// ============================================================
// USERS API
// ============================================================
export async function getUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      const mapped = (usersData || []).map(mapUser);
      usersCache = mapped;
      return mapped;
    }
    const mapped = (data || []).map(mapUser);
    usersCache = mapped;
    return mapped;
  } catch (err) {
    console.error('Error fetching users from Supabase:', err);
    return usersCache;
  }
}

export async function getUser(id: string): Promise<User | undefined> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (data) {
      const user = mapUser(data);
      const idx = usersCache.findIndex(u => u.id === id);
      if (idx !== -1) usersCache[idx] = user;
      else usersCache.push(user);
      return user;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userData) {
      const user = mapUser(userData);
      const idx = usersCache.findIndex(u => u.id === id);
      if (idx !== -1) usersCache[idx] = user;
      else usersCache.push(user);
      return user;
    }
  } catch (err) {
    console.error('Error fetching user from Supabase:', err);
  }
  return usersCache.find(u => u.id === id);
}

export async function updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.skills !== undefined) payload.skills = updates.skills;
  if (updates.avatar !== undefined) payload.avatar = updates.avatar;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  const user = mapUser(data);
  const idx = usersCache.findIndex(u => u.id === id);
  if (idx !== -1) usersCache[idx] = user;
  return user;
}

export function getUserById(id: string): User | undefined {
  return usersCache.find(u => u.id === id);
}

// ============================================================
// PROJECTS API
// ============================================================
export async function getProjects(filter?: { managerId?: string; memberId?: string }): Promise<Project[]> {
  try {
    let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

    if (filter?.managerId) {
      query = query.eq('manager_id', filter.managerId);
    } else if (filter?.memberId) {
      query = query.contains('member_ids', [filter.memberId]);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching projects from Supabase:', error);
      return projectsCache;
    }
    const projects = (data || []).map(mapProject);
    projectsCache = projects;
    return projects;
  } catch (err) {
    console.error('Error in getProjects:', err);
    return projectsCache;
  }
}

export async function getProject(id: string): Promise<Project | undefined> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return projectsCache.find(p => p.id === id);
  const project = mapProject(data);
  const idx = projectsCache.findIndex(p => p.id === id);
  if (idx !== -1) projectsCache[idx] = project;
  else projectsCache.push(project);
  return project;
}

export function getProjectById(id: string): Project | undefined {
  return projectsCache.find(p => p.id === id);
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  const insertPayload = {
    name: project.name || 'New Project',
    description: project.description || '',
    status: project.status || 'planning',
    progress: project.progress || 0,
    manager_id: project.managerId || null,
    member_ids: project.memberIds || [],
    start_date: project.startDate || new Date().toISOString().split('T')[0],
    deadline: project.deadline || null,
    color: project.color || '#6366f1',
    tags: project.tags || [],
  };

  const { data, error } = await supabase
    .from('projects')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error('Error creating project in Supabase:', error);
    throw error;
  }
  const created = mapProject(data);
  projectsCache.unshift(created);
  return created;
}

// ============================================================
// MODULES API
// ============================================================
export async function getModules(projectId: string): Promise<Module[]> {
  if (!isSupabaseConfigured()) {
    return modulesCache.filter(m => m.projectId === projectId);
  }
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching modules from Supabase:', error);
    return modulesCache.filter(m => m.projectId === projectId);
  }
  const modules = (data || []).map(mapModule);
  // Update cache
  modules.forEach(mod => {
    const idx = modulesCache.findIndex(m => m.id === mod.id);
    if (idx !== -1) modulesCache[idx] = mod;
    else modulesCache.push(mod);
  });
  return modules;
}

export async function createModule(module: Partial<Module>): Promise<Module> {
  const insertPayload = {
    project_id: module.projectId,
    name: module.name || 'New Module',
    description: module.description || '',
    progress: module.progress || 0,
    total_tasks: module.totalTasks || 0,
    completed_tasks: module.completedTasks || 0,
    in_review_tasks: module.inReviewTasks || 0,
    blocked_tasks: module.blockedTasks || 0,
    assignee_ids: module.assigneeIds || [],
  };

  const { data, error } = await supabase
    .from('modules')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  const created = mapModule(data);
  modulesCache.push(created);
  return created;
}

// ============================================================
// TASKS API
// ============================================================
export async function getTasks(filter?: { assigneeId?: string; projectId?: string; managerId?: string }): Promise<Task[]> {
  try {
    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_checklists (*),
        task_submissions (*)
      `)
      .order('created_at', { ascending: false });

    if (filter?.assigneeId) {
      query = query.eq('assignee_id', filter.assigneeId);
    }
    if (filter?.projectId) {
      query = query.eq('project_id', filter.projectId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching tasks from Supabase:', error);
      return tasksCache;
    }
    let tasks = (data || []).map(mapTask);

    if (filter?.managerId) {
      const mgrProjects = await getProjects({ managerId: filter.managerId });
      const projectIds = new Set(mgrProjects.map(p => p.id));
      tasks = tasks.filter(t => projectIds.has(t.projectId));
    }

    tasksCache = tasks;
    return tasks;
  } catch (err) {
    console.error('Error in getTasks:', err);
    return tasksCache;
  }
}

export async function getTask(id: string): Promise<Task | undefined> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_checklists (*),
      task_submissions (*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return tasksCache.find(t => t.id === id);
  return mapTask(data);
}

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  return getTasks({ projectId });
}

export async function getModuleTasks(moduleId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_checklists (*),
      task_submissions (*)
    `)
    .eq('module_id', moduleId);

  if (error) return tasksCache.filter(t => t.moduleId === moduleId);
  return (data || []).map(mapTask);
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  return getTasks({ assigneeId: userId });
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const insertPayload = {
    title: task.title || 'New Task',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assignee_id: task.assigneeId || null,
    project_id: task.projectId,
    module_id: task.moduleId || null,
    deadline: task.deadline || null,
    tags: task.tags || [],
    attachments: 0,
    comments: 0,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert([insertPayload])
    .select(`*, task_checklists (*), task_submissions (*)`)
    .single();

  if (error) throw error;
  const created = mapTask(data);
  tasksCache.unshift(created);
  return created;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const updatePayload: any = {};
  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.priority !== undefined) updatePayload.priority = updates.priority;
  if (updates.assigneeId !== undefined) updatePayload.assignee_id = updates.assigneeId;
  if (updates.deadline !== undefined) updatePayload.deadline = updates.deadline;
  if (updates.tags !== undefined) updatePayload.tags = updates.tags;

  if (!isSupabaseConfigured()) {
    const idx = tasksCache.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasksCache[idx] = { ...tasksCache[idx], ...updates, updatedAt: new Date().toISOString() };
      return tasksCache[idx];
    }
    throw new Error('Task not found');
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select(`*, task_checklists (*), task_submissions (*)`)
    .single();

  if (error) throw error;
  const updated = mapTask(data);
  const idx = tasksCache.findIndex(t => t.id === id);
  if (idx !== -1) tasksCache[idx] = updated;
  return updated;
}

export async function submitTask(
  taskId: string,
  submission: { description: string; githubUrl?: string; deploymentUrl?: string; notes?: string; submittedBy?: string }
): Promise<Task> {
  if (isSupabaseConfigured()) {
    // 1. Update task status
    await supabase.from('tasks').update({ status: 'in-review' }).eq('id', taskId);

    // 2. Insert or upsert submission
    await supabase.from('task_submissions').upsert({
      task_id: taskId,
      submitted_by: submission.submittedBy || null,
      submitted_at: new Date().toISOString(),
      description: submission.description,
      github_url: submission.githubUrl || '',
      deployment_url: submission.deploymentUrl || '',
      notes: submission.notes || '',
      review_status: 'pending',
    });

    const refreshed = await getTask(taskId);
    if (refreshed) return refreshed;
  }

  // Fallback cache update
  const task = tasksCache.find(t => t.id === taskId);
  if (task) {
    task.status = 'in-review';
    task.submission = {
      id: `ts${Date.now()}`,
      taskId,
      submittedBy: submission.submittedBy || task.assigneeId,
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
  throw new Error('Task not found');
}

export async function reviewTask(
  taskId: string,
  action: 'approve' | 'request-changes',
  reviewerId: string,
  notes?: string
): Promise<Task> {
  const newStatus = action === 'approve' ? 'completed' : 'in-progress';
  const newReviewStatus = action === 'approve' ? 'approved' : 'changes-requested';

  if (isSupabaseConfigured()) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    await supabase.from('task_submissions').update({
      review_status: newReviewStatus,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || '',
    }).eq('task_id', taskId);

    const refreshed = await getTask(taskId);
    if (refreshed) return refreshed;
  }

  const task = tasksCache.find(t => t.id === taskId);
  if (task && task.submission) {
    task.status = newStatus;
    task.submission.reviewStatus = newReviewStatus;
    task.submission.reviewedBy = reviewerId;
    task.submission.reviewedAt = new Date().toISOString();
    task.submission.reviewNotes = notes;
    return task;
  }
  throw new Error('Task or submission not found');
}

// ============================================================
// MEETINGS API
// ============================================================
export async function getMeetings(userId?: string): Promise<Meeting[]> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching meetings from Supabase:', error);
      return [];
    }
    const all = (data || []).map(mapMeeting);
    if (userId) {
      return all.filter(m => m.hostId === userId || m.participantIds.includes(userId));
    }
    return all;
  } catch (err) {
    console.error('Error in getMeetings:', err);
    return [];
  }
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;
  return mapMeeting(data);
}

export async function getUserMeetings(userId: string): Promise<Meeting[]> {
  const allMeetings = await getMeetings();
  return allMeetings.filter(m => m.participantIds.includes(userId) || m.hostId === userId);
}

export async function createMeeting(meeting: Partial<Meeting>): Promise<Meeting> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id || meeting.hostId;

  const insertPayload: Record<string, any> = {
    title: meeting.title || 'New Meeting',
    description: meeting.description || meeting.notes || '',
    date: meeting.date || new Date().toISOString().split('T')[0],
    start_time: meeting.startTime || '10:00',
    end_time: meeting.endTime || '11:00',
    host_id: currentUserId,
    participant_ids: meeting.participantIds?.length ? meeting.participantIds : (currentUserId ? [currentUserId] : []),
    type: meeting.type || 'team',
    is_recurring: meeting.isRecurring || false,
    meeting_link: meeting.meetingLink || '',
    status: 'scheduled',
  };

  if (!isSupabaseConfigured()) {
    return {
      id: `mt${Date.now()}`,
      title: insertPayload.title,
      description: insertPayload.description,
      date: insertPayload.date,
      startTime: insertPayload.start_time,
      endTime: insertPayload.end_time,
      hostId: insertPayload.host_id || 'u1',
      participantIds: insertPayload.participant_ids,
      type: insertPayload.type,
      isRecurring: insertPayload.is_recurring,
      meetingLink: insertPayload.meeting_link,
      notes: meeting.notes || insertPayload.description,
      status: 'scheduled',
    };
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return mapMeeting(data);
}

// ============================================================
// ATTENDANCE API
// ============================================================
export async function getAttendance(userId?: string, date?: string): Promise<AttendanceRecord[]> {
  try {
    let query = supabase.from('attendance_records').select('*').order('date', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    if (date) query = query.eq('date', date);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching attendance from Supabase:', error);
      return [];
    }
    return (data || []).map(mapAttendance);
  } catch (err) {
    console.error('Error in getAttendance:', err);
    return [];
  }
}

export async function getUserAttendance(userId: string): Promise<AttendanceRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) return [];
  return (data || []).map(mapAttendance);
}

export async function getDateAttendance(date: string): Promise<AttendanceRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('date', date);

  if (error) return [];
  return (data || []).map(mapAttendance);
}

function calculateDuration(checkInStr?: string, checkOutStr?: string): { formatted: string; numeric: number } {
  if (!checkInStr || !checkOutStr) return { formatted: '0h 00m', numeric: 0 };

  const parseToMinutes = (val: string) => {
    const cleaned = val.trim();
    const isPM = /pm/i.test(cleaned);
    const isAM = /am/i.test(cleaned);
    const timeDigits = cleaned.replace(/[^0-9:]/g, '');
    const [hRaw, mRaw] = timeDigits.split(':');
    let h = parseInt(hRaw || '0', 10);
    const m = parseInt(mRaw || '0', 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  const startMin = parseToMinutes(checkInStr);
  const endMin = parseToMinutes(checkOutStr);
  const diffMinutes = Math.max(0, endMin - startMin);

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const numeric = parseFloat((diffMinutes / 60).toFixed(2));
  return {
    formatted: `${hours}h ${minutes.toString().padStart(2, '0')}m`,
    numeric,
  };
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  if (!userId) return null;
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error || !data) return null;
  return mapAttendance(data);
}

export async function checkIn(userId: string): Promise<AttendanceRecord> {
  if (!userId) throw new Error('User ID is required to check in.');
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeNow = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 15);

  const payload: any = {
    user_id: userId,
    date: today,
    status: isLate ? 'late' : 'present',
    check_in: timeNow,
    hours_worked: 0,
  };

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) {
    console.error('Check-in error from Supabase:', error);
    throw error;
  }
  return mapAttendance(data);
}

export async function checkOut(userId: string): Promise<AttendanceRecord> {
  if (!userId) throw new Error('User ID is required to check out.');
  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Get existing check_in time to calculate exact working hours
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('check_in')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const { formatted, numeric } = calculateDuration(existing?.check_in, timeNow);

  const updatePayload: any = {
    check_out: timeNow,
    hours_worked: numeric,
  };

  const { data, error } = await supabase
    .from('attendance_records')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('date', today)
    .select()
    .single();

  if (error) {
    console.error('Check-out error from Supabase:', error);
    throw error;
  }
  const result = mapAttendance(data);
  result.workingHours = formatted;
  return result;
}

// ============================================================
// DAILY REPORTS API
// ============================================================
export async function getDailyReports(): Promise<DailyReport[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching daily reports:', error);
    return [];
  }
  return (data || []).map(mapDailyReport);
}

export async function submitDailyReport(report: Partial<DailyReport>): Promise<DailyReport> {
  const insertPayload = {
    user_id: report.userId || 'u2',
    date: report.date || new Date().toISOString().split('T')[0],
    content: report.content || '',
    achievements: report.achievements || '',
    challenges: report.challenges || '',
    tomorrow_plan: report.tomorrowPlan || '',
    hours_worked: report.hoursWorked || 0,
    submitted_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    return {
      id: `dr${Date.now()}`,
      userId: insertPayload.user_id,
      date: insertPayload.date,
      content: insertPayload.content,
      achievements: insertPayload.achievements,
      challenges: insertPayload.challenges,
      tomorrowPlan: insertPayload.tomorrow_plan,
      hoursWorked: insertPayload.hours_worked,
      submittedAt: insertPayload.submitted_at,
    };
  }

  const { data, error } = await supabase
    .from('daily_reports')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return mapDailyReport(data);
}

// ============================================================
// NOTIFICATIONS API
// ============================================================
export async function getNotifications(userId?: string): Promise<Notification[]> {
  if (!isSupabaseConfigured()) return [];
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.eq.all`);
  }
  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .or(`user_id.eq.${userId},user_id.eq.all`);
  }
}

// ============================================================
// MESSAGES API
// ============================================================
export async function getChannels(): Promise<ChatChannel[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_channels')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data || []).map(mapChannel);
}

export async function getChannelMessages(channelId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('timestamp', { ascending: true });

  if (error) return [];
  return (data || []).map(mapMessage);
}

export async function sendMessage(channelId: string, content: string, senderId: string): Promise<ChatMessage> {
  const insertPayload = {
    channel_id: channelId,
    sender_id: senderId,
    content,
    timestamp: new Date().toISOString(),
    type: 'text',
    attachments: [],
    reactions: [],
  };

  if (!isSupabaseConfigured()) {
    return {
      id: `msg${Date.now()}`,
      channelId,
      senderId,
      content,
      timestamp: insertPayload.timestamp,
      type: 'text',
    };
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  // Update last message in channel
  await supabase
    .from('chat_channels')
    .update({ last_message: content, last_message_at: insertPayload.timestamp })
    .eq('id', channelId);

  return mapMessage(data);
}

// ============================================================
// FILES API
// ============================================================
export async function getFiles(): Promise<FileItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapFile);
}

export async function getFolders(): Promise<Folder[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('name', { ascending: true });

  if (error) return [];
  return (data || []).map(mapFolder);
}

export async function getFilesByFolder(folder: string): Promise<FileItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('folder', folder)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapFile);
}

// ============================================================
// LEAVE REQUESTS API
// ============================================================
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapLeaveRequest);
}

export async function createLeaveRequest(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
  const insertPayload = {
    user_id: request.userId || 'u2',
    type: request.type || 'casual',
    start_date: request.startDate || '',
    end_date: request.endDate || '',
    reason: request.reason || '',
    status: 'pending',
  };

  if (!isSupabaseConfigured()) {
    return {
      id: `lr${Date.now()}`,
      userId: insertPayload.user_id,
      type: insertPayload.type as any,
      startDate: insertPayload.start_date,
      endDate: insertPayload.end_date,
      reason: insertPayload.reason,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return mapLeaveRequest(data);
}

export async function reviewLeaveRequest(
  id: string,
  action: 'approve' | 'reject',
  reviewerId: string
): Promise<LeaveRequest> {
  const status = action === 'approve' ? 'approved' : 'rejected';
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) return mapLeaveRequest(data);
  }

  return {
    id,
    userId: 'u17',
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    status,
    appliedAt: new Date().toISOString(),
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  };
}

// ============================================================
// ANNOUNCEMENTS API
// ============================================================
export async function getAnnouncements(): Promise<Announcement[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []).map(mapAnnouncement);
}

export async function createAnnouncement(announcement: Partial<Announcement>): Promise<Announcement> {
  const insertPayload = {
    title: announcement.title || '',
    content: announcement.content || '',
    priority: announcement.priority || 'normal',
    created_by: announcement.createdBy || 'u1',
    audience: announcement.audience || 'all',
    is_published: true,
  };

  const { data, error } = await supabase
    .from('announcements')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw error;
  return mapAnnouncement(data);
}

// ============================================================
// MANAGER DASHBOARD DATA AGGREGATION
// ============================================================
export async function getManagerDashboardData(managerId: string) {
  try {
    // 1. Projects managed by this manager
    const managedProjects = await getProjects({ managerId });
    const projectIds = managedProjects.map(p => p.id);

    // 2. Tasks in these projects
    const allTasks = await getTasks();
    const managerTasks = allTasks.filter(t => projectIds.includes(t.projectId));

    // 3. Unique team members in manager's projects
    const memberIdSet = new Set<string>();
    managedProjects.forEach(p => p.memberIds.forEach(m => memberIdSet.add(m)));
    managerTasks.forEach(t => { if (t.assigneeId) memberIdSet.add(t.assigneeId); });

    const allUsers = await getUsers();
    const teamMembers = allUsers.filter(u => memberIdSet.has(u.id));

    // 4. Submissions awaiting review
    const pendingSubmissions = managerTasks
      .filter(t => t.submission && (t.submission.reviewStatus === 'pending' || t.status === 'in-review'))
      .map(t => ({
        task: t,
        submission: t.submission!,
      }));

    // 5. Team attendance today
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = await getAttendance(undefined, today);
    const teamAttendance = attendanceRecords.filter(a => memberIdSet.has(a.userId));

    // 6. Meetings involving this manager
    const meetings = await getMeetings(managerId);

    return {
      managedProjects,
      managerTasks,
      teamMembers,
      pendingSubmissions,
      teamAttendance,
      meetings,
    };
  } catch (err) {
    console.error('Error fetching manager dashboard data:', err);
    return {
      managedProjects: [],
      managerTasks: [],
      teamMembers: [],
      pendingSubmissions: [],
      teamAttendance: [],
      meetings: [],
    };
  }
}

