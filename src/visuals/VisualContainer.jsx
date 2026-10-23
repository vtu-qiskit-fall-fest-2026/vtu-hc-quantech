import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, CheckCircle, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';
import { useLearning } from '../context/LearningContext';

/**
 * VisualContainer wraps any visual with mandatory:
 * - caption
 * - alt text / aria-label
 * - "What am I looking at?" collapsible explanation
 * - simulator verification badge if simulator-derived
 * - Interactive AI Tutor grounding with visual metadata
 */
export default function VisualContainer({
  title,
  caption,
  altText,
  explanation,
  isSimulatorDerived = false,
  children
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  let learningCtx = null;
  try {
    learningCtx = useLearning();
  } catch {}

  const setVisibleVisualContext = learningCtx?.setVisibleVisualContext;

  // Synchronize this visual as active visual in learning context
  useEffect(() => {
    if (setVisibleVisualContext && title) {
      setVisibleVisualContext({
        title: title || 'Visual Model',
        caption: caption || '',
        description: explanation || '',
        type: altText || 'diagram'
      });
    }
  }, [title, caption, explanation, altText, setVisibleVisualContext]);

  const handleAskAI = () => {
    if (learningCtx?.openTutor) {
      learningCtx.openTutor({
        visibleVisual: {
          title: title || 'Visual Model',
          caption: caption || '',
          description: explanation || '',
          type: altText || 'diagram'
        },
        initialQuestion: `What am I looking at in the ${title || 'diagram'}? Please explain what each part represents and how it connects to the lesson.`
      });
    }
  };

  return (
    <figure
      role="group"
      aria-label={altText || caption || title}
      className="my-5 rounded-2xl bg-white border border-[#ECE8E1] p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[#ECE8E1]">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-sm text-[#1F2433]">
            {title || 'Visual Model'}
          </span>
          {isSimulatorDerived && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#E4F6EA] text-[#16A34A] border border-[#16A34A]/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Simulator-derived</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAskAI}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#7C3AED] hover:bg-[#F5F3FF] rounded-lg border border-[#7C3AED]/20 transition-colors cursor-pointer"
            title="Ask AI Tutor to explain what you are looking at"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Ask AI</span>
          </button>

          {explanation && (
            <button
              type="button"
              onClick={() => setShowExplanation(prev => !prev)}
              aria-expanded={showExplanation}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#4F46E5] hover:bg-[#EEF0FF] rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#4F46E5] cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>What am I looking at?</span>
              {showExplanation ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* The Visual Artwork */}
      <div className="flex flex-col items-center justify-center min-h-[160px] py-2 overflow-x-auto">
        {children}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption className="mt-3 pt-2 text-xs text-[#4A5168] border-t border-[#ECE8E1]/60 flex items-start gap-1.5">
          <span className="font-semibold text-[#1F2433]">Note:</span>
          <span>{caption}</span>
        </figcaption>
      )}

      {/* "What am I looking at?" Collapsible Explanation */}
      {showExplanation && (
        <div
          role="region"
          aria-label="Visual explanation"
          className="mt-3 p-3.5 rounded-xl bg-[#FBFAF7] border border-[#ECE8E1] text-xs text-[#1F2433] leading-relaxed animate-in fade-in duration-200 space-y-2.5"
        >
          {explanation && (
            <div>
              <div className="font-semibold text-[#4A5168] mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Curriculum Reference Note:</span>
              </div>
              <p className="text-[#374151]">{explanation}</p>
            </div>
          )}

          <div className="pt-2 border-t border-[#ECE8E1]/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#717A8C]">Want a tailored explanation using this visual?</span>
            <button
              type="button"
              onClick={handleAskAI}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Tutor to Explain Visual</span>
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
