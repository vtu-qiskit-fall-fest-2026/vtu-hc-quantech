import React from 'react';
import { BookOpen, Sparkles, Wrench, Play, Eye, Award, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JOURNEY_STAGES = [
  { id: 'learn', label: 'Learn', icon: BookOpen, color: '#4F46E5', tint: '#EEF0FF', route: '/learn' },
  { id: 'ask', label: 'Ask', icon: Sparkles, color: '#7C3AED', tint: '#F3E8FF', isTutorTrigger: true },
  { id: 'build', label: 'Build', icon: Wrench, color: '#0E9F9B', tint: '#E3F6F5', route: '/lab' },
  { id: 'run', label: 'Run', icon: Play, color: '#F59E0B', tint: '#FFF4DB', route: '/lab' },
  { id: 'understand', label: 'Understand', icon: Eye, color: '#16A34A', tint: '#E4F6EA', route: '/lab' },
  { id: 'practice', label: 'Practice', icon: Award, color: '#F2705A', tint: '#FDEBE7', route: '/practice' }
];

export default function JourneyBar({
  currentStage = 'learn',
  completedStages = [],
  onOpenTutor = null,
  topicId = null
}) {
  const navigate = useNavigate();

  const currentStageIndex = JOURNEY_STAGES.findIndex(s => s.id === currentStage);

  const isStageCompleted = (stage, idx) => {
    if (completedStages && completedStages.includes(stage.id)) return true;
    if (currentStageIndex > 0 && idx < currentStageIndex) return true;
    return false;
  };

  const handleStageClick = (stage) => {
    if (stage.isTutorTrigger) {
      if (onOpenTutor) {
        onOpenTutor();
      } else {
        navigate('/learn');
      }
      return;
    }

    const query = topicId ? `?topic=${encodeURIComponent(topicId)}` : '';
    navigate(`${stage.route}${query}`);
  };

  return (
    <nav
      aria-label="Learning Journey Navigation"
      className="w-full bg-white border-b border-[#ECE8E1] px-3 sm:px-6 py-2 shadow-2xs select-none sticky top-0 z-30"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 overflow-x-auto py-0.5">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {JOURNEY_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCurrent = currentStage === stage.id;
            const isCompleted = !isCurrent && isStageCompleted(stage, idx);
            const isUpcoming = !isCurrent && !isCompleted;

            return (
              <React.Fragment key={stage.id}>
                <button
                  type="button"
                  onClick={() => handleStageClick(stage)}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={`${idx + 1}. ${stage.label}${isCurrent ? ' (Current Stage)' : isCompleted ? ' (Completed)' : ''}`}
                  className={`group flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#EEF0FF] text-[#4F46E5] ring-2 ring-[#4F46E5]/25 border border-[#4F46E5]/40 shadow-xs'
                      : isCompleted
                      ? 'bg-[#E4F6EA]/80 text-[#16A34A] border border-[#16A34A]/25 hover:bg-[#D1F2DC]'
                      : 'bg-[#FBFAF7] text-[#717A8C] border border-[#ECE8E1] hover:bg-white hover:text-[#1F2433] hover:border-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-[#4F46E5] text-white shadow-2xs'
                        : isCompleted
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-[#ECE8E1] text-[#717A8C] group-hover:bg-[#CBD5E1] group-hover:text-[#1F2433]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <Icon
                    className={`w-3.5 h-3.5 hidden md:inline shrink-0 ${
                      isCurrent
                        ? 'text-[#4F46E5]'
                        : isCompleted
                        ? 'text-[#16A34A]'
                        : 'text-[#717A8C] group-hover:text-[#1F2433]'
                    }`}
                  />

                  <span className={isCurrent ? 'text-[#1F2433] font-bold' : isCompleted ? 'text-[#15803D]' : 'text-[#717A8C] group-hover:text-[#1F2433]'}>
                    {stage.label}
                  </span>
                </button>

                {idx < JOURNEY_STAGES.length - 1 && (
                  <span
                    className={`font-bold text-xs select-none px-0.5 shrink-0 ${
                      idx < currentStageIndex ? 'text-[#16A34A]' : idx === currentStageIndex ? 'text-[#4F46E5]' : 'text-[#ECE8E1]'
                    }`}
                  >
                    →
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right side: stage helper */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FBFAF7] border border-[#ECE8E1] text-[11px] text-[#717A8C]">
            <span className="font-semibold text-[#1F2433]">Stage {currentStageIndex + 1} of 6</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
