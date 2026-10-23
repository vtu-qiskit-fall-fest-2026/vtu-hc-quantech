import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Send,
  HelpCircle,
  Cpu,
  CheckCircle,
  AlertCircle,
  BookOpen,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import apiClient from '../api/client';
import JourneyStrip from '../components/JourneyStrip';
import MarkdownRenderer from '../components/MarkdownRenderer';

export default function AITutor() {
  const [searchParams] = useSearchParams();
  const requestedTopicId = searchParams.get('topic');
  const initialQuery = searchParams.get('q');

  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [quizState, setQuizState] = useState(null);
  const messagesEndRef = useRef(null);

  // Load topic manifests
  useEffect(() => {
    async function loadTopics() {
      try {
        const manifestList = await apiClient.getTopics();
        setTopics(manifestList);
        let active = null;
        if (requestedTopicId) {
          active = manifestList.find(t => t.id === requestedTopicId);
        }
        if (!active && manifestList.length > 0) {
          active = manifestList[0];
        }
        setCurrentTopic(active);
      } catch (e) {
        console.error('Failed to load topics for tutor:', e);
      }
    }
    loadTopics();
  }, [requestedTopicId]);

  // Handle initial query if passed via URL parameter
  useEffect(() => {
    if (initialQuery && currentTopic && messages.length === 0) {
      handleAskQuestion(initialQuery);
    }
  }, [initialQuery, currentTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAskQuestion = async (questionText) => {
    const q = (questionText || inputQuery).trim();
    if (!q || !currentTopic) return;

    const conversationHistory = messages.slice(-4).map(m => ({
      role: m.role === 'tutor' ? 'assistant' : m.role,
      content: m.content
    }));

    const userMessage = { role: 'user', content: q, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await apiClient.askTutor(q, currentTopic.id, null, null, null, conversationHistory, quizState);
      if (response.quiz_state !== undefined) {
        setQuizState(response.quiz_state);
      }
      const tutorMessage = {
        role: 'tutor',
        content: response.answer,
        verified: response.verified,
        basedOnSimulation: response.based_on_simulation,
        generatedBy: response.generated_by,
        model: response.model,
        sources: response.sources || [],
        validation: response.validation,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, tutorMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'tutor',
          content: 'Sorry, I encountered an issue retrieving that explanation. Please try again.',
          generatedBy: 'fallback',
          error: true,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedList = currentTopic?.suggested_questions || [
    "Explain this like I'm a beginner",
    "Quiz me",
    "What is the core idea?"
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <JourneyStrip activeStep="ask" topicId={currentTopic?.id} />

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-600">
                <Sparkles className="w-4 h-4" />
                <span>AI Tutor — Grounded Pedagogical Guide</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                Topic: {currentTopic ? `${currentTopic.id} — ${currentTopic.title}` : 'Loading...'}
              </h1>
            </div>

            {/* Topic Switcher Dropdown */}
            {topics.length > 1 && (
              <select
                value={currentTopic?.id || ''}
                onChange={(e) => {
                  const selected = topics.find(t => t.id === e.target.value);
                  if (selected) setCurrentTopic(selected);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs"
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    Topic {t.id}: {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Every response is strictly grounded in loaded curriculum packs and mathematically verified by the simulator.
          </p>
        </div>

        {/* Suggested Questions Pill Carousel */}
        <div className="mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Suggested questions
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedList.map((sq, i) => (
              <button
                key={i}
                onClick={() => handleAskQuestion(sq)}
                disabled={loading}
                className="text-xs px-3.5 py-1.5 rounded-full bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition-all border border-slate-200 shadow-2xs hover:border-indigo-200 text-left"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="p-8 rounded-3xl bg-white border border-dashed border-slate-300 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                Ask anything about {currentTopic?.title || 'quantum computing'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Click one of the suggested questions above, or type your own question below.
                If you ran a simulation in the lab, you can ask for a mathematical explanation!
              </p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-2xl p-5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  <MarkdownRenderer content={msg.content} />

                  {/* AI Response Metadata & Honest Labeling Badges */}
                  {!isUser && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Generated By Badge */}
                        {msg.generatedBy === 'llm' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> Answered by LLM ({msg.model || 'local'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Cpu className="w-3 h-3 text-indigo-500" /> Verified Curriculum Tutor
                          </span>
                        )}

                        {/* Simulation Grounding Badge */}
                        {msg.basedOnSimulation && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <CheckCircle className="w-3 h-3 text-cyan-500" /> Based on verified simulation
                          </span>
                        )}

                        {/* Mathematical Validation Badge */}
                        {msg.verified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-500" /> Verified by Validator
                          </span>
                        )}
                      </div>

                      {/* Grounded Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="font-semibold text-slate-700">Sources:</span>
                          {msg.sources.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {s.type}: {s.id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-2.5 p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 max-w-xs shadow-xs">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="font-medium">Grounded tutor is reasoning...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="p-2 rounded-2xl bg-white border border-slate-200 shadow-md shadow-slate-100 flex items-center gap-2 sticky bottom-4"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask about ${currentTopic?.title || 'quantum computing'}...`}
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none placeholder:text-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm shadow-indigo-200"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </main>
    </div>
  );
}
