import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sun,
  Moon,
  Laptop,
  User,
  Cpu,
  Database,
  Info,
  Volume2,
  Trash2,
  Download,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { useToast } from '../context/ToastContext';
import { getStoredProgress, saveStoredProgress } from '../utils/progress';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('appearance');
  const [currentUser, setCurrentUser] = useState(authService.currentUser);

  // Profile preferences
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [academicRole, setAcademicRole] = useState(currentUser?.academicRole || 'undergraduate');
  const [level, setLevel] = useState(currentUser?.level || 'beginner');
  const [densityMode, setDensityMode] = useState(currentUser?.densityMode || 'comfortable');

  // Simulator preferences
  const [defaultShots, setDefaultShots] = useState(1024);
  const [autoRotateBloch, setAutoRotateBloch] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState(true);

  // Safety confirmation dialog state for reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const unsub = authService.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        setDisplayName(user.displayName || '');
        setAcademicRole(user.academicRole || 'undergraduate');
        setLevel(user.level || 'beginner');
        setDensityMode(user.densityMode || 'comfortable');
      }
    });
    return unsub;
  }, []);

  // Load simulator preferences from storage
  useEffect(() => {
    const uid = currentUser?.uid || 'guest';
    const data = storageService.loadUserData(uid);
    if (data.preferences) {
      if (data.preferences.defaultShots) setDefaultShots(data.preferences.defaultShots);
      if (data.preferences.autoRotateBloch !== undefined) setAutoRotateBloch(data.preferences.autoRotateBloch);
      if (data.preferences.soundFeedback !== undefined) setSoundFeedback(data.preferences.soundFeedback);
    }
  }, [currentUser]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        if (showResetConfirm) {
          setShowResetConfirm(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showResetConfirm, onClose]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    try {
      if (currentUser) {
        await authService.updateProfile({
          displayName,
          academicRole,
          level,
          densityMode
        });
      }
      const uid = currentUser?.uid || 'guest';
      const prevData = storageService.loadUserData(uid);
      storageService.saveUserData(uid, {
        ...prevData,
        preferences: {
          ...prevData.preferences,
          level,
          densityMode,
          defaultShots,
          autoRotateBloch,
          soundFeedback
        }
      });
      toast.success('Preferences saved successfully!');
    } catch (e) {
      toast.error('Failed to update preferences: ' + e.message);
    }
  };

  const handleExportData = () => {
    try {
      const progress = getStoredProgress();
      const userData = storageService.loadUserData(currentUser?.uid || 'guest');
      const payload = {
        exportedAt: new Date().toISOString(),
        user: currentUser,
        progress,
        userData
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantech_learning_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Learner state exported as JSON file.');
    } catch (e) {
      toast.error('Failed to export data: ' + e.message);
    }
  };

  const handleResetProgress = () => {
    try {
      saveStoredProgress({ topics: {}, circuitsRunCount: 0 });
      localStorage.removeItem('answeredAssessments');
      const uid = currentUser?.uid || 'guest';
      storageService.saveUserData(uid, {
        preferences: { level, densityMode, theme, defaultShots, autoRotateBloch, soundFeedback },
        courseProgress: { lessons: {} },
        savedCircuits: []
      });
      setShowResetConfirm(false);
      toast.success('All local progress and quiz records have been reset.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e) {
      toast.error('Failed to reset progress: ' + e.message);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#151926] rounded-2xl border border-[#ECE8E1] dark:border-[#232A3D] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#ECE8E1] dark:border-[#232A3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] dark:bg-[#1E1B4B] flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-sm font-bold text-[#1F2433] dark:text-[#F1F5F9]">
                Preferences & Settings
              </h2>
              <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8]">
                Customize your quantum learning environment, theme, and simulation parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#4A5168] hover:text-[#1F2433] dark:hover:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433] transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] px-4 overflow-x-auto gap-2">
          {[
            { id: 'appearance', label: 'Appearance', icon: Sun },
            { id: 'profile', label: 'Profile & Level', icon: User },
            { id: 'simulator', label: 'Simulator', icon: Cpu },
            { id: 'data', label: 'Data Management', icon: Database },
            { id: 'about', label: 'About', icon: Info }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                    : 'border-transparent text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  Interface Theme
                </h3>
                <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8] mb-3">
                  Choose your preferred contrast scheme or automatically match your system appearance.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean cream & warm paper' },
                    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep navy & neon accents' },
                    { id: 'system', label: 'System Default', icon: Laptop, desc: 'Follow OS preference' }
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSelected = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTheme(opt.id)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EEF0FF] dark:bg-[#1E1B4B] border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8] ring-2 ring-[#4F46E5]/20'
                            : 'bg-white dark:bg-[#0C0F17] border-[#ECE8E1] dark:border-[#232A3D] text-[#1F2433] dark:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className="w-4 h-4 text-current" />
                          {isSelected && <Check className="w-3.5 h-3.5 text-current" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{opt.label}</div>
                          <div className="text-[10px] text-[#4A5168] dark:text-[#94A3B8]">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. PROFILE & LEVEL TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  Learner Name / Callout
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                    Academic Role
                  </label>
                  <select
                    value={academicRole}
                    onChange={e => setAcademicRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="school_student">School Student (K-12)</option>
                    <option value="undergraduate">Undergraduate Student</option>
                    <option value="postgraduate">Postgraduate / Master's</option>
                    <option value="phd_researcher">PhD / Researcher</option>
                    <option value="faculty">Faculty / Professor</option>
                    <option value="industry_engineer">Industry Engineer</option>
                    <option value="other_professional">Other Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                    Quantum Level Mode
                  </label>
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="beginner">Beginner (Intuition-First)</option>
                    <option value="intermediate">Intermediate (Formal Dirac Notation)</option>
                    <option value="master">Master (Telemetry & Density Console)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  UI Visual Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'comfortable', label: 'Comfortable', desc: 'Spacious & visual' },
                    { id: 'compact', label: 'Compact', desc: 'Balanced view' },
                    { id: 'dense', label: 'Dense', desc: 'Maximum data' }
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDensityMode(d.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        densityMode === d.id
                          ? 'bg-[#EEF0FF] dark:bg-[#1E1B4B] border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8] font-bold'
                          : 'bg-white dark:bg-[#0C0F17] border-[#ECE8E1] dark:border-[#232A3D] text-[#4A5168] dark:text-[#94A3B8]'
                      }`}
                    >
                      <div className="text-xs">{d.label}</div>
                      <div className="text-[9px] opacity-75">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </div>
          )}

          {/* 3. SIMULATOR PREFERENCES */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  Default Measurement Shots
                </label>
                <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8] mb-2">
                  Higher shot counts produce smoother Born measurement histograms.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[512, 1024, 2048, 4096].map(shots => (
                    <button
                      key={shots}
                      type="button"
                      onClick={() => setDefaultShots(shots)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
                        defaultShots === shots
                          ? 'bg-[#EEF0FF] dark:bg-[#1E1B4B] border-[#4F46E5] text-[#4F46E5] dark:text-[#818CF8]'
                          : 'bg-white dark:bg-[#0C0F17] border-[#ECE8E1] dark:border-[#232A3D] text-[#1F2433] dark:text-[#F1F5F9]'
                      }`}
                    >
                      {shots} shots
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] cursor-pointer">
                  <div>
                    <div className="font-semibold text-xs text-[#1F2433] dark:text-[#F1F5F9]">
                      Auto-Rotate Bloch Spheres
                    </div>
                    <div className="text-[10px] text-[#4A5168] dark:text-[#94A3B8]">
                      Slowly orbits the 3D Bloch sphere camera automatically.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRotateBloch}
                    onChange={e => setAutoRotateBloch(e.target.checked)}
                    className="w-4 h-4 text-[#4F46E5] rounded accent-[#4F46E5]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] cursor-pointer">
                  <div>
                    <div className="font-semibold text-xs text-[#1F2433] dark:text-[#F1F5F9]">
                      Celebratory Audio & Confetti
                    </div>
                    <div className="text-[10px] text-[#4A5168] dark:text-[#94A3B8]">
                      Trigger confetti animations and celebratory feedback on quiz mastery.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundFeedback}
                    onChange={e => setSoundFeedback(e.target.checked)}
                    className="w-4 h-4 text-[#4F46E5] rounded accent-[#4F46E5]"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Save Simulator Preferences
                </button>
              </div>
            </div>
          )}

          {/* 4. DATA MANAGEMENT */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] mb-1">
                  Local Progress & Telemetry Data
                </h3>
                <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8] mb-3">
                  Your curriculum progress, quiz attempts, and saved circuits are persisted in browser storage.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="p-3.5 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#0C0F17] hover:bg-[#FBFAF7] dark:hover:bg-[#1F2433] text-left flex items-center justify-between gap-2 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9] flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-[#4F46E5]" />
                        <span>Export Backup</span>
                      </div>
                      <div className="text-[10px] text-[#4A5168] dark:text-[#94A3B8]">
                        Download complete progress JSON
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="p-3.5 rounded-xl border border-[#DC2626]/20 bg-[#FDECEC]/50 dark:bg-[#7F1D1D]/20 hover:bg-[#FDECEC] dark:hover:bg-[#7F1D1D]/40 text-left flex items-center justify-between gap-2 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-[#DC2626] dark:text-[#F87171] flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset All Progress</span>
                      </div>
                      <div className="text-[10px] text-[#DC2626]/80 dark:text-[#F87171]/80">
                        Clear local progress & quiz logs
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Reset Confirmation Sub-Dialog */}
              {showResetConfirm && (
                <div className="p-4 rounded-xl border border-[#DC2626]/30 bg-[#FDECEC] dark:bg-[#7F1D1D]/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] dark:text-[#F87171] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-[#DC2626] dark:text-[#F87171]">
                        Are you absolutely sure?
                      </h4>
                      <p className="text-[11px] text-[#4A5168] dark:text-[#F1F5F9] mt-0.5">
                        This action will wipe all completed topic checks, viewed concept markers, and quiz history. This cannot be undone unless you exported a backup.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#ECE8E1] dark:border-[#232A3D] bg-white dark:bg-[#151926] text-xs font-semibold text-[#4A5168] dark:text-[#94A3B8]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetProgress}
                      className="px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Yes, Reset Everything
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9]">Platform</span>
                  <span className="font-mono text-xs text-[#4F46E5] dark:text-[#818CF8]">Quantech AI v2.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9]">Team & ID</span>
                  <span className="font-mono text-xs text-[#4A5168] dark:text-[#94A3B8]">VTU-QFF-HC-0014 (Online)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9]">Event</span>
                  <span className="text-xs text-[#4A5168] dark:text-[#94A3B8]">VTU-Qiskit Fall Fest 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9]">Simulation Engine</span>
                  <span className="font-mono text-xs text-[#16A34A] dark:text-[#4ADE80]">NumPy Float64 Statevector</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9]">Export Standards</span>
                  <span className="font-mono text-xs text-[#4A5168] dark:text-[#94A3B8]">Qiskit 1.x Pure Python</span>
                </div>
              </div>

              <p className="text-[11px] text-[#4A5168] dark:text-[#94A3B8] leading-relaxed">
                Quantech is an interactive, beginner-first quantum computing platform bridging physical intuition, rigorous mathematical bra-ket notation, and interactive circuit design.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
