'use client';

import React, { useState } from 'react';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import ChatContainer from '@/components/chat/ChatContainer';
import { AppSettings, CompanyReport } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

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

export default function Home() {
  const [settings, setSettings] = useLocalStorage<AppSettings>('assistant_settings', DEFAULT_SETTINGS);
  const [activeReport, setActiveReport] = useState<CompanyReport | null>(null);

  const handleNewResearch = () => {
    setActiveReport(null);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans ${settings.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      {/* Sidebar */}
      <SettingsSidebar 
        onNewResearch={handleNewResearch} 
        settings={settings}
        setSettings={setSettings}
      />

      {/* Main Chat / Report Container */}
      <ChatContainer 
        settings={settings} 
        activeReport={activeReport}
        setActiveReport={setActiveReport}
      />
    </div>
  );
}
