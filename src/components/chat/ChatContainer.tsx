'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SearchTimelineStep, CompanyReport, AppSettings } from '@/types';
import ProgressTimeline from './ProgressTimeline';
import ReportView from '../report/ReportView';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Loader2, ArrowRight, Sparkles, Terminal, Info } from 'lucide-react';

interface ChatContainerProps {
  settings: AppSettings;
  activeReport: CompanyReport | null;
  setActiveReport: (report: CompanyReport | null) => void;
}

const INITIAL_STEPS: SearchTimelineStep[] = [
  { id: 'resolving', label: 'Resolving Website', status: 'waiting' },
  { id: 'crawling', label: 'Website Crawling', status: 'waiting' },
  { id: 'searching', label: 'Searching Internet', status: 'waiting' },
  { id: 'ai_analysis', label: 'AI Analysis', status: 'waiting' },
  { id: 'pdf_generation', label: 'Generating PDF', status: 'waiting' },
];

export default function ChatContainer({ settings, activeReport, setActiveReport }: ChatContainerProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [steps, setSteps] = useState<SearchTimelineStep[]>(INITIAL_STEPS);
  const [streamText, setStreamText] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll while AI response streams
  useEffect(() => {
    if (streamText && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamText]);

  // Handle textarea autosize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const triggerResearch = async (inputStr: string) => {
    const targetInput = inputStr.trim();
    if (!targetInput) return;

    if (!settings.openrouterApiKey || !settings.serperApiKey) {
      toast('Please configure your OpenRouter & Serper API keys in the sidebar first!', 'error');
      return;
    }

    setIsResearching(true);
    setActiveReport(null);
    setStreamText('');
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'waiting', message: undefined })));

    try {
      console.log(`[Research] Starting stream for: ${targetInput}`);
      
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': settings.openrouterApiKey,
          'x-serper-key': settings.serperApiKey,
        },
        body: JSON.stringify({
          input: targetInput,
          model: settings.selectedModel,
        }),
      });

      if (!response.body) {
        throw new Error('No readable response body stream received.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(cleanLine.slice(6));
            const { type } = payload;

            if (type === 'status') {
              const { step, status, message } = payload;
              setSteps((prev) =>
                prev.map((s) => (s.id === step ? { ...s, status, message } : s))
              );
            } else if (type === 'text') {
              const { chunk } = payload;
              setStreamText((prev) => prev + chunk);
            } else if (type === 'report') {
              const { report } = payload;
              setActiveReport(report);
            } else if (type === 'error') {
              const { message } = payload;
              toast(message || 'An error occurred during research.', 'error');
              
              // Mark active step as failed
              setSteps((prev) =>
                prev.map((s) => s.status === 'running' ? { ...s, status: 'failed', message } : s)
              );
              setIsResearching(false);
              return;
            }
          } catch (e) {
            // Ignore JSON parse errors on partial streams
          }
        }
      }

      setIsResearching(false);
      toast('Research completed successfully!', 'success');

    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Network error occurred. Try again.', 'error');
      setIsResearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerResearch(inputValue);
      setInputValue('');
    }
  };

  // Render a simple markdown representation for the streaming output
  const renderStreamingMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let clean = line.trim();
      if (clean.startsWith('# ')) {
        return <h3 key={idx} className="text-lg font-bold text-amber-500 mt-4 mb-2">{clean.slice(2)}</h3>;
      }
      if (clean.startsWith('## ')) {
        return <h4 key={idx} className="text-md font-bold text-slate-200 mt-3 mb-1.5">{clean.slice(3)}</h4>;
      }
      if (clean.startsWith('- ') || clean.startsWith('* ')) {
        return <li key={idx} className="text-xs text-slate-400 ml-4 list-disc mb-1">{clean.slice(2)}</li>;
      }
      
      // Basic Bold parsing
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(clean)) {
        const parts = clean.split('**');
        return (
          <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-amber-500/80 font-bold">{p}</strong> : p)}
          </p>
        );
      }
      return <p key={idx} className="text-xs text-slate-300 leading-relaxed my-1">{clean}</p>;
    });
  };

  const hasMissingKeys = !settings.openrouterApiKey || !settings.serperApiKey;

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full relative">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-900 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-100 tracking-wide">Company Research</h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-widest ml-0.5">LIVE</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col">
        {!isResearching && !activeReport && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-auto animate-in fade-in zoom-in duration-300 select-none">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-amber-500/90 tracking-[0.25em] block uppercase">
                AI-POWERED INTELLIGENCE
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                Know any company <br />
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  in minutes.
                </span>
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold pt-2">
                Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.
              </p>
            </div>

            {/* Suggested Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {['stripe.com', 'Tesla', 'Microsoft', 'OpenAI'].map((company) => (
                <button
                  key={company}
                  onClick={() => triggerResearch(company)}
                  disabled={hasMissingKeys}
                  className="px-4 py-2 bg-slate-900 border border-slate-900 text-slate-400 hover:text-slate-100 hover:border-slate-800 text-xs font-semibold rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {company}
                </button>
              ))}
            </div>

            {hasMissingKeys && (
              <div className="w-full mt-4 p-3.5 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-center justify-center gap-2 text-[10px] text-amber-500 font-bold tracking-wide">
                <Info className="h-4 w-4" />
                Configure API keys in the sidebar to get started
              </div>
            )}
          </div>
        )}

        {/* Loading Pipeline State */}
        {isResearching && (
          <div className="flex-1 flex flex-col gap-6 max-w-3xl w-full mx-auto justify-center select-none">
            {/* Timeline component */}
            <ProgressTimeline steps={steps} />

            {/* Live Streaming Text Terminal */}
            {streamText && (
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">
                  <Terminal className="h-4 w-4 text-amber-500" />
                  Streaming AI Analysis Output
                </div>
                <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {renderStreamingMarkdown(streamText)}
                  <span className="inline-block w-1.5 h-3 bg-amber-500 ml-1 animate-pulse" />
                </div>
                <div ref={streamEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Display Complete Report Card */}
        {activeReport && !isResearching && (
          <ReportView report={activeReport} discordConfig={settings.discordConfig} />
        )}
      </div>

      {/* Chat Bottom Input Container */}
      <footer className="p-6 border-t border-slate-900 bg-slate-950">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="relative flex items-end bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-xl focus-within:border-amber-500/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isResearching || hasMissingKeys}
              placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://stripe.com)..."
              className="flex-1 bg-transparent border-0 outline-none text-slate-100 text-sm placeholder-slate-600 resize-none pr-12 focus:ring-0 max-h-[120px] align-middle pt-1"
            />
            <Button
              onClick={() => {
                triggerResearch(inputValue);
                setInputValue('');
              }}
              disabled={isResearching || !inputValue.trim() || hasMissingKeys}
              size="sm"
              className="absolute right-3 bottom-2 h-8 w-18 flex items-center justify-center font-bold gap-1 text-[10px] tracking-wide uppercase px-2.5"
            >
              {isResearching ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  Research
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-600 font-semibold tracking-wider uppercase px-1 select-none">
            <span>ENTER TO RESEARCH • SHIFT+ENTER FOR NEW LINE</span>
            {hasMissingKeys && <span className="text-amber-500/70 font-bold">API KEYS CONFIGURED: NO</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
