import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, BookOpen, Wrench, Award, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#FBFAF7] dark:bg-[#0C0F17] transition-colors">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#151926] border border-[#ECE8E1] dark:border-[#232A3D] shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Quantum Icon Graphic */}
        <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#818CF8] mx-auto flex items-center justify-center shadow-inner">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-[#FBFAF7] dark:bg-[#0C0F17] border border-[#ECE8E1] dark:border-[#232A3D] font-mono text-xs font-bold text-[#4F46E5] dark:text-[#818CF8]">
            State Not Found: |404⟩
          </div>
          <h1 className="text-xl font-extrabold text-[#1F2433] dark:text-[#F1F5F9]">
            Lost in Hilbert Space
          </h1>
          <p className="text-xs text-[#4A5168] dark:text-[#94A3B8] leading-relaxed">
            The requested coordinate does not project onto any computational basis state in this curriculum registry.
          </p>
        </div>

        {/* Quick Recovery Navigation Links */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Link
            to="/"
            className="p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] hover:bg-[#EEF0FF] dark:hover:bg-[#1E1B4B] hover:border-[#4F46E5]/40 text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-[#4F46E5]" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/learn"
            className="p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] hover:bg-[#EEF0FF] dark:hover:bg-[#1E1B4B] hover:border-[#4F46E5]/40 text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-[#4F46E5]" />
            <span>Curriculum</span>
          </Link>

          <Link
            to="/lab"
            className="p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] hover:bg-[#EEF0FF] dark:hover:bg-[#1E1B4B] hover:border-[#4F46E5]/40 text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4 text-[#0E9F9B]" />
            <span>Quantum Lab</span>
          </Link>

          <Link
            to="/practice"
            className="p-3 rounded-xl border border-[#ECE8E1] dark:border-[#232A3D] bg-[#FBFAF7] dark:bg-[#0C0F17] hover:bg-[#EEF0FF] dark:hover:bg-[#1E1B4B] hover:border-[#4F46E5]/40 text-xs font-bold text-[#1F2433] dark:text-[#F1F5F9] transition-all flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4 text-[#F2705A]" />
            <span>Practice</span>
          </Link>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#4F46E5] dark:text-[#818CF8] hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Main Platform</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
