import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Avatar, Badge, EmptyState } from '@/components/ui';
import { cn, getStatusColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockUsers, mockAttendance } from '@/mock/data';

export function AttendancePage() {
  const { currentRole, currentUser } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState('2026-09-25');
  const [search, setSearch] = useState('');

  const isAdmin = currentRole !== 'member';
  const records = isAdmin
    ? mockAttendance.filter(a => a.date === selectedDate)
    : mockAttendance.filter(a => a.userId === currentUser?.id);

  const filteredRecords = isAdmin ? records.filter(r => {
    const user = mockUsers.find(u => u.id === r.userId);
    return !search || user?.name.toLowerCase().includes(search.toLowerCase());
  }) : records;

  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;

  // Member stats
  const memberRecords = isAdmin ? [] : mockAttendance.filter(a => a.userId === currentUser?.id && a.date.startsWith('2026-09'));
  const memberPresent = memberRecords.filter(r => r.status === 'present').length;
  const memberLate = memberRecords.filter(r => r.status === 'late').length;
  const memberLeave = memberRecords.filter(r => r.status === 'leave').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{isAdmin ? 'Attendance' : 'My Attendance'}</h1>
        <p className="page-description">{isAdmin ? 'Track team attendance' : 'September 2026'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {isAdmin ? (
          <>
            <div className="card p-4 text-center animate-slide-up"><p className="text-2xl font-semibold text-emerald-500">{presentCount}</p><p className="text-xs text-[var(--color-muted-foreground)]">Present</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-1"><p className="text-2xl font-semibold text-amber-500">{lateCount}</p><p className="text-xs text-[var(--color-muted-foreground)]">Late</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-2"><p className="text-2xl font-semibold text-red-500">{absentCount}</p><p className="text-xs text-[var(--color-muted-foreground)]">Absent</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-3"><p className="text-2xl font-semibold text-blue-500">{leaveCount}</p><p className="text-xs text-[var(--color-muted-foreground)]">On Leave</p></div>
          </>
        ) : (
          <>
            <div className="card p-4 text-center animate-slide-up"><p className="text-2xl font-semibold text-emerald-500">{memberPresent}</p><p className="text-xs text-[var(--color-muted-foreground)]">Present</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-1"><p className="text-2xl font-semibold text-amber-500">{memberLate}</p><p className="text-xs text-[var(--color-muted-foreground)]">Late</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-2"><p className="text-2xl font-semibold text-blue-500">{memberLeave}</p><p className="text-xs text-[var(--color-muted-foreground)]">Leave</p></div>
            <div className="card p-4 text-center animate-slide-up stagger-3"><p className="text-2xl font-semibold">7h 42m</p><p className="text-xs text-[var(--color-muted-foreground)]">Avg. Working</p></div>
          </>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }}
              className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-sm" />
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }}
              className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
            <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                {isAdmin && <th className="px-4 py-3 font-medium">Member</th>}
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Check In</th>
                <th className="px-4 py-3 font-medium">Check Out</th>
                <th className="px-4 py-3 font-medium">Working Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredRecords.slice(0, 25).map(record => {
                const user = mockUsers.find(u => u.id === record.userId);
                return (
                  <tr key={record.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={user?.name || ''} size="xs" />
                          <span className="font-medium truncate max-w-[120px]">{user?.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{formatDate(record.date)}</td>
                    <td className="px-4 py-3"><Badge className={getStatusColor(record.status)}>{record.status}</Badge></td>
                    <td className="px-4 py-3">{record.checkIn || '-'}</td>
                    <td className="px-4 py-3">{record.checkOut || '-'}</td>
                    <td className="px-4 py-3">{record.workingHours || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
