import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Wrench,
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import { getStoredProgress } from '../utils/progress';
import Logo from './Logo';

// Reusable Module definitions - extensible for future modules
const MODULE_DEFINITIONS = [
  {
    id: 'module-1',
    moduleNumber: 1,
    title: 'Quantum Computing Fundamentals',
    prefix: '1.'
  }
];

export default function Sidebar({ onOpenTutor = null, mobileOpen = false, setMobileOpen = () => {} }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({ 'module-1': true });
  const location = useLocation();
  const navigate = useNavigate();

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !(prev[moduleId] ?? true)
    }));
  };

  useEffect(() => {
    async function loadTopics() {
      try {
        setLoading(true);
        const data = await apiClient.getTopics();
        if (Array.isArray(data)) {
          setTopics(data);
        }
      } catch (err) {
        console.error('Failed to load topic manifests for sidebar:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, []);

  const progress = getStoredProgress();

  // Group topics under modules dynamically and reusably
  const modules = React.useMemo(() => {
    const map = new Map();
    MODULE_DEFINITIONS.forEach(def => {
      map.set(def.id, {
        ...def,
        topics: []
      });
    });

    topics.forEach(topic => {
      const match = MODULE_DEFINITIONS.find(def => topic.id.startsWith(def.prefix));
      if (match) {
        map.get(match.id).topics.push(topic);
      } else {
        const modNum = topic.id.includes('.') ? topic.id.split('.')[0] : '1';
        const dynamicId = `module-${modNum}`;
        if (!map.has(dynamicId)) {
          map.set(dynamicId, {
            id: dynamicId,
            moduleNumber: parseInt(modNum, 10) || modNum,
            title: `Module ${modNum}`,
            prefix: `${modNum}.`,
            topics: []
          });
        }
        map.get(dynamicId).topics.push(topic);
      }
    });

    return Array.from(map.values()).filter(m => m.topics.length > 0 || !loading);
  }, [topics, loading]);

  const mainNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/learn', label: 'Learn', icon: BookOpen },
    { to: '/lab', label: 'Quantum Lab', icon: Wrench },
    { to: '/practice', label: 'Practice', icon: Award }
  ];

  const sidebarBody = (
    <aside className="w-64 h-full bg-white border-r border-[#ECE8E1] p-4 flex flex-col justify-between select-none">
      <div className="space-y-6 overflow-y-auto">
        {/* Logo / Brand */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <NavLink to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 group">
            <Logo size="sm" showWordmark={true} />
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-[#4A5168] hover:text-[#1F2433]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#4A5168] mb-1.5">
            Main Journey
          </div>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#EEF0FF] text-[#4F46E5] font-bold'
                    : 'text-[#4A5168] hover:bg-[#FBFAF7] hover:text-[#1F2433]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4F46E5]' : 'text-[#4A5168]'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Dynamic Curriculum Topics Section with Collapsible Modules */}
        <div className="space-y-2 pt-2 border-t border-[#ECE8E1]">
          <div className="px-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#4A5168] mb-1">
            <span>Curriculum Topics</span>
            <span className="font-mono text-[9px] bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#ECE8E1]">
              API
            </span>
          </div>

          {loading && topics.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#4A5168] flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
              <span>Loading curriculum...</span>
            </div>
          ) : modules.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#4A5168]">No topics found.</div>
          ) : (
            modules.map(mod => {
              const isExpanded = expandedModules[mod.id] ?? true;
              return (
                <div key={mod.id} className="space-y-1.5">
                  {/* Module Header Row - Expandable / Collapsible */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#ECE8E1] bg-[#FBFAF7] hover:bg-[#F3EFE6] transition-all text-left cursor-pointer group select-none shadow-2xs"
                  >
                    <div className="flex flex-col pr-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">
                        Module {mod.moduleNumber}
                      </span>
                      <span className="text-xs font-bold text-[#1F2433] leading-snug">
                        {mod.title}
                      </span>
                    </div>
                    <div className="text-[#4A5168] group-hover:text-[#1F2433] transition-colors shrink-0 p-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Topics List under Module */}
                  {isExpanded && (
                    <div className="pl-2 ml-1 border-l-2 border-[#ECE8E1] space-y-1.5 pt-0.5">
                      {mod.topics.map(topic => {
                        const topicProg = progress.topics[topic.id];
                        const isCompleted = topicProg?.isCompleted;
                        const hasActivity = topicProg && (topicProg.viewedConcepts?.length > 0 || Object.keys(topicProg.answeredAssessments || {}).length > 0);
                        const isLocked = topic.status === 'locked';
                        const isComingSoon = topic.status === 'coming_soon';

                        let badgeText = 'Available';
                        let badgeColor = 'bg-[#FBFAF7] text-[#4A5168] border-[#ECE8E1]';

                        if (isCompleted) {
                          badgeText = 'Completed';
                          badgeColor = 'bg-[#E4F6EA] text-[#16A34A] border-[#16A34A]/20';
                        } else if (hasActivity) {
                          badgeText = 'In Progress';
                          badgeColor = 'bg-[#EEF0FF] text-[#4F46E5] border-[#4F46E5]/20';
                        } else if (isComingSoon) {
                          badgeText = 'Soon';
                          badgeColor = 'bg-[#FFF4DB] text-[#F59E0B] border-[#F59E0B]/20';
                        } else if (isLocked) {
                          badgeText = 'Locked';
                          badgeColor = 'bg-[#FDECEC] text-[#DC2626] border-[#DC2626]/20';
                        }

                        const isTopicActiveInRoute =
                          location.pathname === '/learn' &&
                          (new URLSearchParams(location.search).get('topic') === topic.id || (!new URLSearchParams(location.search).get('topic') && topic.order === 1));

                        return (
                          <button
                            key={topic.id}
                            type="button"
                            disabled={isLocked || isComingSoon}
                            onClick={() => {
                              navigate(`/learn?topic=${encodeURIComponent(topic.id)}`);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                              isTopicActiveInRoute
                                ? 'bg-[#EEF0FF] border-[#4F46E5]/40 text-[#4F46E5] font-bold shadow-2xs'
                                : isLocked || isComingSoon
                                ? 'bg-[#FBFAF7] border-[#ECE8E1]/60 text-[#4A5168]/60 cursor-not-allowed'
                                : 'bg-white border-[#ECE8E1] text-[#1F2433] hover:bg-[#FBFAF7] hover:border-[#4F46E5]/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="font-mono text-[10px] font-semibold text-[#4A5168]">
                                Topic {topic.id}
                              </span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>

                            <span className="text-xs truncate font-medium">
                              {topic.title}
                            </span>

                            <div className="flex items-center gap-1.5 text-[10px] text-[#4A5168] mt-0.5">
                              <Clock className="w-3 h-3 text-[#4A5168]" />
                              <span>{topic.estimated_minutes} min</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Section: Engine Status */}
      <div className="pt-4 border-t border-[#ECE8E1]">
        <div className="p-2.5 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] text-[10px] text-[#4A5168] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#1F2433]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>NumPy Quantum Engine</span>
          </div>
          <div className="text-[10px] text-[#4A5168]">
            Statevector mathematical authority active.
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-full">
        {sidebarBody}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-label="Sidebar Menu"
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs flex"
          onClick={() => setMobileOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="h-full">
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
