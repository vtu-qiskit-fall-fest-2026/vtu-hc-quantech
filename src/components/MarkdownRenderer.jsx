import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import katex from 'katex';

function MathText({ text }) {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('$')) return text;

  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="my-2 block overflow-x-auto text-center" />;
          } catch {
            return <code key={i}>{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="inline-block px-0.5" />;
          } catch {
            return <code key={i}>{part}</code>;
          }
        }
        return part;
      })}
    </>
  );
}

function renderChildren(children) {
  if (typeof children === 'string') {
    return <MathText text={children} />;
  }
  if (Array.isArray(children)) {
    return children.map((c, idx) => (typeof c === 'string' ? <MathText key={idx} text={c} /> : c));
  }
  return children;
}

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  return (
    <div className={`markdown-body space-y-2 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold my-1 text-[#1F2433]">{renderChildren(children)}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold my-1 text-[#1F2433]">{renderChildren(children)}</h2>,
          h3: ({ children }) => <h3 className="text-xs sm:text-sm font-extrabold my-1 text-[#1F2433]">{renderChildren(children)}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-bold my-1 text-[#1F2433]">{renderChildren(children)}</h4>,
          p: ({ children }) => <p className="my-1">{renderChildren(children)}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1 pl-1">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{renderChildren(children)}</li>,
          strong: ({ children }) => <strong className="font-bold text-[#1F2433]">{renderChildren(children)}</strong>,
          em: ({ children }) => <em className="italic">{renderChildren(children)}</em>,
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-[#4F46E5]">{children}</code>
            ) : (
              <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto my-1">
                <code>{children}</code>
              </pre>
            ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#7C3AED] pl-2 my-1 italic text-slate-600">
              {renderChildren(children)}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-[#ECE8E1]" />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
