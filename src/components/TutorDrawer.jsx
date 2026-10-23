import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  HelpCircle,
  Cpu,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import apiClient from '../api/client';
import MarkdownRenderer from './MarkdownRenderer';
import { useLearning } from '../context/LearningContext';
import { recordQuizAttempt } from '../utils/progress';

function generateOfflineTutorResponse(question, topicTitle) {
  return {
    answer: `### ⚠️ Backend Service Offline\n\nThe Quantum AI Tutor requires connection to the QuantumLearnAI backend to provide dynamic LLM reasoning, curriculum-grounded explanations, and personalized quizzes.\n\n**To connect:**\n1. Ensure the Python FastAPI server is running on \`http://127.0.0.1:8000\` (run \`start-dev.bat\` or \`npm run backend:dev\`).\n2. Verify the API health at \`/api/health\`.\n\nIn the meantime, you can explore the verified curriculum lessons, interactive visual models, and practice checks directly on the current lesson page.`,
    generated_by: 'offline_notice',
    verified: false,
    based_on_simulation: false,
    sources: []
  };
}

export default function TutorDrawer({
  isOpen,
  onClose,
  topicId = null,
  topicTitle = 'Quantum Topic',
  conceptId = null,
  conceptTitle = null,
  circuit = null,
  simulationResult = null,
  initialQuestion = null,
  suggestedQuestions = []
}) {
  let learningCtx = null;
  try {
    const learning = useLearning();
    learningCtx = learning;
  } catch {
    // fallback if outside provider
  }

  const activeTopicId = topicId || learningCtx?.contextState?.topicId;
  const activeTopicTitle = topicTitle !== 'Quantum Topic' ? topicTitle : (learningCtx?.contextState?.topicTitle || 'Quantum Topic');
  const activeConceptId = conceptId || learningCtx?.contextState?.conceptId;
  const activeConceptTitle = conceptTitle || learningCtx?.contextState?.conceptTitle;
  const activeCircuit = circuit || learningCtx?.contextState?.circuit;
  const activeSimulationResult = simulationResult || learningCtx?.contextState?.simulationResult;

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch health for honest LLM status
  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await apiClient.getHealth();
        setHealth(data);
      } catch (e) {
        console.warn('Backend health check unavailable for tutor:', e);
      }
    }
    loadHealth();
  }, []);

  // If initialQuestion is passed on open, ask immediately
  useEffect(() => {
    if (isOpen && initialQuestion) {
      handleAskQuestion(initialQuestion);
    }
  }, [isOpen, initialQuestion]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  const handleAskQuestion = async (queryText) => {
    const q = (queryText || inputQuery || '').trim();
    if (!q || loading) return;

    setInputQuery('');
    setError(null);

    // Send the last 4 turns (not current question — just history) as conversation_history
    const conversationHistory = messages.slice(-4).map(m => ({
      role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
      content: m.content || m.text || ''
    }));

    // Immediately append student message to thread
    const userMessage = {
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const structuredContext = learningCtx?.getStructuredLearningContext ? learningCtx.getStructuredLearningContext() : null;

      const response = await apiClient.askTutor(
        q,
        activeTopicId,
        activeConceptId,
        activeCircuit,
        activeSimulationResult,
        conversationHistory,
        quizState,
        structuredContext
      );

      if (response.quiz_state !== undefined) {
        setQuizState(response.quiz_state);
        if (response.quiz_state?.evaluation) {
          const ev = response.quiz_state.evaluation;
          recordQuizAttempt(
            ev.topicId || activeTopicId || '',
            ev.questionId || `q_${Date.now()}`,
            ev.selectedOption || '',
            Boolean(ev.isCorrect),
            ev.conceptId || activeConceptId || null
          );
        }
      }

      // Append assistant message with response.answer and response.generated_by
      const tutorMessage = {
        role: 'assistant',
        content: response.answer,
        generatedBy: response.generated_by,
        model: response.model,
        verified: response.verified,
        based_on_simulation: response.based_on_simulation,
        sources: response.sources || [],
        validation: response.validation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tutorMessage]);
    } catch (err) {
      console.warn('Backend tutor service unreachable, using client offline knowledge:', err);
      const offline = generateOfflineTutorResponse(q, topicTitle);
      setError(null);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: offline.answer,
          generatedBy: offline.generated_by === 'offline_notice' ? 'Offline Notice' : 'Curriculum Fallback',
          model: null,
          verified: offline.verified,
          based_on_simulation: offline.based_on_simulation,
          sources: offline.sources,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setError(null);
    setQuizState(null);
  };

  if (!isOpen) return null;

  // Reusable panel body for both desktop docked and mobile drawer modes
  const panelContent = (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-[#FBFAF7]">
      {/* Header */}
      <header className="p-4 bg-white border-b border-[#ECE8E1] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-heading font-extrabold text-sm sm:text-base text-[#1F2433] tracking-tight">
                  AI Q-TUTOR
                </h2>
                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#EEF0FF] text-[#4F46E5] border border-[#4F46E5]/20">
                  v2.0
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Curriculum-Grounded Tutor</span>
                {health?.ollama_connected && (
                  <span className="text-[10px] text-[#717A8C] font-normal hidden sm:inline">
                    · Ollama Local LLM
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#717A8C] hover:text-[#1F2433] hover:bg-[#F3F4F6] border border-[#ECE8E1] transition-colors cursor-pointer"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear conversation</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#717A8C] hover:text-[#1F2433] hover:bg-[#FBFAF7] transition-colors cursor-pointer"
              aria-label="Close tutor panel"
              title="Close tutor panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Context Pills */}
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {activeTopicId && (
            <span className="px-2 py-0.5 rounded-full bg-[#EEF0FF] text-[#4F46E5] font-semibold border border-[#4F46E5]/20">
              Topic {activeTopicId}: {activeTopicTitle}
            </span>
          )}
          {activeConceptTitle && (
            <span className="px-2 py-0.5 rounded-full bg-[#E3F6F5] text-[#0E9F9B] font-medium border border-[#0E9F9B]/20">
              {activeConceptTitle}
            </span>
          )}
          {activeSimulationResult && (
            <span className="px-2 py-0.5 rounded-full bg-[#FFF4DB] text-[#F59E0B] font-semibold border border-[#F59E0B]/20">
              Circuit Telemetry Loaded
            </span>
          )}
          {learningCtx?.contextState?.visibleVisual && (
            <span className="px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] font-medium border border-[#7C3AED]/20">
              Visual: {learningCtx.contextState.visibleVisual.title || 'Diagram'}
            </span>
          )}
        </div>
      </header>

      {/* Chat Messages Body */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
        {messages.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-white border border-[#ECE8E1] shadow-2xs space-y-1.5">
              <div className="font-heading font-bold text-sm text-[#1F2433] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                <span>Ask anything about this lesson...</span>
              </div>
              <p className="text-xs text-[#717A8C] leading-relaxed">
                I am your curriculum-grounded quantum tutor. Ask me to simplify difficult math, provide real physical analogies, or clarify circuit simulation outcomes.
              </p>
            </div>

            {/* Core Suggested Prompts */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#717A8C] px-1">
                Suggested Prompts
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  "Explain this in simpler terms",
                  "Give me an example",
                  "Why does this work?",
                  "Quiz me on this concept"
                ].map((promptText, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleAskQuestion(promptText)}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#F3E8FF]/40 border border-[#ECE8E1] hover:border-[#7C3AED]/30 text-xs text-[#1F2433] hover:text-[#7C3AED] font-medium transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>{promptText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#717A8C] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}

                {conceptTitle && (
                  <button
                    type="button"
                    onClick={() => handleAskQuestion(`Can you explain how ${conceptTitle} works step-by-step?`)}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#EEF0FF] border border-[#ECE8E1] hover:border-[#4F46E5]/30 text-xs text-[#4F46E5] font-semibold transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>How does {conceptTitle} work?</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#4F46E5] group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}

                {simulationResult && (
                  <button
                    type="button"
                    onClick={() => handleAskQuestion("Explain my circuit simulation result")}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#FFF4DB] border border-[#ECE8E1] hover:border-[#F59E0B]/30 text-xs text-[#B45309] font-semibold transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span>Explain my simulation result</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B45309] group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}
              </div>
            </div>

            {/* Additional Suggested Questions from Curriculum Manifest */}
            {suggestedQuestions && suggestedQuestions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#717A8C] px-1">
                  Topic Questions
                </span>
                <div className="space-y-1">
                  {suggestedQuestions.slice(0, 4).map((sq, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAskQuestion(sq)}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-[#FBFAF7] hover:bg-white border border-[#ECE8E1] text-[11px] text-[#1F2433] hover:text-[#4F46E5] transition-colors truncate block cursor-pointer"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user' || msg.sender === 'user';
            const rawGen = msg.generatedBy || msg.generated_by || '';
            const isLLM = rawGen === 'llm' || rawGen.toLowerCase().includes('llm') || rawGen === 'ai_tutor';
            const badgeLabel = isLLM ? 'AI Tutor' : 'Curriculum Fallback';

            return (
              <div
                key={idx}
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                    isUser
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white rounded-br-xs font-medium shadow-xs'
                      : 'bg-white text-[#1F2433] border border-[#ECE8E1] rounded-bl-xs shadow-xs'
                  }`}
                >
                  <MarkdownRenderer content={msg.content || msg.text} />

                  {/* Status Indicators for Assistant Answers */}
                  {!isUser && (
                    <div className="pt-2 border-t border-[#ECE8E1] space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {/* Generated By Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border ${
                          isLLM
                            ? 'bg-[#F3E8FF] text-[#7C3AED] border-[#7C3AED]/20'
                            : 'bg-[#EEF0FF] text-[#4F46E5] border-[#4F46E5]/20'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{badgeLabel}</span>
                        </span>

                        {/* Verified by validator badge */}
                        {(msg.verified || msg.validation?.passed) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E4F6EA] text-[#16A34A] font-semibold border border-[#16A34A]/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                            <span>Verified by validator</span>
                          </span>
                        )}

                        {/* Verified simulation badge */}
                        {msg.based_on_simulation && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E3F6F5] text-[#0E9F9B] font-semibold border border-[#0E9F9B]/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0E9F9B]" />
                            <span>Verified simulation</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-[#717A8C] mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#ECE8E1] w-fit text-xs text-[#717A8C]">
            <div className="w-3.5 h-3.5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <span>Consulting verified curriculum and simulator...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Offline / Error Notice */}
      {error && (
        <div className="px-3.5 py-2 bg-[#FFFBEB] border-t border-[#F59E0B]/30 text-[11px] text-[#B45309] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#F59E0B]" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => handleAskQuestion()}
            className="shrink-0 font-semibold underline hover:text-[#92400E] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Interactive Active Quiz Options */}
      {quizState?.mode === 'quiz' && quizState?.awaitingAnswer && Array.isArray(quizState?.options) && quizState.options.length > 0 && (
        <div className="px-3.5 py-2.5 bg-[#F8F7F4] border-t border-[#ECE8E1] shrink-0 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A5168]">
            <span className="flex items-center gap-1 text-[#7C3AED]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Select Your Option:</span>
            </span>
            <span className="text-[10px] text-[#717A8C]">
              Question {quizState.questionNumber} of {quizState.totalQuestions}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quizState.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAskQuestion(`Option ${letter}`)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-[#EEF0FF] border border-[#ECE8E1] hover:border-[#4F46E5]/40 text-left text-xs transition-all cursor-pointer disabled:opacity-50 group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                >
                  <span className="w-5 h-5 rounded-md bg-[#EEF0FF] group-hover:bg-[#4F46E5] text-[#4F46E5] group-hover:text-white font-bold text-[10px] flex items-center justify-center shrink-0 transition-colors">
                    {letter}
                  </span>
                  <span className="text-[#1F2433] leading-snug line-clamp-2">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <footer className="p-3 bg-white border-t border-[#ECE8E1] shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask anything about this lesson..."
            aria-label="Tutor question input"
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#ECE8E1] bg-[#FBFAF7] text-xs text-[#1F2433] placeholder-[#717A8C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] transition-all"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            aria-label="Send question to tutor"
            className="p-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Docked Right-Side Panel (No modal backdrop - student sees and uses lesson simultaneously!) */}
      <aside
        aria-label="Quantum AI Tutor Docked Panel"
        className="hidden lg:flex w-[380px] xl:w-[420px] h-full shrink-0 border-l border-[#ECE8E1] bg-[#FBFAF7] z-20 flex-col justify-between overflow-hidden shadow-sm animate-in slide-in-from-right duration-200"
      >
        {panelContent}
      </aside>

      {/* 2. Mobile / Tablet Overlay Drawer (With backdrop on small screens) */}
      <div
        role="dialog"
        aria-label="Quantum AI Tutor Mobile Drawer"
        className="lg:hidden fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-xs flex justify-end"
        onClick={onClose}
      >
        <div
          className="w-full sm:w-[480px] h-full bg-[#FBFAF7] border-l border-[#ECE8E1] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={e => e.stopPropagation()}
        >
          {panelContent}
        </div>
      </div>
    </>
  );
}
