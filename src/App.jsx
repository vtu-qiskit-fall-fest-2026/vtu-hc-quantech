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
import NotFound from './pages/NotFound';

import { LearningProvider, useLearning } from './context/LearningContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { tutorState, openTutor, closeTutor, contextState } = useLearning();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FBFAF7] dark:bg-[#0C0F17] text-[#1F2433] dark:text-[#F1F5F9] font-sans antialiased transition-colors">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)}
      />

      {/* Persistent App Shell Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        {/* Core Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FBFAF7] dark:bg-[#0C0F17]">
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
            {/* Dedicated 404 handler */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
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
      <ThemeProvider>
        <ToastProvider>
          <LearningProvider>
            <AppContent />
          </LearningProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

/**
 * Floating "Ask AI Tutor" button. On /learn it sits higher so it does not
 * cover the sticky Previous/Next concept navigation bar.
 */
function FloatingTutorButton({ onClick }) {
  const location = useLocation();
  const liftAboveNav = location.pathname.startsWith('/learn');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed right-6 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold text-xs ${
        liftAboveNav ? 'bottom-20' : 'bottom-6'
      }`}
      aria-label="Ask Quantum AI Tutor"
    >
      <Sparkles className="w-4 h-4 text-[#FFF4DB]" />
      <span>Ask AI Tutor</span>
    </button>
  );
}
