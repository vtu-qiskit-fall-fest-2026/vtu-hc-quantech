import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, CheckCircle, Sparkles, Menu, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';
import Logo from './Logo';

export default function Navbar({ onToggleSidebar, onOpenTutor, isTutorOpen = false }) {
  const [health, setHealth] = useState(null);

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
  }, []);

  return (
    <header className="bg-white text-[#1F2433] border-b border-[#ECE8E1] sticky top-0 z-40 shadow-2xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Left: Mobile hamburger + Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-[#4A5168] hover:text-[#1F2433] hover:bg-[#FBFAF7] transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <Logo size="sm" showWordmark={true} />
            <span className="text-[10px] text-[#4A5168] font-medium hidden md:inline-block border-l border-[#ECE8E1] pl-2.5 ml-1">
              Beginner-First Quantum Journey
            </span>
          </Link>
        </div>

        {/* Right: Status Badges + Ask Tutor Action */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Simulator Authority Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBFAF7] border border-[#ECE8E1] text-[#4A5168]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="font-medium">Simulator:</span>
            <span className="text-[#1F2433] font-mono font-semibold">NumPy Engine</span>
          </div>

          {/* AI Engine Grounded Labeling Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#FBFAF7] border border-[#ECE8E1] text-[#4A5168]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-semibold text-[#1F2433]">Curriculum-Grounded Tutor</span>
            {health?.ollama_connected ? (
              <span className="text-[10px] text-[#4F46E5] font-mono font-medium border-l border-[#ECE8E1] pl-2">
                Ollama Local LLM
              </span>
            ) : (
              <span className="text-[10px] text-[#4A5168] font-medium border-l border-[#ECE8E1] pl-2">
                Built-in Knowledge
              </span>
            )}
          </div>

          {/* Curriculum Grounded Status */}
        </div>
      </div>
    </header>
  );
}
