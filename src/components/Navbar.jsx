import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  ShieldCheck,
  Sun,
  Moon,
  Laptop,
  Sliders,
  LogIn,
  LogOut,
  ChevronDown
} from 'lucide-react';
import apiClient from '../api/client';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { useToast } from '../context/ToastContext';
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';

export default function Navbar({ onToggleSidebar }) {
  const [health, setHealth] = useState(null);
  const [currentUser, setCurrentUser] = useState(authService.currentUser);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const userMenuRef = useRef(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await apiClient.getHealth();
        setHealth(data);
      } catch (e) {
        console.warn('Backend not responding to health check:', e);
      }
    }
    loadHealth();

    const unsub = authService.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    authService.signOut();
    setUserMenuOpen(false);
    toast.info('Signed out of session.');
  };

  const getInitials = (name) => {
    if (!name) return 'Q';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="bg-white dark:bg-[#151926] text-[#1F2433] dark:text-[#F1F5F9] border-b border-[#ECE8E1] dark:border-[#232A3D] sticky top-0 z-40 shadow-2xs select-none transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
          {/* Left: Mobile hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-xl text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#0C0F17] transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <Logo size="sm" showWordmark={true} />
              <span className="text-[10px] text-[#4A5168] dark:text-[#94A3B8] font-medium hidden md:inline-block border-l border-[#ECE8E1] dark:border-[#232A3D] pl-2.5 ml-1">
                Beginner-First Quantum Journey
              </span>
            </Link>
          </div>

          {/* Right: Status Badges + Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
            {/* Simulator Authority Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBFAF7] dark:bg-[#0C0F17] border border-[#ECE8E1] dark:border-[#232A3D] text-[#4A5168] dark:text-[#94A3B8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#4ADE80]" />
              <span className="font-medium">Simulator:</span>
              <span className="text-[#1F2433] dark:text-[#F1F5F9] font-mono font-semibold">NumPy</span>
            </div>

            {/* AI Engine Grounded Labeling Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBFAF7] dark:bg-[#0C0F17] border border-[#ECE8E1] dark:border-[#232A3D] text-[#4A5168] dark:text-[#94A3B8]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#4ADE80] animate-pulse" />
              <span className="font-semibold text-[#1F2433] dark:text-[#F1F5F9]">Curriculum Tutor</span>
              {health?.ollama_connected ? (
                <span className="text-[10px] text-[#4F46E5] dark:text-[#818CF8] font-mono font-medium border-l border-[#ECE8E1] dark:border-[#232A3D] pl-2">
                  Ollama
                </span>
              ) : (
                <span className="text-[10px] text-[#4A5168] dark:text-[#94A3B8] font-medium border-l border-[#ECE8E1] dark:border-[#232A3D] pl-2">
                  Grounded
                </span>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Theme: ${theme} (Click to toggle)`}
              aria-label={`Toggle theme (current: ${theme})`}
              className="p-2 rounded-xl text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#0C0F17] border border-transparent hover:border-[#ECE8E1] dark:hover:border-[#232A3D] transition-all cursor-pointer"
            >
              {theme === 'light' && <Sun className="w-4 h-4 text-[#F59E0B]" />}
              {theme === 'dark' && <Moon className="w-4 h-4 text-[#818CF8]" />}
              {theme === 'system' && <Laptop className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              title="Settings & Preferences"
              aria-label="Open settings"
              className="p-2 rounded-xl text-[#4A5168] dark:text-[#94A3B8] hover:text-[#1F2433] dark:hover:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#0C0F17] border border-transparent hover:border-[#ECE8E1] dark:hover:border-[#232A3D] transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* User Account / Profile Menu */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(prev => !prev)}
                  className="flex items-center gap-1.5 p-1 pl-2 rounded-full border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] hover:bg-white dark:hover:bg-[#151926] text-xs transition-all cursor-pointer shadow-2xs"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="font-semibold text-xs text-[#1F2433] dark:text-[#F1F5F9] max-w-[90px] sm:max-w-[120px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-bold text-[10px]">
                    {getInitials(currentUser.displayName || currentUser.email)}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#4A5168] dark:text-[#94A3B8] mr-0.5" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#151926] border border-[#ECE8E1] dark:border-[#232A3D] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-[#ECE8E1] dark:border-[#232A3D] mb-1">
                      <div className="font-bold text-xs text-[#1F2433] dark:text-[#F1F5F9] truncate">
                        {currentUser.displayName || 'Learner'}
                      </div>
                      <div className="text-[10px] text-[#4A5168] dark:text-[#94A3B8] truncate">
                        {currentUser.email}
                      </div>
                      <div className="mt-1.5 inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EEF0FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#818CF8]">
                        Level: {currentUser.level ? currentUser.level.toUpperCase() : 'BEGINNER'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setSettingsModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-[#1F2433] dark:text-[#F1F5F9] hover:bg-[#FBFAF7] dark:hover:bg-[#0C0F17] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#4A5168] dark:text-[#94A3B8]" />
                      <span>Learner Preferences</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-[#DC2626] dark:text-[#F87171] hover:bg-[#FDECEC] dark:hover:bg-[#7F1D1D]/30 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </>
  );
}
