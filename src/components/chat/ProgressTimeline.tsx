'use client';

import React from 'react';
import { SearchTimelineStep } from '@/types';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

interface ProgressTimelineProps {
  steps: SearchTimelineStep[];
}

export default function ProgressTimeline({ steps }: ProgressTimelineProps) {
  return (
    <div className="w-full max-w-xl mx-auto py-6 px-8 bg-slate-900/40 border border-slate-900 rounded-2xl backdrop-blur-md shadow-xl select-none">
      <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-6 text-center">
        Research Pipeline Status
      </h3>
      <div className="relative flex flex-col gap-6">
        {/* Vertical Connecting Line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-[2px] bg-slate-800" />

        {steps.map((step, idx) => {
          const isWaiting = step.status === 'waiting';
          const isRunning = step.status === 'running';
          const isCompleted = step.status === 'completed';
          const isFailed = step.status === 'failed';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 relative z-10"
            >
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-0.5 bg-slate-950 rounded-full p-0.5">
                {isCompleted && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <CheckCircle2 className="h-6.5 w-6.5 text-emerald-400 fill-emerald-950/40" />
                  </motion.div>
                )}
                {isRunning && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  >
                    <Loader2 className="h-6.5 w-6.5 text-amber-500" />
                  </motion.div>
                )}
                {isWaiting && (
                  <Circle className="h-6.5 w-6.5 text-slate-700 fill-slate-950" />
                )}
                {isFailed && (
                  <AlertCircle className="h-6.5 w-6.5 text-rose-500" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold tracking-wide block transition-colors ${
                    isCompleted
                      ? 'text-slate-200'
                      : isRunning
                      ? 'text-amber-400'
                      : isFailed
                      ? 'text-rose-400'
                      : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
                {step.message && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-xs block mt-0.5 transition-colors truncate ${
                      isRunning ? 'text-amber-500/70' : isFailed ? 'text-rose-500/70' : 'text-slate-500'
                    }`}
                  >
                    {step.message}
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
