export interface SearchTimelineStep {
  id: 'resolving' | 'crawling' | 'searching' | 'ai_analysis' | 'pdf_generation' | 'discord_integration';
  label: string;
  status: 'waiting' | 'running' | 'completed' | 'failed';
  message?: string;
}

export interface ProductOrService {
  name: string;
  url?: string;
}

export interface PainPoint {
  point: string;
  url?: string;
}

export interface Competitor {
  name: string;
  website: string;
  reason?: string;
  country?: string;
  industry?: string;
}

export interface CompanyReport {
  name: string;
  website: string;
  phone: string;
  address: string;
  industry: string;
  summary: string;
  products: ProductOrService[];
  services: ProductOrService[];
  pain_points: PainPoint[];
  strengths: string[];
  weaknesses: string[];
  tech_stack?: string[];
  competitors: Competitor[];
  sources: string[];
  timestamp: string;
  model: string;
  durationMs?: number;
  pagesCrawledCount?: number;
  sourcesAnalyzedCount?: number;
}

export interface DiscordConfig {
  applicantName: string;
  applicantEmail: string;
  botToken: string;
  channelId: string;
}

export interface AppSettings {
  openrouterApiKey: string;
  serperApiKey: string;
  selectedModel: string;
  discordConfig: DiscordConfig;
  theme: 'light' | 'dark';
}

export interface ResearchStreamEvent {
  event: 'status' | 'report' | 'error' | 'done';
  data: any;
}
