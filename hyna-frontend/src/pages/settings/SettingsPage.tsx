import React, { useState } from 'react';
import {
  User,
  Sun,
  Moon,
  Monitor,
  Shield,
  Bell,
  Building,
  Key,
  Save,
  CheckCircle2,
  Lock,
  Smartphone,
  Globe,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Avatar } from '@/components/ui';
import { useAuthStore, useThemeStore } from '@/stores';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { currentUser, currentRole, setUser } = useAuthStore();
  const { mode, setMode } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'security'>('profile');

  // Profile form state
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [designation, setDesignation] = useState(currentUser?.designation || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [bio, setBio] = useState(currentUser?.bio || '');

  // Notifications state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  const [announcementsAlert, setAnnouncementsAlert] = useState(true);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setNewConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setUser({
      ...currentUser,
      name,
      email,
      phone,
      designation,
      department,
      bio,
    });
    toast.success('Profile updated successfully!');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    toast.success('Security settings updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setNewConfirmPassword('');
  };

  return (
    <div className="page-container space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Manage your account preferences, appearance, notifications, and security.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[var(--color-border)] overflow-x-auto gap-4">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security & Access', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-medium transition cursor-pointer shrink-0',
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card p-6 border border-[var(--color-border)] bg-[var(--color-card)] rounded-xl space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={currentUser?.name || 'User'} size="lg" />
              <div>
                <h3 className="font-semibold text-lg">{currentUser?.name}</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] capitalize">
                  {currentUser?.designation} • {currentRole}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-[var(--color-border)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                  Bio / Responsibilities
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="gap-2 cursor-pointer">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card p-6 border border-[var(--color-border)] bg-[var(--color-card)] rounded-xl space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-1">Theme Preferences</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Choose your preferred interface theme for Hyna Studio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'light', label: 'Light Mode', desc: 'Clean, bright workspace', icon: Sun },
              { id: 'dark', label: 'Dark Mode', desc: 'Sleek, low-glare dark palette', icon: Moon },
              { id: 'system', label: 'System Default', desc: 'Match your OS setting', icon: Monitor },
            ].map((themeOpt) => {
              const Icon = themeOpt.icon;
              const isSelected = mode === themeOpt.id;
              return (
                <button
                  key={themeOpt.id}
                  onClick={() => {
                    setMode(themeOpt.id as any);
                    toast.success(`Theme switched to ${themeOpt.label}`);
                  }}
                  className={cn(
                    'p-4 rounded-xl border text-left transition cursor-pointer',
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-[var(--color-muted)]'
                      : 'border-[var(--color-border)] hover:border-zinc-400 bg-[var(--color-card)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />}
                  </div>
                  <p className="font-semibold text-sm">{themeOpt.label}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{themeOpt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card p-6 border border-[var(--color-border)] bg-[var(--color-card)] rounded-xl space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-1">Email & In-App Alerts</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Configure which updates and alerts you wish to receive in real-time.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Email Digest & Critical Alerts', desc: 'Receive high priority announcements to your registered inbox', state: emailAlerts, set: setEmailAlerts },
              { label: 'Task Assignments & Reviews', desc: 'Notify when assigned a new task or when task submissions are reviewed', state: taskAssignments, set: setTaskAssignments },
              { label: 'Meeting Reminders', desc: 'Get alerts 10 minutes prior to scheduled standups and team syncs', state: meetingReminders, set: setMeetingReminders },
              { label: 'Broadcast Announcements', desc: 'Push notification when management issues studio-wide notices', state: announcementsAlert, set: setAnnouncementsAlert },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={item.state}
                  onChange={(e) => {
                    item.set(e.target.checked);
                    toast.success('Notification preference saved');
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6 border border-[var(--color-border)] bg-[var(--color-card)] rounded-xl space-y-6">
          <div>
            <h3 className="font-semibold text-base mb-1">Security & Authentication</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Update password credentials and two-factor authentication.
            </p>
          </div>

          <form onSubmit={handleSaveSecurity} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-foreground)]">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setNewConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="gap-2 cursor-pointer">
                <Lock className="w-4 h-4" />
                Update Password
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Add an extra layer of security requiring authenticator app OTP.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTwoFactorEnabled(!twoFactorEnabled);
                toast.success(twoFactorEnabled ? '2FA disabled' : '2FA activated');
              }}
            >
              {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
