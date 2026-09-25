import { useState, useEffect } from 'react';
import { Search, Upload, Grid, List, Folder, FileText, Image, Film, Code, Archive, BarChart3, Presentation, Download, Trash2 } from 'lucide-react';
import { Button, EmptyState, LoadingState } from '@/components/ui';
import { cn, formatFileSize, formatDate } from '@/lib/utils';
import { getFiles, getFolders, getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import type { FileItem, Folder as FolderType } from '@/types';

const fileIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText, image: Image, video: Film, code: Code, archive: Archive,
  spreadsheet: BarChart3, presentation: Presentation, other: FileText,
};

export function FilesPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        await getUsers();
        const [fls, flds] = await Promise.all([getFiles(), getFolders()]);
        if (isMounted) {
          setFiles(fls);
          setFolders(flds);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  const currentFiles = selectedFolder
    ? files.filter(f => f.folder === selectedFolder)
    : files;

  const filtered = currentFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-description">{selectedFolder || 'All files'} • {filtered.length} files</p>
        </div>
        <Button onClick={() => toast.info('File upload storage bucket configured via Supabase Storage.')}>
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)]">
          <button onClick={() => setView('grid')} className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-[var(--color-card)] shadow-sm' : '')}><Grid className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-[var(--color-card)] shadow-sm' : '')}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Folders */}
      {!selectedFolder && folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.name)}
                className="card p-4 card-hover text-center"
              >
                <Folder className="w-8 h-8 mx-auto mb-2 text-[var(--color-primary)]" />
                <p className="text-sm font-medium truncate">{folder.name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{folder.fileCount} files</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedFolder && (
        <button onClick={() => setSelectedFolder(null)} className="text-sm text-[var(--color-primary)] hover:underline mb-4 inline-block">
          ← All Folders
        </button>
      )}

      {/* Files */}
      <h2 className="text-sm font-semibold mb-3">{selectedFolder ? `${selectedFolder} Files` : 'Recent Files'}</h2>
      {filtered.length === 0 ? (
        <EmptyState title="No files found" description="Try a different search or upload new files." />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((file, idx) => {
            const Icon = fileIcons[file.type] || FileText;
            const uploader = getUserById(file.uploadedBy);
            return (
              <div key={file.id} className={cn('card p-4 card-hover animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}>
                <div className="flex items-center justify-center h-20 mb-3 rounded-lg bg-[var(--color-muted)]">
                  <Icon className="w-8 h-8 text-[var(--color-muted-foreground)]" />
                </div>
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-[var(--color-muted-foreground)]">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-xs text-[var(--color-muted-foreground)]">{uploader?.name || 'User'}</span>
                  <div className="flex gap-1">
                    <button className="p-1 rounded hover:bg-[var(--color-muted)] transition-colors" onClick={() => toast.success('Download started')}><Download className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" /></button>
                    <button className="p-1 rounded hover:bg-[var(--color-muted)] transition-colors" onClick={() => toast.error('File deleted')}><Trash2 className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Size</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Uploaded By</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.map(file => {
                const Icon = fileIcons[file.type] || FileText;
                const uploader = getUserById(file.uploadedBy);
                return (
                  <tr key={file.id} className="hover:bg-[var(--color-muted)] transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-[var(--color-muted-foreground)]" /><span className="font-medium truncate max-w-[200px]">{file.name}</span></div></td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden sm:table-cell">{formatFileSize(file.size)}</td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden md:table-cell">{uploader?.name || 'User'}</td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)] hidden sm:table-cell">{formatDate(file.uploadedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded hover:bg-[var(--color-muted)] transition-colors" onClick={() => toast.success('Download started')}><Download className="w-4 h-4 text-[var(--color-muted-foreground)]" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
