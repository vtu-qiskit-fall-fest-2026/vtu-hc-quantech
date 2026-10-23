import React from 'react';
import { BookOpen, HelpCircle, Wrench, Play, CheckCircle2, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  { id: 'learn', label: '1. LEARN', path: '/learn', icon: BookOpen },
  { id: 'ask', label: '2. ASK', path: '/tutor', icon: HelpCircle },
  { id: 'build', label: '3. BUILD', path: '/lab', icon: Wrench },
  { id: 'run', label: '4. RUN', path: '/lab', icon: Play },
  { id: 'understand', label: '5. UNDERSTAND', path: '/results', icon: CheckCircle2 },
  { id: 'practice', label: '6. PRACTICE', path: '/practice', icon: Award }
];

export default function JourneyStrip({ activeStep = 'learn', topicId = null }) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-xs border-b border-slate-200/80 px-4 py-2.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto text-xs font-medium space-x-1 sm:space-x-2 py-0.5">
        {STEPS.map((step, idx) => {
          const isActive = step.id === activeStep;
          const Icon = step.icon;
          const targetUrl = topicId ? `${step.path}?topic=${encodeURIComponent(topicId)}` : step.path;

          return (
            <React.Fragment key={step.id}>
              <Link
                to={targetUrl}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{step.label}</span>
              </Link>
              {idx < STEPS.length - 1 && (
                <span className="text-slate-300 font-bold shrink-0">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
