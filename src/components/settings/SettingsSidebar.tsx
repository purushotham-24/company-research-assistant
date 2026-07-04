'use client';

import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppSettings, DiscordConfig } from '@/types';
import { OPENROUTER_MODELS } from '@/lib/openrouter';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { KeyRound, ShieldAlert, Cpu, Sparkles, Send, Info, Moon, Sun, HelpCircle } from 'lucide-react';

interface SettingsSidebarProps {
  onNewResearch: () => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  openrouterApiKey: '',
  serperApiKey: '',
  selectedModel: 'google/gemini-2.0-flash-exp',
  theme: 'dark',
  discordConfig: {
    applicantName: '',
    applicantEmail: '',
    botToken: '',
    channelId: '',
  },
};

export default function SettingsSidebar({ onNewResearch, settings, setSettings }: SettingsSidebarProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'discord'>('api');
  const { toast } = useToast();

  // Local state for forms to allow user to type and then click Save
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [serperKey, setSerperKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');

  // Sync state from localStorage after initial render
  useEffect(() => {
    setOpenrouterKey(settings.openrouterApiKey || '');
    setSerperKey(settings.serperApiKey || '');
    setSelectedModel(settings.selectedModel || 'google/gemini-2.0-flash-exp');
    
    setBotToken(settings.discordConfig?.botToken || '');
    setChannelId(settings.discordConfig?.channelId || '');
    setApplicantName(settings.discordConfig?.applicantName || '');
    setApplicantEmail(settings.discordConfig?.applicantEmail || '');
  }, [settings]);

  const handleSaveApi = () => {
    setSettings({
      ...settings,
      openrouterApiKey: openrouterKey.trim(),
      serperApiKey: serperKey.trim(),
      selectedModel: selectedModel,
    });
    toast('API Configuration saved successfully!', 'success');
  };

  const handleSaveDiscord = () => {
    setSettings({
      ...settings,
      discordConfig: {
        botToken: botToken.trim(),
        channelId: channelId.trim(),
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
      },
    });
    toast('Discord configuration saved successfully!', 'success');
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings({
      ...settings,
      theme: nextTheme,
    });
    toast(`Switched to ${nextTheme} mode`, 'info');
  };

  return (
    <aside className="w-80 bg-slate-950 border-r border-slate-900 flex flex-col h-full overflow-y-auto text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/10">
            Ω
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-wide text-sm flex items-center gap-1.5">
              Relu Consultancy
            </h1>
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest block uppercase">
              COMPANY INTELLIGENCE
            </span>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 transition-all active:scale-95"
          title="Toggle Theme"
        >
          {settings.theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Main Actions */}
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onNewResearch}
          className="w-full justify-center py-2 text-xs uppercase tracking-wider font-semibold border-dashed hover:border-amber-500/50 hover:text-amber-400 transition-all gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          + New Research
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 mb-4">
        <div className="bg-slate-900/60 p-1 rounded-lg border border-slate-900/80 flex">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'api'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            API KEYS
          </button>
          <button
            onClick={() => setActiveTab('discord')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'discord'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            DISCORD
          </button>
        </div>
      </div>

      {/* Settings Forms */}
      <div className="flex-1 px-4 space-y-4">
        {activeTab === 'api' ? (
          <div className="space-y-4">
            {/* OpenRouter Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                OPENROUTER API KEY
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 pr-8"
                />
                <KeyRound className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-600" />
              </div>
            </div>

            {/* Serper Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                SERPER.DEV API KEY
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={serperKey}
                  onChange={(e) => setSerperKey(e.target.value)}
                  placeholder="Your Serper key..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 pr-8"
                />
                <KeyRound className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-600" />
              </div>
            </div>

            {/* AI Model selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                AI REASONING MODEL
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50 appearance-none pr-8 cursor-pointer"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-950">
                      {m.name}
                    </option>
                  ))}
                </select>
                <Cpu className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
              </div>
            </div>

            <Button onClick={handleSaveApi} className="w-full text-xs font-semibold py-2">
              Save Configuration
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Description Info card */}
            <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-lg flex items-start gap-2.5">
              <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-purple-300 leading-normal font-medium">
                <strong>Discord Bot Integration</strong>
                <br />
                After research completes, the report auto-sends to your configured channel.
              </p>
            </div>

            {/* Bot Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                DISCORD BOT TOKEN
              </label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="MT..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Channel ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                DISCORD CHANNEL ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="000000000000000000"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Applicant Details divider */}
            <div className="border-t border-slate-900 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Applicant Details
              </span>

              {/* Full Name */}
              <div className="space-y-1.5 mb-3">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <Button onClick={handleSaveDiscord} className="w-full text-xs font-semibold py-2">
              Save Discord Config
            </Button>
          </div>
        )}
      </div>

      {/* How it works info list */}
      <div className="p-4 border-t border-slate-900">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
          HOW IT WORKS
        </span>
        <ol className="space-y-3 text-[10px] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-bold text-[9px] text-amber-500 mt-0.5">
              1
            </span>
            <span className="text-slate-400 font-medium">Enter a company name or URL</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-bold text-[9px] text-amber-500 mt-0.5">
              2
            </span>
            <span className="text-slate-400 font-medium">Serper.dev searches and crawls it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-bold text-[9px] text-amber-500 mt-0.5">
              3
            </span>
            <span className="text-slate-400 font-medium">OpenRouter AI generates insights</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-bold text-[9px] text-amber-500 mt-0.5">
              4
            </span>
            <span className="text-slate-400 font-medium">Download a professional PDF report</span>
          </li>
        </ol>
      </div>

      {/* Footnote */}
      <div className="p-4 bg-slate-950 border-t border-slate-900/50 flex justify-center items-center text-[9px] text-slate-600 font-semibold tracking-[0.15em] uppercase">
        OPENROUTER • SERPER • JSPDF
      </div>
    </aside>
  );
}
