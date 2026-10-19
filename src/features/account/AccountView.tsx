/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthSync } from '../../context/AuthSyncContext';
import { useAcademicHierarchy } from '../../context/AcademicHierarchyContext';
import { useDeleteConfirmation } from '../../context/DeleteConfirmationContext';
import { AppRoute } from '../../types/navigation';
import { 
  User, 
  LogOut, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Cloud, 
  FileText, 
  Lock,
  Download,
  Upload,
  RotateCcw,
  Check,
  FileJson
} from 'lucide-react';

export type BackgroundMode = 'transparent' | 'grid';

interface AccountViewProps {
  backgroundMode?: BackgroundMode;
  onSetBackgroundMode?: (mode: BackgroundMode) => void;
  onNavigate?: (route: AppRoute) => void;
}

/**
 * AccountView for X-29.
 * Serves exclusively as the user's Account Manager:
 * - Displays authenticated user and account information
 * - Real-time sync controls & cross-device status
 * - Authoritative Academic Data Backups & Import/Export
 * - Synchronized personal deck notes/data
 * - Session logout control
 * - Contains NO login form, NO password form, and NO registration UI
 */
const AccountViewComponent: React.FC<AccountViewProps> = ({ onNavigate }) => {
  const { 
    user, 
    authLoading, 
    syncStatus, 
    lastSyncedAt, 
    appData, 
    updateAppData, 
    logout 
  } = useAuthSync();

  const { 
    exportHierarchy, 
    importHierarchy, 
    resetHierarchy 
  } = useAcademicHierarchy();

  const { confirmDelete } = useDeleteConfirmation();
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [copiedExport, setCopiedExport] = useState(false);

  // Debounced notes to prevent app-wide context re-renders on every keystroke
  const [localNotes, setLocalNotes] = useState<string>(appData.notes || '');
  const debouncedNotesRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (!isDirtyRef.current) {
      setLocalNotes(appData.notes || '');
    }
  }, [appData.notes]);

  const handleNotesChange = (val: string) => {
    setLocalNotes(val);
    isDirtyRef.current = true;
    if (debouncedNotesRef.current) {
      clearTimeout(debouncedNotesRef.current);
    }
    debouncedNotesRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      updateAppData({ notes: val });
    }, 600);
  };

  const handleNotesBlur = () => {
    if (isDirtyRef.current) {
      if (debouncedNotesRef.current) {
        clearTimeout(debouncedNotesRef.current);
        debouncedNotesRef.current = null;
      }
      isDirtyRef.current = false;
      updateAppData({ notes: localNotes });
    }
  };

  React.useEffect(() => {
    return () => {
      if (debouncedNotesRef.current) {
        clearTimeout(debouncedNotesRef.current);
      }
    };
  }, []);

  const handleDownload = () => {
    const jsonStr = exportHierarchy();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trax_academic_hierarchy_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportHierarchy()).then(() => {
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2000);
    });
  };

  const handleImportSubmit = () => {
    setImportFeedback(null);
    if (!importText.trim()) {
      setImportFeedback({ success: false, msg: 'Please paste JSON data to import.' });
      return;
    }
    const res = importHierarchy(importText);
    if (res.success) {
      setImportFeedback({ success: true, msg: 'Hierarchy imported successfully!' });
      setImportText('');
      setIsImporting(false);
    } else {
      setImportFeedback({ success: false, msg: res.error || 'Failed to import JSON.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        setIsImporting(true);
      }
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('x29_redirect_destination');
        } catch {}
      }
      await logout();
      if (onNavigate) {
        onNavigate('/login/');
      }
    } catch (err: unknown) {
      console.error('Logout error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-[#94A3B8] font-mono text-xs">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-[#6366F1] mr-2" />
        Loading account manager...
      </div>
    );
  }

  // If not authenticated, prompt to log in via the dedicated login page (NO inline form)
  if (!user) {
    return (
      <div className="flex-1 flex min-h-[380px] sm:min-h-[460px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.14] bg-transparent p-6 sm:p-12 text-center relative overflow-hidden">
        <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-white/[0.14] bg-transparent backdrop-blur-sm text-[#F59E0B] shadow-[0_0_24px_rgba(245,158,11,0.2)] mb-4">
          <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-[#F59E0B]" />
        </div>

        <h2 className="font-mono text-base sm:text-lg lg:text-xl font-bold tracking-wider text-[#F8FAFC]">
          Account Manager
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] max-w-sm sm:max-w-md">
          Please log in to manage your account.
        </p>

        <button
          onClick={() => onNavigate && onNavigate('/login/')}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#6366F1]/60 bg-[#6366F1]/20 font-mono text-xs font-bold text-[#F8FAFC] hover:bg-[#6366F1]/35 hover:border-[#6366F1] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Login</span>
        </button>
      </div>
    );
  }

  // Authenticated User: Account Manager Only
  return (
    <div className="w-full max-w-3xl space-y-6 bg-transparent text-[#F8FAFC]">
      
      {/* ── 1. ACCOUNT CONTROL SLAB ── */}
      <div className="rounded-2xl border border-white/[0.1] bg-transparent p-5 sm:p-6 backdrop-blur-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-transparent text-[#6366F1]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#F8FAFC]">
                  {user.email}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#10B981] border border-[#10B981]/30 rounded px-1.5 py-0.5">
                  Single Owner
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#94A3B8] block truncate max-w-xs sm:max-w-md">
                UID: {user.uid}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.1] bg-transparent text-xs font-mono text-[#94A3B8] hover:text-[#F43F5E] hover:border-[#F43F5E]/40 active:scale-95 transition-all cursor-pointer self-start sm:self-center"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Real-time Cross-Device Sync Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-transparent p-3.5 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
              Cloud Sync State
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span 
                className={`h-2 w-2 rounded-full ${
                  syncStatus === 'saved' ? 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]' :
                  syncStatus === 'syncing' ? 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse' :
                  syncStatus === 'offline' ? 'bg-[#94A3B8]' : 'bg-[#F43F5E]'
                }`} 
              />
              <span className="text-xs font-bold capitalize text-[#F8FAFC]">
                {syncStatus}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-transparent p-3.5 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
              Cross-Device Sync
            </span>
            <div className="flex items-center gap-2 mt-1 text-xs font-medium text-[#10B981]">
              <Laptop className="h-3.5 w-3.5" />
              <Smartphone className="h-3.5 w-3.5" />
              <span>Real-Time Active</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-transparent p-3.5 font-mono">
            <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
              Last Cloud Sync
            </span>
            <span className="text-xs font-medium text-[#F8FAFC] mt-1 block">
              {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Current Session'}
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#10B981] shrink-0" />
          <span>
            Data ownership strictly tied to your authenticated UID. Refreshing or switching devices preserves all data.
          </span>
        </div>
      </div>



      {/* ── 2. ACADEMIC DATA MANAGEMENT (EXPORT / IMPORT / RESET) ── */}
      <div className="rounded-2xl border border-white/[0.1] bg-transparent p-5 sm:p-6 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">
              Academic Hierarchy Data & Backups
            </h3>
          </div>
          <span className="font-mono text-[10px] text-[#94A3B8]">
            JSON Specification
          </span>
        </div>

        <p className="text-xs text-[#94A3B8]">
          Export, backup, or import your authoritative academic hierarchy (Tracks, Programs, Subjects, Chapters) as standard JSON.
        </p>

        {/* Management Actions Bar (MATCHING SCREENSHOT) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-white/[0.1] bg-[#131722]/40 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            {/* Download JSON */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0E121B] text-xs font-mono text-[#F8FAFC] hover:border-white/25 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>Export JSON</span>
            </button>

            {/* Copy JSON */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.1] bg-[#0E121B] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] active:scale-95 transition-all cursor-pointer"
            >
              {copiedExport ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <FileJson className="h-3.5 w-3.5" />}
              <span>{copiedExport ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Toggle Import Panel */}
            <button
              type="button"
              onClick={() => setIsImporting(!isImporting)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0E121B] text-xs font-mono text-[#F8FAFC] hover:border-white/25 active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-[#10B981]" />
              <span>Import JSON</span>
            </button>

            {/* Upload file hidden input */}
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.1] bg-[#0E121B] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer">
              <span>Upload File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Clean-Slate Reset Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                confirmDelete({
                  title: 'Confirm Reset',
                  itemType: 'Academic Hierarchy',
                  itemName: 'All Academic Data',
                  message: 'Are you sure you want to delete all academic hierarchy data? This action cannot be undone.',
                  confirmLabel: 'Reset Everything',
                  onConfirm: () => {
                    resetHierarchy();
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-xs font-mono text-[#F43F5E] hover:bg-[#F43F5E]/20 hover:border-[#F43F5E]/50 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clean-Slate Reset</span>
            </button>
          </div>
        </div>

        {/* Import Drawer */}
        {isImporting && (
          <div className="p-4 rounded-2xl border border-white/[0.12] bg-[#0E121B]/95 space-y-3">
            <label className="block text-xs font-mono text-[#94A3B8]">
              PASTE HIERARCHY JSON SPECIFICATION
            </label>
            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{ "tracks": [...], "programs": [...], "subjects": [...], "chapters": [...] }'
              className="w-full p-3 rounded-xl border border-white/[0.1] bg-[#131722] font-mono text-xs text-[#F8FAFC] focus:border-[#6366F1] focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#64748B]">
                Importing replaces current academic hierarchy.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="px-4 py-1.5 rounded-lg bg-[#6366F1] text-white text-xs font-mono font-bold hover:bg-[#4F46E5] cursor-pointer"
                >
                  Apply Import
                </button>
                <button
                  type="button"
                  onClick={() => setIsImporting(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-[#94A3B8] text-xs font-mono hover:bg-white/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            {importFeedback && (
              <p className={`text-xs font-mono ${importFeedback.success ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                {importFeedback.msg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 3. SYNCHRONIZED PERSONAL DECK DATA ── */}
      <div className="rounded-2xl border border-white/[0.1] bg-transparent p-5 sm:p-6 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#6366F1]" />
            <h3 className="font-mono text-sm font-bold text-[#F8FAFC]">
              Synchronized Operating Notes & Data
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#10B981]">
            <Cloud className="h-3 w-3" />
            <span>Auto-Saved to Firestore</span>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8]">
          Type your personal notes, targets, or operating reminders below. Every keystroke automatically syncs to the cloud and pushes in real-time to your other devices (PC, Laptop, Phone, Tablet).
        </p>

        <textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Enter your personal operational notes, tasks, or configuration data here. Auto-saved in real-time..."
          rows={6}
          className="w-full rounded-xl border border-white/[0.12] bg-transparent p-3.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#6366F1] focus:outline-none transition-colors resize-y"
        />

        <div className="flex items-center justify-between font-mono text-[10px] text-[#64748B]">
          <span>CHARACTER COUNT: {localNotes.length}</span>
          <span>NO MANUAL SAVE REQUIRED · AUTOMATIC</span>
        </div>
      </div>

    </div>
  );
};

export const AccountView = React.memo(AccountViewComponent);
AccountView.displayName = 'AccountView';
