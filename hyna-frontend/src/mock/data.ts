import type { User, Project, Module, Task, Meeting, AttendanceRecord, AttendanceStatus, DailyReport, Notification as AppNotification, ChatChannel, ChatMessage, FileItem, Folder, LeaveRequest, Announcement } from '../types';

// ============================================================
// USERS / MEMBERS
// ============================================================
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Karthik Rajan',
    email: 'karthik@hynastudio.com',
    avatar: '',
    role: 'admin',
    department: 'Engineering',
    designation: 'CTO & Co-founder',
    phone: '+91 98765 43210',
    joinDate: '2024-01-15',
    status: 'active',
    activeProjects: 6,
    lastActive: '2026-09-25T08:30:00',
    bio: 'Leading the technical vision at Hyna Studio.',
    skills: ['Architecture', 'React', 'Node.js', 'AWS', 'Leadership'],
  },
  {
    id: 'u2',
    name: 'Dharshan Kumar',
    email: 'dharshan@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Full Stack Developer',
    phone: '+91 98765 43211',
    joinDate: '2024-03-10',
    status: 'active',
    activeProjects: 3,
    lastActive: '2026-09-25T09:12:00',
    bio: 'Passionate full-stack developer focused on building scalable applications.',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Next.js'],
  },
  {
    id: 'u3',
    name: 'Arun Prakash',
    email: 'arun@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Frontend Developer',
    phone: '+91 98765 43212',
    joinDate: '2024-04-22',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T09:05:00',
    bio: 'Frontend specialist with an eye for pixel-perfect design.',
    skills: ['React', 'Vue.js', 'CSS', 'Figma', 'Animation'],
  },
  {
    id: 'u4',
    name: 'Priya Sharma',
    email: 'priya@hynastudio.com',
    avatar: '',
    role: 'manager',
    department: 'Engineering',
    designation: 'Engineering Manager',
    phone: '+91 98765 43213',
    joinDate: '2024-02-18',
    status: 'active',
    activeProjects: 4,
    lastActive: '2026-09-25T08:45:00',
    bio: 'Engineering manager driving team productivity and quality.',
    skills: ['Project Management', 'Agile', 'React', 'System Design'],
  },
  {
    id: 'u5',
    name: 'Vikram Singh',
    email: 'vikram@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Backend Developer',
    phone: '+91 98765 43214',
    joinDate: '2024-05-08',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T09:00:00',
    bio: 'Backend engineer specializing in microservices and APIs.',
    skills: ['Node.js', 'Python', 'PostgreSQL', 'Redis', 'Docker'],
  },
  {
    id: 'u6',
    name: 'Sneha Reddy',
    email: 'sneha@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Design',
    designation: 'UI/UX Designer',
    phone: '+91 98765 43215',
    joinDate: '2024-06-01',
    status: 'active',
    activeProjects: 3,
    lastActive: '2026-09-25T08:55:00',
    bio: 'Creating beautiful and intuitive user experiences.',
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems'],
  },
  {
    id: 'u7',
    name: 'Rajesh Menon',
    email: 'rajesh@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'DevOps Engineer',
    phone: '+91 98765 43216',
    joinDate: '2024-07-15',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:40:00',
    bio: 'Infrastructure and CI/CD pipeline specialist.',
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
  },
  {
    id: 'u8',
    name: 'Kavitha Nair',
    email: 'kavitha@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'QA Engineer',
    phone: '+91 98765 43217',
    joinDate: '2024-08-10',
    status: 'active',
    activeProjects: 3,
    lastActive: '2026-09-25T08:50:00',
    bio: 'Quality assurance engineer ensuring product reliability.',
    skills: ['Selenium', 'Jest', 'Cypress', 'Test Planning', 'API Testing'],
  },
  {
    id: 'u9',
    name: 'Mohammed Irfan',
    email: 'irfan@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Mobile Developer',
    phone: '+91 98765 43218',
    joinDate: '2024-04-05',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T09:10:00',
    bio: 'Cross-platform mobile app developer.',
    skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Firebase'],
  },
  {
    id: 'u10',
    name: 'Deepika Patel',
    email: 'deepika@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Marketing',
    designation: 'Marketing Lead',
    phone: '+91 98765 43219',
    joinDate: '2024-09-01',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:35:00',
    bio: 'Driving growth through data-driven marketing strategies.',
    skills: ['SEO', 'Content Marketing', 'Analytics', 'Social Media', 'Brand Strategy'],
  },
  {
    id: 'u11',
    name: 'Suresh Babu',
    email: 'suresh@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Senior Developer',
    phone: '+91 98765 43220',
    joinDate: '2024-03-20',
    status: 'active',
    activeProjects: 3,
    lastActive: '2026-09-25T09:08:00',
    bio: 'Senior developer with 8+ years of experience.',
    skills: ['Java', 'Spring Boot', 'React', 'Microservices', 'SQL'],
  },
  {
    id: 'u12',
    name: 'Lakshmi Venkatesh',
    email: 'lakshmi@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Design',
    designation: 'Graphic Designer',
    phone: '+91 98765 43221',
    joinDate: '2024-10-12',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:42:00',
    bio: 'Creating visual stories through graphic design.',
    skills: ['Illustrator', 'Photoshop', 'Branding', 'Typography', 'Motion Graphics'],
  },
  {
    id: 'u13',
    name: 'Naveen Kumar',
    email: 'naveen@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Data Engineer',
    phone: '+91 98765 43222',
    joinDate: '2024-11-01',
    status: 'active',
    activeProjects: 1,
    lastActive: '2026-09-25T08:38:00',
    bio: 'Building data pipelines and analytics infrastructure.',
    skills: ['Python', 'Apache Spark', 'SQL', 'ETL', 'Data Modeling'],
  },
  {
    id: 'u14',
    name: 'Anitha Krishnan',
    email: 'anitha@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'HR',
    designation: 'HR Manager',
    phone: '+91 98765 43223',
    joinDate: '2024-02-01',
    status: 'active',
    activeProjects: 1,
    lastActive: '2026-09-25T08:48:00',
    bio: 'Building a great workplace culture at Hyna Studio.',
    skills: ['Recruitment', 'Employee Relations', 'Compliance', 'Training'],
  },
  {
    id: 'u15',
    name: 'Sathish Raman',
    email: 'sathish@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Security Engineer',
    phone: '+91 98765 43224',
    joinDate: '2025-01-15',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:52:00',
    bio: 'Application security and penetration testing specialist.',
    skills: ['Security Audit', 'OWASP', 'Penetration Testing', 'Cryptography'],
  },
  {
    id: 'u16',
    name: 'Meera Sundaram',
    email: 'meera@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Product',
    designation: 'Product Manager',
    phone: '+91 98765 43225',
    joinDate: '2024-06-20',
    status: 'active',
    activeProjects: 3,
    lastActive: '2026-09-25T09:02:00',
    bio: 'Shaping product strategy and roadmaps.',
    skills: ['Product Strategy', 'User Research', 'Analytics', 'Roadmapping', 'Agile'],
  },
  {
    id: 'u17',
    name: 'Ganesh Mohan',
    email: 'ganesh@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Junior Developer',
    phone: '+91 98765 43226',
    joinDate: '2025-06-01',
    status: 'active',
    activeProjects: 1,
    lastActive: '2026-09-25T09:15:00',
    bio: 'Eager learner diving into full-stack development.',
    skills: ['JavaScript', 'React', 'HTML/CSS', 'Git'],
  },
  {
    id: 'u18',
    name: 'Divya Rajan',
    email: 'divya@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Frontend Developer',
    phone: '+91 98765 43227',
    joinDate: '2025-02-10',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:58:00',
    bio: 'Crafting responsive and accessible web interfaces.',
    skills: ['React', 'TypeScript', 'Accessibility', 'CSS', 'Testing'],
  },
  {
    id: 'u19',
    name: 'Harish Chandran',
    email: 'harish@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Backend Developer',
    phone: '+91 98765 43228',
    joinDate: '2025-04-15',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:47:00',
    bio: 'API design and backend systems architect.',
    skills: ['Go', 'gRPC', 'PostgreSQL', 'Microservices', 'Docker'],
  },
  {
    id: 'u20',
    name: 'Nisha Gupta',
    email: 'nisha@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Content',
    designation: 'Technical Writer',
    phone: '+91 98765 43229',
    joinDate: '2025-03-01',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:44:00',
    bio: 'Documenting complex systems in clear, concise language.',
    skills: ['Technical Writing', 'Documentation', 'API Docs', 'Markdown'],
  },
  {
    id: 'u21',
    name: 'Arjun Natarajan',
    email: 'arjun@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'ML Engineer',
    phone: '+91 98765 43230',
    joinDate: '2025-05-20',
    status: 'active',
    activeProjects: 1,
    lastActive: '2026-09-25T09:04:00',
    bio: 'Building intelligent systems with machine learning.',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'],
  },
  {
    id: 'u22',
    name: 'Pooja Iyer',
    email: 'pooja@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Design',
    designation: 'Product Designer',
    phone: '+91 98765 43231',
    joinDate: '2025-07-10',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T08:56:00',
    bio: 'Designing products people love to use.',
    skills: ['Product Design', 'Figma', 'User Research', 'Design Systems'],
  },
  {
    id: 'u23',
    name: 'Manoj Pillai',
    email: 'manoj@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'Full Stack Developer',
    phone: '+91 98765 43232',
    joinDate: '2025-08-01',
    status: 'active',
    activeProjects: 2,
    lastActive: '2026-09-25T09:07:00',
    bio: 'Building end-to-end solutions across the stack.',
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'GraphQL'],
  },
  {
    id: 'u24',
    name: 'Rithika Subramanian',
    email: 'rithika@hynastudio.com',
    avatar: '',
    role: 'member',
    department: 'Engineering',
    designation: 'iOS Developer',
    phone: '+91 98765 43233',
    joinDate: '2025-09-01',
    status: 'inactive',
    activeProjects: 0,
    lastActive: '2026-09-20T17:30:00',
    bio: 'Native iOS development with Swift.',
    skills: ['Swift', 'SwiftUI', 'UIKit', 'Core Data', 'Xcode'],
  },
];

// ============================================================
// PROJECTS
// ============================================================
export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Hyna Biz',
    description: 'Enterprise business management platform with CRM, invoicing, and analytics modules for SMBs.',
    status: 'active',
    progress: 85,
    managerId: 'u4',
    memberIds: ['u2', 'u3', 'u5', 'u6', 'u8', 'u11', 'u17'],
    startDate: '2025-01-15',
    deadline: '2026-12-31',
    lastUpdated: '2026-09-25T08:30:00',
    modules: [],
    color: '#6366f1',
    tags: ['SaaS', 'Enterprise', 'B2B'],
  },
  {
    id: 'p2',
    name: 'ASTRA',
    description: 'AI-powered project tracking and analytics platform with real-time insights and intelligent task prioritization.',
    status: 'active',
    progress: 68,
    managerId: 'u4',
    memberIds: ['u2', 'u5', 'u7', 'u13', 'u21'],
    startDate: '2025-06-01',
    deadline: '2027-03-15',
    lastUpdated: '2026-09-24T16:45:00',
    modules: [],
    color: '#8b5cf6',
    tags: ['AI', 'Analytics', 'SaaS'],
  },
  {
    id: 'p3',
    name: 'Company Website',
    description: 'Redesign and rebuild of the Hyna Studio corporate website with modern design, blog, and career portal.',
    status: 'active',
    progress: 52,
    managerId: 'u1',
    memberIds: ['u3', 'u6', 'u10', 'u12', 'u18', 'u20'],
    startDate: '2026-04-01',
    deadline: '2026-11-30',
    lastUpdated: '2026-09-23T14:20:00',
    modules: [],
    color: '#06b6d4',
    tags: ['Website', 'Marketing', 'Branding'],
  },
  {
    id: 'p4',
    name: 'Mobile App v2',
    description: 'Next-generation mobile application with offline support, push notifications, and redesigned UX.',
    status: 'active',
    progress: 35,
    managerId: 'u4',
    memberIds: ['u9', 'u6', 'u8', 'u22', 'u24'],
    startDate: '2026-07-01',
    deadline: '2027-06-30',
    lastUpdated: '2026-09-25T07:15:00',
    modules: [],
    color: '#f59e0b',
    tags: ['Mobile', 'React Native', 'UX'],
  },
  {
    id: 'p5',
    name: 'Internal Tools',
    description: 'Suite of internal productivity tools including HR portal, time tracking, and document management.',
    status: 'planning',
    progress: 12,
    managerId: 'u1',
    memberIds: ['u11', 'u14', 'u19', 'u23'],
    startDate: '2026-10-01',
    deadline: '2027-09-30',
    lastUpdated: '2026-09-22T11:00:00',
    modules: [],
    color: '#10b981',
    tags: ['Internal', 'Tools', 'HR'],
  },
  {
    id: 'p6',
    name: 'API Gateway',
    description: 'Centralized API gateway with rate limiting, authentication, logging, and developer portal.',
    status: 'on-hold',
    progress: 45,
    managerId: 'u4',
    memberIds: ['u5', 'u7', 'u15', 'u19'],
    startDate: '2026-02-01',
    deadline: '2026-12-15',
    lastUpdated: '2026-09-15T09:30:00',
    modules: [],
    color: '#ef4444',
    tags: ['Infrastructure', 'API', 'Security'],
  },
];

// ============================================================
// MODULES
// ============================================================
export const mockModules: Module[] = [
  // Hyna Biz modules
  { id: 'm1', projectId: 'p1', name: 'Authentication', description: 'User auth with OAuth, SSO, MFA', progress: 92, totalTasks: 12, completedTasks: 11, inReviewTasks: 1, blockedTasks: 0, assigneeIds: ['u2', 'u5'], createdAt: '2025-01-20', updatedAt: '2026-09-24' },
  { id: 'm2', projectId: 'p1', name: 'Dashboard', description: 'Admin and user dashboards with analytics', progress: 78, totalTasks: 15, completedTasks: 12, inReviewTasks: 2, blockedTasks: 1, assigneeIds: ['u3', 'u2'], createdAt: '2025-02-01', updatedAt: '2026-09-25' },
  { id: 'm3', projectId: 'p1', name: 'CRM Module', description: 'Contact management, leads, pipeline', progress: 65, totalTasks: 18, completedTasks: 12, inReviewTasks: 3, blockedTasks: 0, assigneeIds: ['u11', 'u5', 'u17'], createdAt: '2025-03-15', updatedAt: '2026-09-23' },
  { id: 'm4', projectId: 'p1', name: 'Invoicing', description: 'Invoice generation, payments, receipts', progress: 88, totalTasks: 10, completedTasks: 9, inReviewTasks: 0, blockedTasks: 0, assigneeIds: ['u2', 'u8'], createdAt: '2025-04-01', updatedAt: '2026-09-20' },
  // ASTRA modules
  { id: 'm5', projectId: 'p2', name: 'AI Engine', description: 'Machine learning models for task analysis', progress: 55, totalTasks: 14, completedTasks: 8, inReviewTasks: 1, blockedTasks: 2, assigneeIds: ['u21', 'u13'], createdAt: '2025-06-15', updatedAt: '2026-09-24' },
  { id: 'm6', projectId: 'p2', name: 'Analytics Dashboard', description: 'Real-time analytics and data visualization', progress: 72, totalTasks: 11, completedTasks: 8, inReviewTasks: 2, blockedTasks: 0, assigneeIds: ['u2', 'u3'], createdAt: '2025-07-01', updatedAt: '2026-09-25' },
  { id: 'm7', projectId: 'p2', name: 'Data Pipeline', description: 'ETL processes and data ingestion', progress: 60, totalTasks: 9, completedTasks: 5, inReviewTasks: 1, blockedTasks: 1, assigneeIds: ['u13', 'u5'], createdAt: '2025-08-01', updatedAt: '2026-09-22' },
  // Company Website modules
  { id: 'm8', projectId: 'p3', name: 'Landing Pages', description: 'Hero, features, pricing, and about pages', progress: 70, totalTasks: 8, completedTasks: 6, inReviewTasks: 1, blockedTasks: 0, assigneeIds: ['u3', 'u6', 'u18'], createdAt: '2026-04-10', updatedAt: '2026-09-23' },
  { id: 'm9', projectId: 'p3', name: 'Blog Engine', description: 'CMS-powered blog with categories and search', progress: 40, totalTasks: 10, completedTasks: 4, inReviewTasks: 0, blockedTasks: 1, assigneeIds: ['u18', 'u20'], createdAt: '2026-05-01', updatedAt: '2026-09-21' },
  { id: 'm10', projectId: 'p3', name: 'Career Portal', description: 'Job listings, application forms, applicant tracking', progress: 25, totalTasks: 12, completedTasks: 3, inReviewTasks: 0, blockedTasks: 0, assigneeIds: ['u3', 'u14'], createdAt: '2026-06-01', updatedAt: '2026-09-19' },
  // Mobile App modules
  { id: 'm11', projectId: 'p4', name: 'Core Navigation', description: 'Tab bar, stack navigation, deep linking', progress: 60, totalTasks: 7, completedTasks: 4, inReviewTasks: 1, blockedTasks: 0, assigneeIds: ['u9', 'u22'], createdAt: '2026-07-10', updatedAt: '2026-09-24' },
  { id: 'm12', projectId: 'p4', name: 'Offline Mode', description: 'Local storage, sync engine, conflict resolution', progress: 20, totalTasks: 9, completedTasks: 2, inReviewTasks: 0, blockedTasks: 1, assigneeIds: ['u9', 'u5'], createdAt: '2026-08-01', updatedAt: '2026-09-22' },
  // Internal Tools modules
  { id: 'm13', projectId: 'p5', name: 'HR Portal', description: 'Employee directory, leave management, payroll', progress: 10, totalTasks: 16, completedTasks: 2, inReviewTasks: 0, blockedTasks: 0, assigneeIds: ['u14', 'u23'], createdAt: '2026-09-15', updatedAt: '2026-09-22' },
  // API Gateway modules
  { id: 'm14', projectId: 'p6', name: 'Rate Limiting', description: 'Token bucket, sliding window algorithms', progress: 80, totalTasks: 6, completedTasks: 5, inReviewTasks: 0, blockedTasks: 0, assigneeIds: ['u15', 'u7'], createdAt: '2026-02-15', updatedAt: '2026-08-30' },
  { id: 'm15', projectId: 'p6', name: 'Developer Portal', description: 'API documentation, SDK generation, sandbox', progress: 30, totalTasks: 8, completedTasks: 2, inReviewTasks: 1, blockedTasks: 0, assigneeIds: ['u19', 'u20'], createdAt: '2026-03-01', updatedAt: '2026-09-10' },
];

// ============================================================
// TASKS
// ============================================================
export const mockTasks: Task[] = [
  // Authentication module tasks
  { id: 't1', title: 'Implement Login API', description: 'Create login endpoint with JWT token generation and refresh token flow.', status: 'in-progress', priority: 'high', assigneeId: 'u2', projectId: 'p1', moduleId: 'm1', deadline: '2026-09-28', createdAt: '2026-09-15', updatedAt: '2026-09-25', tags: ['backend', 'auth'], attachments: 2, comments: 5, checklist: [{ id: 'c1', text: 'JWT generation', completed: true }, { id: 'c2', text: 'Refresh token flow', completed: true }, { id: 'c3', text: 'Error handling', completed: false }, { id: 'c4', text: 'Rate limiting', completed: false }] },
  { id: 't2', title: 'Fix OTP validation', description: 'OTP expiry not being checked correctly, causing expired codes to be accepted.', status: 'todo', priority: 'urgent', assigneeId: 'u2', projectId: 'p1', moduleId: 'm1', deadline: '2026-09-26', createdAt: '2026-09-24', updatedAt: '2026-09-24', tags: ['bug', 'auth'], attachments: 1, comments: 3 },
  { id: 't3', title: 'Update dashboard UI', description: 'Redesign the admin dashboard with new stat cards and chart components.', status: 'completed', priority: 'medium', assigneeId: 'u3', projectId: 'p1', moduleId: 'm2', deadline: '2026-09-20', createdAt: '2026-09-10', updatedAt: '2026-09-19', tags: ['frontend', 'ui'], attachments: 0, comments: 8, submission: { id: 'ts1', taskId: 't3', submittedBy: 'u3', submittedAt: '2026-09-19T14:30:00', description: 'Redesigned all dashboard components with new design system.', githubUrl: 'https://github.com/hynastudio/hynabiz/pull/234', deploymentUrl: 'https://staging.hynabiz.com', attachments: ['dashboard_screenshot.png'], reviewStatus: 'approved', reviewedBy: 'u1', reviewedAt: '2026-09-19T16:00:00' } },
  { id: 't4', title: 'Submit documentation', description: 'Complete API documentation for the authentication module.', status: 'todo', priority: 'medium', assigneeId: 'u20', projectId: 'p1', moduleId: 'm1', deadline: '2026-09-30', createdAt: '2026-09-18', updatedAt: '2026-09-18', tags: ['docs'], attachments: 0, comments: 1 },
  { id: 't5', title: 'Design CRM contact page', description: 'Create high-fidelity mockups for the CRM contact management interface.', status: 'in-review', priority: 'high', assigneeId: 'u6', projectId: 'p1', moduleId: 'm3', deadline: '2026-09-27', createdAt: '2026-09-12', updatedAt: '2026-09-24', tags: ['design', 'crm'], attachments: 4, comments: 12, submission: { id: 'ts2', taskId: 't5', submittedBy: 'u6', submittedAt: '2026-09-24T10:15:00', description: 'Completed CRM contact page designs with all states.', attachments: ['crm_contacts_v2.fig'], reviewStatus: 'pending' } },
  { id: 't6', title: 'Implement lead pipeline', description: 'Build drag-and-drop pipeline view for lead management.', status: 'in-progress', priority: 'high', assigneeId: 'u11', projectId: 'p1', moduleId: 'm3', deadline: '2026-10-05', createdAt: '2026-09-15', updatedAt: '2026-09-25', tags: ['frontend', 'crm'], attachments: 1, comments: 6 },
  { id: 't7', title: 'Invoice PDF generation', description: 'Generate professional PDF invoices with customizable templates.', status: 'completed', priority: 'medium', assigneeId: 'u2', projectId: 'p1', moduleId: 'm4', deadline: '2026-09-15', createdAt: '2026-09-01', updatedAt: '2026-09-14', tags: ['backend', 'invoicing'], attachments: 2, comments: 4 },
  { id: 't8', title: 'Setup CI/CD pipeline', description: 'Configure automated testing, building, and deployment pipeline.', status: 'completed', priority: 'high', assigneeId: 'u7', projectId: 'p1', moduleId: 'm2', deadline: '2026-09-10', createdAt: '2026-08-25', updatedAt: '2026-09-09', tags: ['devops', 'ci/cd'], attachments: 1, comments: 3 },
  // ASTRA tasks
  { id: 't9', title: 'Train classification model', description: 'Train and evaluate task classification model using labeled dataset.', status: 'in-progress', priority: 'high', assigneeId: 'u21', projectId: 'p2', moduleId: 'm5', deadline: '2026-10-10', createdAt: '2026-09-01', updatedAt: '2026-09-25', tags: ['ml', 'ai'], attachments: 3, comments: 7 },
  { id: 't10', title: 'Build analytics charts', description: 'Implement interactive charts for project analytics using Recharts.', status: 'in-review', priority: 'medium', assigneeId: 'u3', projectId: 'p2', moduleId: 'm6', deadline: '2026-09-28', createdAt: '2026-09-10', updatedAt: '2026-09-24', tags: ['frontend', 'charts'], attachments: 2, comments: 5, submission: { id: 'ts3', taskId: 't10', submittedBy: 'u3', submittedAt: '2026-09-24T16:42:00', description: 'Implemented all chart components with real-time data support.', githubUrl: 'https://github.com/hynastudio/astra/pull/89', deploymentUrl: 'https://staging.astra.hynastudio.com/analytics', attachments: ['charts_demo.mp4'], reviewStatus: 'pending' } },
  { id: 't11', title: 'Data ingestion service', description: 'Build real-time data ingestion service with Kafka consumer.', status: 'blocked', priority: 'high', assigneeId: 'u13', projectId: 'p2', moduleId: 'm7', deadline: '2026-10-01', createdAt: '2026-09-05', updatedAt: '2026-09-22', tags: ['backend', 'data'], attachments: 0, comments: 9 },
  { id: 't12', title: 'API rate limiting config', description: 'Configure rate limiting rules per endpoint and user tier.', status: 'completed', priority: 'medium', assigneeId: 'u5', projectId: 'p2', moduleId: 'm6', deadline: '2026-09-20', createdAt: '2026-09-08', updatedAt: '2026-09-19', tags: ['backend', 'api'], attachments: 1, comments: 2 },
  // Company Website tasks
  { id: 't13', title: 'Design hero section', description: 'Create an engaging hero section with animations for the landing page.', status: 'completed', priority: 'high', assigneeId: 'u6', projectId: 'p3', moduleId: 'm8', deadline: '2026-09-15', createdAt: '2026-08-20', updatedAt: '2026-09-14', tags: ['design', 'landing'], attachments: 3, comments: 15 },
  { id: 't14', title: 'Implement pricing page', description: 'Build responsive pricing page with plan comparison table.', status: 'in-progress', priority: 'medium', assigneeId: 'u18', projectId: 'p3', moduleId: 'm8', deadline: '2026-09-30', createdAt: '2026-09-10', updatedAt: '2026-09-25', tags: ['frontend'], attachments: 1, comments: 4 },
  { id: 't15', title: 'Blog CMS integration', description: 'Integrate headless CMS for blog content management.', status: 'blocked', priority: 'medium', assigneeId: 'u18', projectId: 'p3', moduleId: 'm9', deadline: '2026-10-15', createdAt: '2026-09-12', updatedAt: '2026-09-20', tags: ['backend', 'cms'], attachments: 0, comments: 6 },
  { id: 't16', title: 'SEO optimization', description: 'Implement meta tags, structured data, sitemap, and robots.txt.', status: 'todo', priority: 'medium', assigneeId: 'u10', projectId: 'p3', moduleId: 'm8', deadline: '2026-10-20', createdAt: '2026-09-20', updatedAt: '2026-09-20', tags: ['seo', 'marketing'], attachments: 0, comments: 1 },
  { id: 't17', title: 'Write case studies', description: 'Create 3 detailed case studies showcasing client success stories.', status: 'in-progress', priority: 'low', assigneeId: 'u20', projectId: 'p3', moduleId: 'm8', deadline: '2026-10-30', createdAt: '2026-09-18', updatedAt: '2026-09-25', tags: ['content'], attachments: 2, comments: 3 },
  // Mobile App tasks
  { id: 't18', title: 'Tab navigation setup', description: 'Implement bottom tab navigation with smooth transitions.', status: 'completed', priority: 'high', assigneeId: 'u9', projectId: 'p4', moduleId: 'm11', deadline: '2026-08-30', createdAt: '2026-07-15', updatedAt: '2026-08-28', tags: ['mobile', 'navigation'], attachments: 1, comments: 4 },
  { id: 't19', title: 'Deep linking support', description: 'Configure deep linking for all main app screens.', status: 'in-review', priority: 'medium', assigneeId: 'u9', projectId: 'p4', moduleId: 'm11', deadline: '2026-09-30', createdAt: '2026-09-01', updatedAt: '2026-09-24', tags: ['mobile'], attachments: 0, comments: 2 },
  { id: 't20', title: 'Offline data sync', description: 'Implement bidirectional data synchronization for offline mode.', status: 'backlog', priority: 'high', assigneeId: 'u9', projectId: 'p4', moduleId: 'm12', deadline: '2026-11-15', createdAt: '2026-09-15', updatedAt: '2026-09-15', tags: ['mobile', 'offline'], attachments: 0, comments: 0 },
  // More tasks for variety
  { id: 't21', title: 'Payment gateway integration', description: 'Integrate Stripe and Razorpay payment gateways for invoice payments.', status: 'in-progress', priority: 'urgent', assigneeId: 'u5', projectId: 'p1', moduleId: 'm4', deadline: '2026-09-28', createdAt: '2026-09-15', updatedAt: '2026-09-25', tags: ['backend', 'payments'], attachments: 1, comments: 8 },
  { id: 't22', title: 'User role permissions', description: 'Implement granular RBAC system with role hierarchy.', status: 'in-progress', priority: 'high', assigneeId: 'u2', projectId: 'p1', moduleId: 'm1', deadline: '2026-10-05', createdAt: '2026-09-20', updatedAt: '2026-09-25', tags: ['backend', 'security'], attachments: 0, comments: 4 },
  { id: 't23', title: 'Design system documentation', description: 'Document all design tokens, components, and patterns.', status: 'todo', priority: 'low', assigneeId: 'u22', projectId: 'p1', moduleId: 'm2', deadline: '2026-10-15', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['design', 'docs'], attachments: 0, comments: 0 },
  { id: 't24', title: 'Predictive task scoring', description: 'Build ML model to predict task completion probability.', status: 'blocked', priority: 'medium', assigneeId: 'u21', projectId: 'p2', moduleId: 'm5', deadline: '2026-10-20', createdAt: '2026-09-10', updatedAt: '2026-09-22', tags: ['ml', 'ai'], attachments: 1, comments: 5 },
  { id: 't25', title: 'Real-time notifications', description: 'Implement WebSocket-based real-time notification system.', status: 'todo', priority: 'high', assigneeId: 'u5', projectId: 'p2', moduleId: 'm6', deadline: '2026-10-10', createdAt: '2026-09-20', updatedAt: '2026-09-20', tags: ['backend', 'websocket'], attachments: 0, comments: 2 },
  { id: 't26', title: 'Job listing API', description: 'Build API endpoints for job listing CRUD operations.', status: 'backlog', priority: 'medium', assigneeId: 'u19', projectId: 'p3', moduleId: 'm10', deadline: '2026-10-30', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['backend', 'career'], attachments: 0, comments: 0 },
  { id: 't27', title: 'Application form builder', description: 'Create dynamic form builder for job applications.', status: 'backlog', priority: 'low', assigneeId: 'u3', projectId: 'p3', moduleId: 'm10', deadline: '2026-11-15', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['frontend'], attachments: 0, comments: 0 },
  { id: 't28', title: 'Push notification service', description: 'Set up Firebase Cloud Messaging for push notifications.', status: 'todo', priority: 'high', assigneeId: 'u9', projectId: 'p4', moduleId: 'm11', deadline: '2026-10-10', createdAt: '2026-09-18', updatedAt: '2026-09-18', tags: ['mobile', 'firebase'], attachments: 0, comments: 1 },
  { id: 't29', title: 'Conflict resolution engine', description: 'Handle data conflicts during offline-to-online sync.', status: 'backlog', priority: 'medium', assigneeId: 'u5', projectId: 'p4', moduleId: 'm12', deadline: '2026-12-01', createdAt: '2026-09-20', updatedAt: '2026-09-20', tags: ['backend', 'sync'], attachments: 0, comments: 0 },
  { id: 't30', title: 'Employee onboarding flow', description: 'Design and implement automated onboarding workflow.', status: 'todo', priority: 'medium', assigneeId: 'u14', projectId: 'p5', moduleId: 'm13', deadline: '2026-11-01', createdAt: '2026-09-15', updatedAt: '2026-09-15', tags: ['hr', 'workflow'], attachments: 0, comments: 2 },
  { id: 't31', title: 'Leave management system', description: 'Build leave application and approval system.', status: 'in-progress', priority: 'medium', assigneeId: 'u23', projectId: 'p5', moduleId: 'm13', deadline: '2026-10-15', createdAt: '2026-09-18', updatedAt: '2026-09-25', tags: ['hr', 'backend'], attachments: 0, comments: 3 },
  { id: 't32', title: 'Token bucket implementation', description: 'Implement distributed token bucket algorithm.', status: 'completed', priority: 'high', assigneeId: 'u15', projectId: 'p6', moduleId: 'm14', deadline: '2026-08-15', createdAt: '2026-06-01', updatedAt: '2026-08-14', tags: ['backend', 'algorithm'], attachments: 1, comments: 6 },
  { id: 't33', title: 'API docs with OpenAPI', description: 'Auto-generate API documentation from OpenAPI specs.', status: 'in-review', priority: 'medium', assigneeId: 'u19', projectId: 'p6', moduleId: 'm15', deadline: '2026-09-30', createdAt: '2026-09-01', updatedAt: '2026-09-24', tags: ['docs', 'api'], attachments: 2, comments: 4 },
  { id: 't34', title: 'Security audit fixes', description: 'Address findings from the Q3 security audit.', status: 'in-progress', priority: 'urgent', assigneeId: 'u15', projectId: 'p1', moduleId: 'm1', deadline: '2026-09-27', createdAt: '2026-09-20', updatedAt: '2026-09-25', tags: ['security', 'critical'], attachments: 3, comments: 11 },
  { id: 't35', title: 'Performance monitoring', description: 'Set up APM with custom metrics and alerting.', status: 'todo', priority: 'medium', assigneeId: 'u7', projectId: 'p2', moduleId: 'm6', deadline: '2026-10-15', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['devops', 'monitoring'], attachments: 0, comments: 1 },
  { id: 't36', title: 'Design mobile onboarding', description: 'Create onboarding screens for first-time app users.', status: 'in-progress', priority: 'medium', assigneeId: 'u22', projectId: 'p4', moduleId: 'm11', deadline: '2026-10-05', createdAt: '2026-09-15', updatedAt: '2026-09-24', tags: ['design', 'mobile'], attachments: 2, comments: 7 },
  { id: 't37', title: 'Email template system', description: 'Build transactional email templates with MJML.', status: 'todo', priority: 'low', assigneeId: 'u12', projectId: 'p1', moduleId: 'm3', deadline: '2026-10-20', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['design', 'email'], attachments: 0, comments: 0 },
  { id: 't38', title: 'Contact import/export', description: 'Implement CSV/Excel import and export for contacts.', status: 'todo', priority: 'medium', assigneeId: 'u17', projectId: 'p1', moduleId: 'm3', deadline: '2026-10-10', createdAt: '2026-09-20', updatedAt: '2026-09-20', tags: ['backend', 'crm'], attachments: 0, comments: 1 },
  { id: 't39', title: 'Data visualization library', description: 'Evaluate and integrate charting library for analytics.', status: 'completed', priority: 'medium', assigneeId: 'u3', projectId: 'p2', moduleId: 'm6', deadline: '2026-09-10', createdAt: '2026-08-20', updatedAt: '2026-09-09', tags: ['frontend', 'research'], attachments: 1, comments: 3 },
  { id: 't40', title: 'Unit test coverage', description: 'Increase test coverage to 80% for core modules.', status: 'in-progress', priority: 'medium', assigneeId: 'u8', projectId: 'p1', moduleId: 'm1', deadline: '2026-10-01', createdAt: '2026-09-15', updatedAt: '2026-09-25', tags: ['testing', 'quality'], attachments: 0, comments: 2 },
  { id: 't41', title: 'ETL pipeline optimization', description: 'Optimize data pipeline to reduce processing time by 50%.', status: 'in-progress', priority: 'high', assigneeId: 'u13', projectId: 'p2', moduleId: 'm7', deadline: '2026-10-05', createdAt: '2026-09-10', updatedAt: '2026-09-25', tags: ['data', 'optimization'], attachments: 1, comments: 4 },
  { id: 't42', title: 'Social media integration', description: 'Add social sharing and Open Graph meta tags.', status: 'backlog', priority: 'low', assigneeId: 'u10', projectId: 'p3', moduleId: 'm8', deadline: '2026-11-01', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['marketing', 'seo'], attachments: 0, comments: 0 },
  { id: 't43', title: 'Accessibility audit', description: 'Run accessibility audit and fix WCAG 2.1 AA issues.', status: 'todo', priority: 'high', assigneeId: 'u18', projectId: 'p3', moduleId: 'm8', deadline: '2026-10-25', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['a11y', 'quality'], attachments: 0, comments: 0 },
  { id: 't44', title: 'Payroll calculator', description: 'Build payroll calculation engine with tax deductions.', status: 'backlog', priority: 'high', assigneeId: 'u23', projectId: 'p5', moduleId: 'm13', deadline: '2026-11-30', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['hr', 'backend'], attachments: 0, comments: 0 },
  { id: 't45', title: 'API key management', description: 'Build API key generation, rotation, and revocation system.', status: 'todo', priority: 'high', assigneeId: 'u15', projectId: 'p6', moduleId: 'm14', deadline: '2026-10-15', createdAt: '2026-09-18', updatedAt: '2026-09-18', tags: ['security', 'api'], attachments: 0, comments: 2 },
  { id: 't46', title: 'SDK code generation', description: 'Auto-generate client SDKs from OpenAPI spec.', status: 'backlog', priority: 'low', assigneeId: 'u19', projectId: 'p6', moduleId: 'm15', deadline: '2026-11-30', createdAt: '2026-09-20', updatedAt: '2026-09-20', tags: ['devtools', 'sdk'], attachments: 0, comments: 0 },
  { id: 't47', title: 'Dashboard widget system', description: 'Create customizable widget system for user dashboards.', status: 'in-progress', priority: 'medium', assigneeId: 'u2', projectId: 'p1', moduleId: 'm2', deadline: '2026-10-08', createdAt: '2026-09-18', updatedAt: '2026-09-25', tags: ['frontend', 'ux'], attachments: 0, comments: 5 },
  { id: 't48', title: 'Load testing setup', description: 'Configure k6 load testing for API endpoints.', status: 'todo', priority: 'medium', assigneeId: 'u7', projectId: 'p1', moduleId: 'm2', deadline: '2026-10-12', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['devops', 'testing'], attachments: 0, comments: 0 },
  { id: 't49', title: 'Feature flag system', description: 'Implement feature flagging for gradual rollouts.', status: 'todo', priority: 'medium', assigneeId: 'u11', projectId: 'p2', moduleId: 'm6', deadline: '2026-10-20', createdAt: '2026-09-22', updatedAt: '2026-09-22', tags: ['backend', 'devops'], attachments: 0, comments: 1 },
  { id: 't50', title: 'Mobile app icon design', description: 'Design app icon variants for iOS and Android.', status: 'completed', priority: 'medium', assigneeId: 'u12', projectId: 'p4', moduleId: 'm11', deadline: '2026-09-10', createdAt: '2026-08-25', updatedAt: '2026-09-09', tags: ['design', 'mobile'], attachments: 4, comments: 6 },
];

// ============================================================
// MEETINGS
// ============================================================
export const mockMeetings: Meeting[] = [
  { id: 'mt1', title: 'Weekly Team Meeting', description: 'Weekly sync to discuss progress, blockers, and upcoming priorities.', date: '2026-09-25', startTime: '19:00', endTime: '20:00', hostId: 'u1', participantIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u11', 'u17', 'u18'], type: 'team', isRecurring: true, meetingLink: 'https://meet.hynastudio.com/weekly', status: 'scheduled' },
  { id: 'mt2', title: 'Sprint Planning', description: 'Plan the next two-week sprint for Hyna Biz.', date: '2026-09-26', startTime: '10:00', endTime: '11:30', hostId: 'u4', participantIds: ['u2', 'u3', 'u4', 'u5', 'u6', 'u8', 'u11', 'u16'], type: 'planning', isRecurring: true, meetingLink: 'https://meet.hynastudio.com/sprint', status: 'scheduled' },
  { id: 'mt3', title: 'Design Review - CRM', description: 'Review CRM module design iterations and gather feedback.', date: '2026-09-26', startTime: '14:00', endTime: '15:00', hostId: 'u6', participantIds: ['u3', 'u4', 'u6', 'u11', 'u16', 'u22'], type: 'review', isRecurring: false, meetingLink: 'https://meet.hynastudio.com/design-review', status: 'scheduled' },
  { id: 'mt4', title: '1:1 with Dharshan', description: 'Monthly check-in to discuss career growth and current projects.', date: '2026-09-27', startTime: '11:00', endTime: '11:30', hostId: 'u4', participantIds: ['u2', 'u4'], type: 'one-on-one', isRecurring: true, status: 'scheduled' },
  { id: 'mt5', title: 'ASTRA Demo', description: 'Demo of the analytics dashboard to stakeholders.', date: '2026-09-28', startTime: '15:00', endTime: '16:00', hostId: 'u4', participantIds: ['u1', 'u2', 'u3', 'u4', 'u13', 'u16', 'u21'], type: 'review', isRecurring: false, meetingLink: 'https://meet.hynastudio.com/astra-demo', status: 'scheduled' },
  { id: 'mt6', title: 'Daily Standup', description: 'Quick 15-minute daily standup.', date: '2026-09-25', startTime: '09:30', endTime: '09:45', hostId: 'u4', participantIds: ['u2', 'u3', 'u4', 'u5', 'u8', 'u11', 'u17', 'u18'], type: 'standup', isRecurring: true, meetingLink: 'https://meet.hynastudio.com/standup', status: 'completed' },
  { id: 'mt7', title: 'Security Review', description: 'Review Q3 security audit findings and remediation plan.', date: '2026-09-29', startTime: '10:00', endTime: '11:00', hostId: 'u1', participantIds: ['u1', 'u4', 'u5', 'u7', 'u15'], type: 'review', isRecurring: false, status: 'scheduled' },
  { id: 'mt8', title: 'Mobile App Architecture', description: 'Discuss offline architecture and sync strategy.', date: '2026-09-30', startTime: '14:00', endTime: '15:30', hostId: 'u4', participantIds: ['u4', 'u5', 'u9', 'u22'], type: 'planning', isRecurring: false, status: 'scheduled' },
  { id: 'mt9', title: 'HR Policy Update', description: 'Review updated leave policy and team benefits.', date: '2026-10-01', startTime: '11:00', endTime: '12:00', hostId: 'u14', participantIds: ['u1', 'u4', 'u14'], type: 'other', isRecurring: false, status: 'scheduled' },
  { id: 'mt10', title: 'Client Presentation - Hyna Biz', description: 'Present Q3 progress to key client stakeholders.', date: '2026-10-02', startTime: '16:00', endTime: '17:00', hostId: 'u1', participantIds: ['u1', 'u2', 'u4', 'u6', 'u16'], type: 'review', isRecurring: false, meetingLink: 'https://meet.hynastudio.com/client-q3', status: 'scheduled' },
  { id: 'mt11', title: 'Tech Talk: WebSockets', description: 'Internal tech talk on WebSocket architecture patterns.', date: '2026-10-03', startTime: '15:00', endTime: '16:00', hostId: 'u5', participantIds: ['u2', 'u3', 'u5', 'u7', 'u11', 'u17', 'u18', 'u19', 'u23'], type: 'other', isRecurring: false, status: 'scheduled' },
  { id: 'mt12', title: 'Product Roadmap Review', description: 'Q4 product roadmap planning and prioritization.', date: '2026-10-04', startTime: '10:00', endTime: '12:00', hostId: 'u1', participantIds: ['u1', 'u4', 'u6', 'u10', 'u14', 'u16'], type: 'planning', isRecurring: false, status: 'scheduled' },
  { id: 'mt13', title: 'Code Review Session', description: 'Collaborative code review for critical PRs.', date: '2026-09-25', startTime: '16:00', endTime: '17:00', hostId: 'u4', participantIds: ['u2', 'u3', 'u4', 'u5', 'u11'], type: 'review', isRecurring: true, status: 'scheduled' },
  { id: 'mt14', title: 'Marketing Strategy Sync', description: 'Align on Q4 marketing campaigns and content calendar.', date: '2026-10-01', startTime: '14:00', endTime: '15:00', hostId: 'u10', participantIds: ['u1', 'u10', 'u12', 'u16', 'u20'], type: 'team', isRecurring: false, status: 'scheduled' },
  { id: 'mt15', title: 'Retrospective - Sprint 18', description: 'Team retrospective for the completed sprint.', date: '2026-09-25', startTime: '17:00', endTime: '18:00', hostId: 'u4', participantIds: ['u2', 'u3', 'u4', 'u5', 'u6', 'u8', 'u11', 'u17', 'u18'], type: 'team', isRecurring: true, status: 'scheduled' },
  { id: 'mt16', title: 'Website Content Review', description: 'Review and approve website copy and visual content.', date: '2026-10-05', startTime: '11:00', endTime: '12:00', hostId: 'u10', participantIds: ['u6', 'u10', 'u12', 'u18', 'u20'], type: 'review', isRecurring: false, status: 'scheduled' },
  { id: 'mt17', title: 'Data Pipeline Review', description: 'Review ETL pipeline architecture and performance.', date: '2026-10-02', startTime: '10:00', endTime: '11:00', hostId: 'u13', participantIds: ['u4', 'u5', 'u7', 'u13'], type: 'review', isRecurring: false, status: 'scheduled' },
  { id: 'mt18', title: '1:1 with Arun', description: 'Monthly performance check-in.', date: '2026-09-28', startTime: '11:00', endTime: '11:30', hostId: 'u4', participantIds: ['u3', 'u4'], type: 'one-on-one', isRecurring: true, status: 'scheduled' },
  { id: 'mt19', title: 'All Hands', description: 'Monthly company-wide meeting.', date: '2026-10-06', startTime: '16:00', endTime: '17:30', hostId: 'u1', participantIds: mockUsers.map(u => u.id), type: 'team', isRecurring: true, meetingLink: 'https://meet.hynastudio.com/all-hands', status: 'scheduled' },
  { id: 'mt20', title: 'API Gateway Planning', description: 'Discuss API gateway v2 architecture.', date: '2026-10-07', startTime: '14:00', endTime: '15:00', hostId: 'u7', participantIds: ['u5', 'u7', 'u15', 'u19'], type: 'planning', isRecurring: false, status: 'scheduled' },
];

// ============================================================
// ATTENDANCE
// ============================================================
function generateAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date('2026-09-25');
  
  for (let dayOffset = 0; dayOffset < 25; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
    
    const dateStr = date.toISOString().split('T')[0];
    
    mockUsers.filter(u => u.status === 'active').forEach((user, idx) => {
      const rand = Math.random();
      let status: AttendanceStatus = 'present';
      let checkIn = `09:0${Math.floor(Math.random() * 5)}`;
      let checkOut = `18:${10 + Math.floor(Math.random() * 30)}`;
      let workingHours = '8h 30m';
      
      if (rand < 0.05) {
        status = 'absent';
        checkIn = undefined as unknown as string;
        checkOut = undefined as unknown as string;
        workingHours = undefined as unknown as string;
      } else if (rand < 0.12) {
        status = 'late';
        checkIn = `09:${15 + Math.floor(Math.random() * 45)}`;
        workingHours = `${7 + Math.floor(Math.random() * 2)}h ${Math.floor(Math.random() * 60)}m`;
      } else if (rand < 0.15) {
        status = 'leave';
        checkIn = undefined as unknown as string;
        checkOut = undefined as unknown as string;
        workingHours = undefined as unknown as string;
      }
      
      // Today's data is specific
      if (dayOffset === 0) {
        if (idx === 0) { status = 'present'; checkIn = '08:30'; }
        if (user.id === 'u2') { status = 'present'; checkIn = '09:12'; checkOut = undefined as unknown as string; workingHours = '6h 24m'; }
        if (user.id === 'u3') { status = 'late'; checkIn = '09:35'; }
        if (user.id === 'u24') { status = 'absent'; checkIn = undefined as unknown as string; checkOut = undefined as unknown as string; workingHours = undefined as unknown as string; }
      }
      
      records.push({
        id: `att-${dateStr}-${user.id}`,
        userId: user.id,
        date: dateStr,
        status,
        checkIn,
        checkOut,
        workingHours,
      });
    });
  }
  return records;
}

export const mockAttendance: AttendanceRecord[] = generateAttendance();

// ============================================================
// DAILY REPORTS
// ============================================================
export const mockDailyReports: DailyReport[] = [
  { id: 'dr1', userId: 'u2', date: '2026-09-24', content: 'Worked on implementing the Login API with JWT authentication. Completed token generation and validation middleware.', achievements: 'Completed JWT middleware, set up refresh token rotation', challenges: 'Had to debug a token expiry edge case with timezone differences', tomorrowPlan: 'Continue with OTP validation fix and role-based permissions', hoursWorked: 7.5, submittedAt: '2026-09-24T18:30:00' },
  { id: 'dr2', userId: 'u3', date: '2026-09-24', content: 'Fixed responsive layout issues on the dashboard and implemented new chart components for the analytics section.', achievements: 'Resolved 5 UI bugs, implemented bar chart and line chart components', challenges: 'Recharts responsive container had some quirks on mobile Safari', tomorrowPlan: 'Complete analytics charts PR and start CRM page implementation', hoursWorked: 6.8, submittedAt: '2026-09-24T18:15:00' },
  { id: 'dr3', userId: 'u5', date: '2026-09-24', content: 'Integrated Stripe payment gateway for the invoicing module. Set up webhook handlers for payment events.', achievements: 'Stripe integration complete, webhook handlers for 6 event types', challenges: 'Stripe webhook signature verification failed initially due to raw body parsing', tomorrowPlan: 'Add Razorpay integration and payment reconciliation logic', hoursWorked: 8.0, submittedAt: '2026-09-24T18:45:00' },
  { id: 'dr4', userId: 'u6', date: '2026-09-24', content: 'Finalized CRM contact page designs with all interaction states and responsive layouts.', achievements: 'Completed all design variants (empty, loading, populated), responsive mockups', challenges: 'Balancing information density with clean design on mobile', tomorrowPlan: 'Start design handoff and begin CRM pipeline view designs', hoursWorked: 7.0, submittedAt: '2026-09-24T17:30:00' },
  { id: 'dr5', userId: 'u7', date: '2026-09-24', content: 'Set up monitoring dashboards in Grafana and configured alerting for critical services.', achievements: 'Grafana dashboards for 4 services, PagerDuty integration', challenges: 'Had to fine-tune alert thresholds to avoid alert fatigue', tomorrowPlan: 'Set up distributed tracing with OpenTelemetry', hoursWorked: 7.2, submittedAt: '2026-09-24T18:00:00' },
  { id: 'dr6', userId: 'u8', date: '2026-09-24', content: 'Wrote integration tests for the authentication module. Covered login, logout, password reset, and MFA flows.', achievements: 'Added 24 new integration tests, test coverage up to 72%', challenges: 'Mocking OAuth providers in test environment was tricky', tomorrowPlan: 'Continue with CRM module tests and fix flaky tests', hoursWorked: 7.8, submittedAt: '2026-09-24T18:20:00' },
  { id: 'dr7', userId: 'u11', date: '2026-09-24', content: 'Implemented drag-and-drop pipeline view for lead management with smooth animations.', achievements: 'DnD working with keyboard accessibility support', challenges: 'Performance optimization needed for large lists', tomorrowPlan: 'Add filter and search to pipeline view', hoursWorked: 8.2, submittedAt: '2026-09-24T19:00:00' },
  { id: 'dr8', userId: 'u9', date: '2026-09-24', content: 'Configured deep linking for all main screens and added universal link support for iOS.', achievements: 'Deep linking works for 12 main screens, universal links configured', challenges: 'Android App Links verification needed domain verification', tomorrowPlan: 'Submit deep linking PR for review and start push notification setup', hoursWorked: 6.5, submittedAt: '2026-09-24T17:45:00' },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
export const mockNotifications: AppNotification[] = [
  { id: 'n1', type: 'task', title: 'New task assigned', message: 'You have been assigned "Implement Login API" in Hyna Biz.', userId: 'u2', read: false, createdAt: '2026-09-25T08:30:00', actionUrl: '/member/tasks' },
  { id: 'n2', type: 'meeting', title: 'Meeting starts in 15 minutes', message: 'Weekly Team Meeting starts at 7:00 PM today.', userId: 'u2', read: false, createdAt: '2026-09-25T18:45:00', actionUrl: '/member/meetings' },
  { id: 'n3', type: 'approval', title: 'Task approved', message: 'Your task "Update dashboard UI" has been approved by Karthik Rajan.', userId: 'u3', read: false, createdAt: '2026-09-25T08:00:00', actionUrl: '/member/tasks' },
  { id: 'n4', type: 'comment', title: 'New comment', message: 'Priya Sharma commented on "Implement Login API": "Looks good, can you add rate limiting?"', userId: 'u2', read: false, createdAt: '2026-09-25T10:15:00', actionUrl: '/member/tasks' },
  { id: 'n5', type: 'deadline', title: 'Deadline tomorrow', message: '"Fix OTP validation" is due tomorrow, September 26.', userId: 'u2', read: false, createdAt: '2026-09-25T09:00:00', actionUrl: '/member/tasks' },
  { id: 'n6', type: 'announcement', title: 'New announcement', message: 'New project guidelines have been published by Karthik Rajan.', userId: 'all', read: false, createdAt: '2026-09-25T07:00:00', actionUrl: '/member/announcements' },
  { id: 'n7', type: 'task', title: 'Task submitted for review', message: 'Arun Prakash submitted "Build analytics charts" for review.', userId: 'u1', read: false, createdAt: '2026-09-24T16:42:00', actionUrl: '/admin/tasks' },
  { id: 'n8', type: 'task', title: 'Task submitted for review', message: 'Sneha Reddy submitted "Design CRM contact page" for review.', userId: 'u1', read: false, createdAt: '2026-09-24T10:15:00', actionUrl: '/admin/tasks' },
  { id: 'n9', type: 'general', title: 'Leave request', message: 'Ganesh Mohan has requested casual leave for Sep 28-29.', userId: 'u1', read: true, createdAt: '2026-09-24T09:30:00', actionUrl: '/admin/leave' },
  { id: 'n10', type: 'meeting', title: 'Meeting rescheduled', message: 'Sprint Planning has been moved to 10:00 AM tomorrow.', userId: 'u2', read: true, createdAt: '2026-09-24T15:00:00', actionUrl: '/member/meetings' },
  { id: 'n11', type: 'task', title: 'Task unblocked', message: '"Data ingestion service" has been unblocked by Rajesh Menon.', userId: 'u13', read: true, createdAt: '2026-09-24T14:30:00', actionUrl: '/member/tasks' },
  { id: 'n12', type: 'approval', title: 'Changes requested', message: 'Karthik Rajan requested changes on "API docs with OpenAPI".', userId: 'u19', read: false, createdAt: '2026-09-24T16:00:00', actionUrl: '/member/tasks' },
  { id: 'n13', type: 'task', title: 'New task assigned', message: 'You have been assigned "Security audit fixes" in Hyna Biz.', userId: 'u15', read: true, createdAt: '2026-09-20T10:00:00', actionUrl: '/member/tasks' },
  { id: 'n14', type: 'comment', title: 'Mentioned in comment', message: 'Vikram Singh mentioned you in "Payment gateway integration".', userId: 'u2', read: true, createdAt: '2026-09-23T11:00:00', actionUrl: '/member/tasks' },
  { id: 'n15', type: 'meeting', title: 'New meeting invitation', message: 'You are invited to "ASTRA Demo" on September 28 at 3:00 PM.', userId: 'u2', read: true, createdAt: '2026-09-22T14:00:00', actionUrl: '/member/meetings' },
  { id: 'n16', type: 'general', title: 'Welcome Rithika!', message: 'Rithika Subramanian has joined the team as iOS Developer.', userId: 'all', read: true, createdAt: '2026-09-01T09:00:00' },
  { id: 'n17', type: 'deadline', title: 'Project deadline approaching', message: 'Company Website deadline is in 2 months (Nov 30, 2026).', userId: 'u1', read: true, createdAt: '2026-09-22T08:00:00', actionUrl: '/admin/projects' },
  { id: 'n18', type: 'task', title: 'All subtasks completed', message: 'All subtasks for "Invoice PDF generation" are now complete.', userId: 'u2', read: true, createdAt: '2026-09-14T17:00:00' },
  { id: 'n19', type: 'announcement', title: 'Office closure', message: 'Office will be closed on October 2 for Gandhi Jayanti.', userId: 'all', read: true, createdAt: '2026-09-20T08:00:00' },
  { id: 'n20', type: 'approval', title: 'Leave approved', message: 'Your casual leave request for Sep 28-29 has been approved.', userId: 'u17', read: true, createdAt: '2026-09-24T11:00:00' },
  { id: 'n21', type: 'task', title: 'Priority changed', message: '"Fix OTP validation" priority changed to Urgent by Priya Sharma.', userId: 'u2', read: false, createdAt: '2026-09-24T16:30:00', actionUrl: '/member/tasks' },
  { id: 'n22', type: 'comment', title: 'New comment', message: 'Kavitha Nair commented on "Unit test coverage": "Found 3 flaky tests to fix."', userId: 'u1', read: false, createdAt: '2026-09-25T11:00:00', actionUrl: '/admin/tasks' },
  { id: 'n23', type: 'meeting', title: 'Meeting reminder', message: 'Code Review Session starts at 4:00 PM today.', userId: 'u2', read: false, createdAt: '2026-09-25T15:30:00', actionUrl: '/member/meetings' },
  { id: 'n24', type: 'task', title: 'Task overdue', message: '"Blog CMS integration" is 5 days overdue.', userId: 'u18', read: false, createdAt: '2026-09-25T08:00:00', actionUrl: '/member/tasks' },
  { id: 'n25', type: 'general', title: 'Performance review', message: 'Q3 performance reviews are scheduled for next week.', userId: 'all', read: false, createdAt: '2026-09-25T07:30:00' },
  { id: 'n26', type: 'task', title: 'Task completed', message: 'Sathish Raman completed "Token bucket implementation".', userId: 'u1', read: true, createdAt: '2026-08-14T17:00:00' },
  { id: 'n27', type: 'announcement', title: 'Team outing', message: 'Team outing planned for October 15. Details in #general channel.', userId: 'all', read: true, createdAt: '2026-09-18T10:00:00' },
  { id: 'n28', type: 'meeting', title: 'Meeting cancelled', message: 'API Gateway Planning meeting has been cancelled.', userId: 'u15', read: true, createdAt: '2026-09-24T12:00:00' },
  { id: 'n29', type: 'deadline', title: 'Milestone approaching', message: 'Hyna Biz v2.0 milestone due in 3 weeks.', userId: 'u4', read: false, createdAt: '2026-09-25T08:00:00' },
  { id: 'n30', type: 'task', title: 'Review requested', message: 'Harish Chandran requested review on "API docs with OpenAPI".', userId: 'u4', read: false, createdAt: '2026-09-24T15:30:00', actionUrl: '/admin/tasks' },
];

// ============================================================
// CHAT CHANNELS & MESSAGES
// ============================================================
export const mockChannels: ChatChannel[] = [
  { id: 'ch1', name: 'General', type: 'general', memberIds: mockUsers.map(u => u.id), lastMessage: 'Team outing details posted! 🎉', lastMessageAt: '2026-09-25T12:30:00', unreadCount: 3, icon: 'hash' },
  { id: 'ch2', name: 'Development', type: 'general', memberIds: mockUsers.filter(u => u.department === 'Engineering').map(u => u.id), lastMessage: 'PR #234 merged successfully', lastMessageAt: '2026-09-25T11:45:00', unreadCount: 5, icon: 'code' },
  { id: 'ch3', name: 'Design', type: 'general', memberIds: ['u6', 'u12', 'u22'], lastMessage: 'New icon set uploaded to Figma', lastMessageAt: '2026-09-25T10:20:00', unreadCount: 1, icon: 'palette' },
  { id: 'ch4', name: 'Marketing', type: 'general', memberIds: ['u10', 'u12', 'u20'], lastMessage: 'Blog post draft ready for review', lastMessageAt: '2026-09-24T16:00:00', unreadCount: 0, icon: 'megaphone' },
  { id: 'ch5', name: 'Hyna Biz', type: 'project', memberIds: ['u2', 'u3', 'u4', 'u5', 'u6', 'u8', 'u11', 'u17'], lastMessage: 'Can you review the API changes?', lastMessageAt: '2026-09-25T13:00:00', unreadCount: 2, icon: 'folder' },
  { id: 'ch6', name: 'ASTRA', type: 'project', memberIds: ['u2', 'u4', 'u5', 'u7', 'u13', 'u21'], lastMessage: 'Model accuracy improved to 94%!', lastMessageAt: '2026-09-25T09:30:00', unreadCount: 0, icon: 'folder' },
  { id: 'ch7', name: 'Priya Sharma', type: 'direct', memberIds: ['u2', 'u4'], lastMessage: 'Thanks for the update!', lastMessageAt: '2026-09-25T08:50:00', unreadCount: 0, icon: 'user' },
  { id: 'ch8', name: 'Karthik Rajan', type: 'direct', memberIds: ['u2', 'u1'], lastMessage: 'Let\'s discuss the architecture tomorrow', lastMessageAt: '2026-09-24T17:00:00', unreadCount: 1, icon: 'user' },
];

export const mockMessages: ChatMessage[] = [
  // General channel
  { id: 'msg1', channelId: 'ch1', senderId: 'u1', content: 'Good morning everyone! 👋 Hope you all had a great weekend.', timestamp: '2026-09-25T09:00:00', type: 'text' },
  { id: 'msg2', channelId: 'ch1', senderId: 'u10', content: 'Morning! Just published the new blog post about our latest product features.', timestamp: '2026-09-25T09:15:00', type: 'text' },
  { id: 'msg3', channelId: 'ch1', senderId: 'u14', content: 'Reminder: Q3 performance reviews start next week. Please complete your self-assessments by Friday.', timestamp: '2026-09-25T10:00:00', type: 'text' },
  { id: 'msg4', channelId: 'ch1', senderId: 'u6', content: 'New design system components are ready for review in Figma! 🎨', timestamp: '2026-09-25T11:30:00', type: 'text' },
  { id: 'msg5', channelId: 'ch1', senderId: 'u1', content: 'Team outing details posted! 🎉 We\'re going to a resort on October 15. More details in the email.', timestamp: '2026-09-25T12:30:00', type: 'text' },
  // Development channel
  { id: 'msg6', channelId: 'ch2', senderId: 'u2', content: 'Can someone review PR #234? It\'s the JWT auth implementation.', timestamp: '2026-09-25T09:30:00', type: 'text' },
  { id: 'msg7', channelId: 'ch2', senderId: 'u5', content: 'I\'ll take a look. Is it ready for a full review or still WIP?', timestamp: '2026-09-25T09:35:00', type: 'text' },
  { id: 'msg8', channelId: 'ch2', senderId: 'u2', content: 'Ready for full review! All tests passing. 🟢', timestamp: '2026-09-25T09:36:00', type: 'text' },
  { id: 'msg9', channelId: 'ch2', senderId: 'u11', content: 'Just pushed the drag-and-drop pipeline view. Check it out on staging!', timestamp: '2026-09-25T10:45:00', type: 'text' },
  { id: 'msg10', channelId: 'ch2', senderId: 'u7', content: 'Heads up: I\'m doing a maintenance window tonight at 11 PM. Staging will be down for ~30 min.', timestamp: '2026-09-25T11:00:00', type: 'text' },
  { id: 'msg11', channelId: 'ch2', senderId: 'u5', content: 'PR #234 merged successfully. Great work on the auth implementation, Dharshan! 🎉', timestamp: '2026-09-25T11:45:00', type: 'text' },
  // Hyna Biz project channel
  { id: 'msg12', channelId: 'ch5', senderId: 'u4', content: 'Sprint 18 is wrapping up. Let\'s make sure all in-review tasks are resolved by EOD.', timestamp: '2026-09-25T10:00:00', type: 'text' },
  { id: 'msg13', channelId: 'ch5', senderId: 'u2', content: 'Working on the OTP fix now. Should be done by afternoon.', timestamp: '2026-09-25T10:05:00', type: 'text' },
  { id: 'msg14', channelId: 'ch5', senderId: 'u6', content: 'CRM contact page designs are ready for review. I\'ve submitted the task.', timestamp: '2026-09-25T10:15:00', type: 'text' },
  { id: 'msg15', channelId: 'ch5', senderId: 'u8', content: 'Integration tests for auth module are at 72% coverage now. Targeting 80% by EOW.', timestamp: '2026-09-25T11:30:00', type: 'text' },
  { id: 'msg16', channelId: 'ch5', senderId: 'u2', content: 'Can you review the API changes?', timestamp: '2026-09-25T13:00:00', type: 'text' },
  // DM with Priya
  { id: 'msg17', channelId: 'ch7', senderId: 'u4', content: 'Hey Dharshan, how\'s the Login API coming along?', timestamp: '2026-09-25T08:30:00', type: 'text' },
  { id: 'msg18', channelId: 'ch7', senderId: 'u2', content: 'Going well! JWT generation is done. Working on the refresh token flow now.', timestamp: '2026-09-25T08:35:00', type: 'text' },
  { id: 'msg19', channelId: 'ch7', senderId: 'u4', content: 'Great! Make sure to add rate limiting before submitting for review.', timestamp: '2026-09-25T08:40:00', type: 'text' },
  { id: 'msg20', channelId: 'ch7', senderId: 'u2', content: 'Will do. Should have it ready by tomorrow.', timestamp: '2026-09-25T08:45:00', type: 'text' },
  { id: 'msg21', channelId: 'ch7', senderId: 'u4', content: 'Thanks for the update!', timestamp: '2026-09-25T08:50:00', type: 'text' },
];

// ============================================================
// FILES
// ============================================================
export const mockFolders: Folder[] = [
  { id: 'f1', name: 'Projects', fileCount: 24, icon: 'folder' },
  { id: 'f2', name: 'Documents', fileCount: 18, icon: 'file-text' },
  { id: 'f3', name: 'Design', fileCount: 32, icon: 'palette' },
  { id: 'f4', name: 'Reports', fileCount: 12, icon: 'bar-chart' },
  { id: 'f5', name: 'Meeting Files', fileCount: 8, icon: 'video' },
  { id: 'f6', name: 'HR', fileCount: 6, icon: 'users' },
];

export const mockFiles: FileItem[] = [
  { id: 'file1', name: 'Hyna_Biz_PRD.pdf', type: 'document', size: 2450000, folder: 'Projects', uploadedBy: 'u16', uploadedAt: '2026-09-20T10:00:00', url: '#', mimeType: 'application/pdf', projectId: 'p1' },
  { id: 'file2', name: 'Dashboard_Mockup_v3.fig', type: 'other', size: 8900000, folder: 'Design', uploadedBy: 'u6', uploadedAt: '2026-09-22T14:30:00', url: '#', mimeType: 'application/octet-stream' },
  { id: 'file3', name: 'API_Documentation.md', type: 'document', size: 156000, folder: 'Documents', uploadedBy: 'u20', uploadedAt: '2026-09-24T09:15:00', url: '#', mimeType: 'text/markdown', projectId: 'p1' },
  { id: 'file4', name: 'CRM_Wireframes.pdf', type: 'document', size: 4200000, folder: 'Design', uploadedBy: 'u6', uploadedAt: '2026-09-18T11:00:00', url: '#', mimeType: 'application/pdf', projectId: 'p1' },
  { id: 'file5', name: 'Sprint_18_Report.xlsx', type: 'spreadsheet', size: 890000, folder: 'Reports', uploadedBy: 'u4', uploadedAt: '2026-09-25T08:00:00', url: '#', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'file6', name: 'Team_Photo_Sep.jpg', type: 'image', size: 3400000, folder: 'HR', uploadedBy: 'u14', uploadedAt: '2026-09-15T16:00:00', url: '#', mimeType: 'image/jpeg' },
  { id: 'file7', name: 'Architecture_Diagram.png', type: 'image', size: 1200000, folder: 'Projects', uploadedBy: 'u7', uploadedAt: '2026-09-20T15:30:00', url: '#', mimeType: 'image/png', projectId: 'p2' },
  { id: 'file8', name: 'Weekly_Standup_Notes.docx', type: 'document', size: 45000, folder: 'Meeting Files', uploadedBy: 'u4', uploadedAt: '2026-09-25T10:00:00', url: '#', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'file9', name: 'Brand_Guidelines_v2.pdf', type: 'document', size: 12000000, folder: 'Design', uploadedBy: 'u12', uploadedAt: '2026-09-10T09:00:00', url: '#', mimeType: 'application/pdf' },
  { id: 'file10', name: 'Q3_Performance_Report.pdf', type: 'document', size: 3800000, folder: 'Reports', uploadedBy: 'u14', uploadedAt: '2026-09-23T14:00:00', url: '#', mimeType: 'application/pdf' },
  { id: 'file11', name: 'ASTRA_Presentation.pptx', type: 'presentation', size: 15600000, folder: 'Projects', uploadedBy: 'u16', uploadedAt: '2026-09-22T16:00:00', url: '#', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', projectId: 'p2' },
  { id: 'file12', name: 'Leave_Policy_2026.pdf', type: 'document', size: 780000, folder: 'HR', uploadedBy: 'u14', uploadedAt: '2026-01-05T10:00:00', url: '#', mimeType: 'application/pdf' },
  { id: 'file13', name: 'Security_Audit_Q3.pdf', type: 'document', size: 5600000, folder: 'Reports', uploadedBy: 'u15', uploadedAt: '2026-09-18T09:00:00', url: '#', mimeType: 'application/pdf' },
  { id: 'file14', name: 'App_Icon_Variants.zip', type: 'archive', size: 24000000, folder: 'Design', uploadedBy: 'u12', uploadedAt: '2026-09-09T11:30:00', url: '#', mimeType: 'application/zip', projectId: 'p4' },
  { id: 'file15', name: 'Database_Schema.sql', type: 'code', size: 34000, folder: 'Projects', uploadedBy: 'u5', uploadedAt: '2026-09-21T13:00:00', url: '#', mimeType: 'text/plain', projectId: 'p1' },
];

// ============================================================
// LEAVE REQUESTS
// ============================================================
export const mockLeaveRequests: LeaveRequest[] = [
  { id: 'lr1', userId: 'u17', type: 'casual', startDate: '2026-09-28', endDate: '2026-09-29', reason: 'Family function in hometown.', status: 'pending', appliedAt: '2026-09-24T09:30:00' },
  { id: 'lr2', userId: 'u9', type: 'sick', startDate: '2026-09-22', endDate: '2026-09-22', reason: 'Fever and body ache.', status: 'approved', appliedAt: '2026-09-22T08:00:00', reviewedBy: 'u4', reviewedAt: '2026-09-22T08:30:00' },
  { id: 'lr3', userId: 'u12', type: 'earned', startDate: '2026-10-10', endDate: '2026-10-14', reason: 'Vacation trip.', status: 'pending', appliedAt: '2026-09-25T10:00:00' },
  { id: 'lr4', userId: 'u20', type: 'casual', startDate: '2026-10-08', endDate: '2026-10-08', reason: 'Personal appointment.', status: 'pending', appliedAt: '2026-09-25T11:00:00' },
  { id: 'lr5', userId: 'u3', type: 'sick', startDate: '2026-09-15', endDate: '2026-09-16', reason: 'Dental surgery recovery.', status: 'approved', appliedAt: '2026-09-14T17:00:00', reviewedBy: 'u4', reviewedAt: '2026-09-14T17:30:00' },
  { id: 'lr6', userId: 'u18', type: 'casual', startDate: '2026-09-10', endDate: '2026-09-10', reason: 'Moving to new apartment.', status: 'approved', appliedAt: '2026-09-08T09:00:00', reviewedBy: 'u1', reviewedAt: '2026-09-08T10:00:00' },
  { id: 'lr7', userId: 'u5', type: 'earned', startDate: '2026-10-20', endDate: '2026-10-24', reason: 'Annual family vacation.', status: 'pending', appliedAt: '2026-09-25T12:00:00' },
  { id: 'lr8', userId: 'u11', type: 'unpaid', startDate: '2026-11-01', endDate: '2026-11-03', reason: 'Conference attendance.', status: 'rejected', appliedAt: '2026-09-20T14:00:00', reviewedBy: 'u4', reviewedAt: '2026-09-20T16:00:00' },
];

// ============================================================
// ANNOUNCEMENTS
// ============================================================
export const mockAnnouncements: Announcement[] = [
  { id: 'ann1', title: 'New Project Guidelines', content: 'We have updated our project management guidelines. All team members are required to follow the new standards starting October 1st. Please review the updated documentation in the shared drive.', priority: 'high', createdBy: 'u1', createdAt: '2026-09-25T07:00:00', audience: 'all', isPublished: true },
  { id: 'ann2', title: 'Office Closure - Gandhi Jayanti', content: 'The office will be closed on October 2nd, 2026 for Gandhi Jayanti. This is a national holiday. Please plan your work accordingly.', priority: 'normal', createdBy: 'u14', createdAt: '2026-09-20T08:00:00', audience: 'all', isPublished: true },
  { id: 'ann3', title: 'Team Outing - October 15', content: 'We\'re organizing a team outing to a resort on October 15th! Transportation will be arranged from the office. Please confirm your attendance by October 5th.', priority: 'normal', createdBy: 'u14', createdAt: '2026-09-18T10:00:00', audience: 'all', isPublished: true },
  { id: 'ann4', title: 'Q3 Performance Reviews', content: 'Q3 performance reviews are scheduled for the week of September 29th. Please complete your self-assessment forms by September 26th. Your manager will schedule 1:1 meetings.', priority: 'high', createdBy: 'u14', createdAt: '2026-09-25T07:30:00', audience: 'all', isPublished: true },
  { id: 'ann5', title: 'New Hire: Rithika Subramanian', content: 'Please welcome Rithika Subramanian who joins our engineering team as an iOS Developer! Rithika comes with 4 years of experience in native iOS development.', priority: 'normal', createdBy: 'u14', createdAt: '2026-09-01T09:00:00', audience: 'all', isPublished: true },
  { id: 'ann6', title: 'Updated Leave Policy', content: 'The leave policy has been updated for 2026. Key changes include additional casual leave days and flexible work-from-home options. Details available in the HR folder.', priority: 'normal', createdBy: 'u14', createdAt: '2026-01-05T10:00:00', audience: 'all', isPublished: true },
  { id: 'ann7', title: 'Server Maintenance Window', content: 'Planned maintenance on staging servers tonight (September 25) from 11 PM to 11:30 PM IST. Production systems will not be affected.', priority: 'low', createdBy: 'u7', createdAt: '2026-09-25T11:00:00', audience: 'all', isPublished: true },
];

// ============================================================
// HELPERS
// ============================================================
export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id);
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find(p => p.id === id);
}

export function getModulesByProject(projectId: string): Module[] {
  return mockModules.filter(m => m.projectId === projectId);
}

export function getTasksByProject(projectId: string): Task[] {
  return mockTasks.filter(t => t.projectId === projectId);
}

export function getTasksByModule(moduleId: string): Task[] {
  return mockTasks.filter(t => t.moduleId === moduleId);
}

export function getTasksByUser(userId: string): Task[] {
  return mockTasks.filter(t => t.assigneeId === userId);
}

export function getAttendanceByUser(userId: string): AttendanceRecord[] {
  return mockAttendance.filter(a => a.userId === userId);
}

export function getAttendanceByDate(date: string): AttendanceRecord[] {
  return mockAttendance.filter(a => a.date === date);
}

export function getNotificationsByUser(userId: string): AppNotification[] {
  return mockNotifications.filter(n => n.userId === userId || n.userId === 'all');
}

export function getMeetingsByUser(userId: string): Meeting[] {
  return mockMeetings.filter(m => m.participantIds.includes(userId) || m.hostId === userId);
}
