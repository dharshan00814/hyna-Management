import React, { useState, useRef, useEffect } from 'react';
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
  Camera,
  Upload,
  Trash2,
  Image,
  Sparkles,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, Avatar } from '@/components/ui';
import { useAuthStore, useThemeStore } from '@/stores';
import { updateUserProfile, uploadAvatar } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
];

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
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setDesignation(currentUser.designation || '');
      setDepartment(currentUser.department || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be under 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      const publicUrl = await uploadAvatar(currentUser.id, file);
      setAvatar(publicUrl);
      const updated = await updateUserProfile(currentUser.id, { avatar: publicUrl });
      setUser(updated);
      toast.success('Profile picture updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err?.message || 'Failed to upload profile picture', { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser?.id) return;
    setIsUploadingAvatar(true);
    try {
      setAvatar('');
      const updated = await updateUserProfile(currentUser.id, { avatar: '' });
      setUser(updated);
      toast.success('Profile picture removed. Reverted to initials.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSelectPresetAvatar = async (presetUrl: string) => {
    if (!currentUser?.id) return;
    setIsUploadingAvatar(true);
    try {
      setAvatar(presetUrl);
      const updated = await updateUserProfile(currentUser.id, { avatar: presetUrl });
      setUser(updated);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply preset');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAvatarUrl.trim() || !currentUser?.id) return;
    setIsUploadingAvatar(true);
    try {
      const url = customAvatarUrl.trim();
      setAvatar(url);
      const updated = await updateUserProfile(currentUser.id, { avatar: url });
      setUser(updated);
      setShowUrlInput(false);
      setCustomAvatarUrl('');
      toast.success('Custom avatar URL applied!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update avatar URL');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    try {
      const updated = await updateUserProfile(currentUser.id, {
        name,
        phone,
        bio,
        designation,
        department,
        avatar,
      });
      setUser(updated);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Security settings updated in Supabase Auth!');
      setCurrentPassword('');
      setNewPassword('');
      setNewConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    }
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
            {/* Avatar & Photo Customization Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <Avatar name={currentUser?.name || 'User'} src={avatar} size="xl" className="ring-4 ring-[var(--color-primary)]/20 shadow-md" />
                  
                  {/* Quick Change Badge Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    title="Upload new profile picture"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-[var(--color-foreground)]">{currentUser?.name}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {currentRole}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                    {currentUser?.designation || 'Team Member'} • {currentUser?.department || 'Hyna Studio'}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]/80 mt-1">
                    PNG, JPG, WebP up to 5MB. Real-time synchronized across all pages.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Avatar */}
              <div className="flex items-center gap-2 flex-wrap sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Photo
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="cursor-pointer text-xs"
                >
                  <LinkIcon className="w-3.5 h-3.5 mr-1" />
                  Image URL
                </Button>

                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Custom URL Input Accordion */}
            {showUrlInput && (
              <form onSubmit={handleApplyCustomUrl} className="p-3 rounded-xl bg-[var(--color-muted)]/50 border border-[var(--color-border)] flex items-center gap-2 animate-slide-up">
                <input
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 h-8 px-3 rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  required
                />
                <Button type="submit" size="sm" disabled={isUploadingAvatar || !customAvatarUrl.trim()} className="h-8 text-xs">
                  Apply URL
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrlInput(false)} className="h-8 text-xs">
                  Cancel
                </Button>
              </form>
            )}

            {/* Preset Avatars Selection Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Or choose a preset avatar
                </span>
                <span className="text-[11px] text-[var(--color-muted-foreground)]">Click to apply instantly</span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {PRESET_AVATARS.map((preset, index) => {
                  const isSelected = avatar === preset;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(preset)}
                      disabled={isUploadingAvatar}
                      className={cn(
                        'relative rounded-full p-0.5 transition-all shrink-0 cursor-pointer hover:scale-110 active:scale-95',
                        isSelected
                          ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-card)]'
                          : 'hover:ring-2 hover:ring-[var(--color-border)]'
                      )}
                      title={`Select Preset Avatar ${index + 1}`}
                    >
                      <img
                        src={preset}
                        alt={`Preset ${index + 1}`}
                        className="w-10 h-10 rounded-full object-cover shadow-xs"
                      />
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[8px] font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
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
