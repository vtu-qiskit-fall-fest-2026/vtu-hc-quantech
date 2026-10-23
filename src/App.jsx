import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TutorDrawer from './components/TutorDrawer';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Lab from './pages/Lab';
import Practice from './pages/Practice';

import { LearningProvider, useLearning } from './context/LearningContext';

function AppContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { tutorState, openTutor, closeTutor, contextState } = useLearning();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FBFAF7] text-[#1F2433] font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)}
        onOpenTutor={() => openTutor()}
        isTutorOpen={tutorState.isOpen}
      />

      {/* Persistent App Shell Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          onOpenTutor={() => openTutor()}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        {/* Core Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FBFAF7]">
          <Routes>
            <Route path="/" element={<Home onOpenTutor={openTutor} />} />
            <Route path="/learn" element={<Learn onOpenTutor={openTutor} isTutorOpen={tutorState.isOpen} />} />
            <Route path="/learn/:topicId" element={<Learn onOpenTutor={openTutor} isTutorOpen={tutorState.isOpen} />} />
            <Route path="/learn/:topicId/:conceptId" element={<Learn onOpenTutor={openTutor} isTutorOpen={tutorState.isOpen} />} />
            <Route path="/lab" element={<Lab onOpenTutor={openTutor} isTutorOpen={tutorState.isOpen} />} />
            <Route path="/practice" element={<Practice onOpenTutor={openTutor} isTutorOpen={tutorState.isOpen} />} />
            {/* Backward compatibility redirects */}
            <Route path="/tutor" element={<Navigate to="/learn" replace />} />
            <Route path="/results" element={<Navigate to="/lab" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Contextual AI Tutor (Docked Right Panel on Desktop, Drawer on Mobile) */}
        <TutorDrawer
          isOpen={tutorState.isOpen}
          onClose={closeTutor}
          topicId={contextState.topicId}
          topicTitle={contextState.topicTitle}
          conceptId={contextState.conceptId}
          conceptTitle={contextState.conceptTitle}
          circuit={contextState.circuit}
          simulationResult={contextState.simulationResult}
          initialQuestion={tutorState.initialQuestion}
          suggestedQuestions={[
            "Explain this in simpler terms",
            "Give me an example",
            "Why does this work?",
            "Quiz me on this concept",
            "What is a qubit?",
            "What is superposition?",
            "Does a quantum computer try every answer at once?",
            "Can entanglement send information faster than light?"
          ]}
        />
      </div>

      {/* Persistent Floating Entry Point */}
      {!tutorState.isOpen && <FloatingTutorButton onClick={() => openTutor()} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LearningProvider>
        <AppContent />
      </LearningProvider>
    </BrowserRouter>
  );
}

/**
 * Floating "Ask AI Tutor" button. On /learn it sits higher so it does not
 * cover the sticky Previous/Next concept navigation bar.
 */
function FloatingTutorButton({ onClick }) {
  const location = useLocation();
  const liftAboveNav = location.pathname === '/learn';

  return (
    <button
      id="floating-ask-tutor"
      type="button"
      onClick={onClick}
      className={`fixed ${liftAboveNav ? 'bottom-24' : 'bottom-6'} right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-lg shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 transition-all hover:scale-105 active:scale-95 cursor-pointer select-none group border border-white/20`}
      aria-label="Open AI Q-Tutor"
      title="Open AI Q-Tutor"
    >
      <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
      <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
      <span>Ask AI Tutor</span>
    </button>
  );
}
