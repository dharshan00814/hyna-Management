import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@/types';
import { getUsers, addMember } from './api';

export interface InternshipApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  university: string;
  roleOfInterest: string;
  resumeUrl: string;
  portfolioUrl?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  appliedAt: string;
}

let applicationsCache: InternshipApplication[] = [
  {
    id: 'app_1',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    phone: '+1 234 567 8900',
    university: 'State University',
    roleOfInterest: 'Frontend Developer Intern',
    resumeUrl: '#',
    portfolioUrl: 'https://github.com/alice',
    status: 'pending',
    appliedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'app_2',
    name: 'Bob Smith',
    email: 'bob.s@example.com',
    phone: '+1 987 654 3210',
    university: 'Tech Institute',
    roleOfInterest: 'UI/UX Design Intern',
    resumeUrl: '#',
    status: 'reviewed',
    appliedAt: new Date(Date.now() - 172800000).toISOString(),
  }
];

export async function getInternshipApplications(): Promise<InternshipApplication[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('internship_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          university: row.university,
          roleOfInterest: row.role_of_interest || row.roleOfInterest,
          resumeUrl: row.resume_url || row.resumeUrl,
          portfolioUrl: row.portfolio_url || row.portfolioUrl,
          status: row.status,
          appliedAt: row.created_at,
        }));
      }
    } catch (err) {
      console.warn('Error fetching internship applications:', err);
    }
  }
  return [...applicationsCache];
}

export async function updateApplicationStatus(id: string, status: InternshipApplication['status']): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('internship_applications')
        .update({ status })
        .eq('id', id);
    } catch (err) {
      console.warn('Error updating internship application:', err);
    }
  }
  
  const appIndex = applicationsCache.findIndex(a => a.id === id);
  if (appIndex !== -1) {
    applicationsCache[appIndex].status = status;
  }
}

export async function acceptInternAndCreateAccount(application: InternshipApplication): Promise<User> {
  // Update status
  await updateApplicationStatus(application.id, 'accepted');
  
  // Create user account
  const newUser = await addMember({
    name: application.name,
    email: application.email,
    role: 'member',
    department: 'Internship',
    designation: application.roleOfInterest || 'Intern',
    phone: application.phone,
  });
  
  return newUser;
}

export async function getActiveInterns(): Promise<User[]> {
  const allUsers = await getUsers();
  // We identify interns by department or designation
  return allUsers.filter(u => 
    u.department?.toLowerCase() === 'internship' || 
    u.department?.toLowerCase() === 'intern' ||
    u.designation?.toLowerCase().includes('intern')
  );
}
