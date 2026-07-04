'use client';

import React, { useState, useEffect } from 'react';
import { CompanyReport, DiscordConfig } from '@/types';
import { generateCompanyPDF } from '@/utils/pdf-generator';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { 
  FileText, Send, Check, Loader2, Download, 
  MapPin, Phone, ExternalLink, Globe, Shield, 
  Layers, AlertTriangle, Users, Sparkles, Clock, BookOpen, Share2, Cpu 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReportViewProps {
  report: CompanyReport;
  discordConfig?: DiscordConfig;
}

export default function ReportView({ report, discordConfig }: ReportViewProps) {
  const { toast } = useToast();
  const [isDiscordSending, setIsDiscordSending] = useState(false);
  const [isDiscordSent, setIsDiscordSent] = useState(false);

  // Trigger confetti when report is rendered for the first time
  useEffect(() => {
    // Elegant gold and blue confetti explosion
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#e2a82d', '#3b82f6', '#10b981'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#e2a82d', '#3b82f6', '#10b981'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Auto-trigger Discord send if configured
    if (discordConfig && discordConfig.botToken && discordConfig.channelId) {
      autoSendToDiscord();
    }
  }, [report]);

  const handleDownloadPDF = () => {
    try {
      const doc = generateCompanyPDF(report);
      const filename = `${report.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-research-report.pdf`;
      doc.save(filename);
      toast('PDF downloaded successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      toast('Failed to generate PDF. Make sure jsPDF is loaded.', 'error');
    }
  };

  const autoSendToDiscord = async () => {
    if (!discordConfig?.botToken || !discordConfig?.channelId) return;
    
    setIsDiscordSending(true);
    try {
      // Generate PDF doc to Base64
      const doc = generateCompanyPDF(report);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const response = await fetch('/api/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: discordConfig.botToken,
          channelId: discordConfig.channelId,
          applicantName: discordConfig.applicantName,
          applicantEmail: discordConfig.applicantEmail,
          companyName: report.name,
          companyWebsite: report.website,
          pdfBase64,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsDiscordSent(true);
        toast('PDF report auto-sent to Discord channel!', 'success');
      } else {
        toast(`Discord Upload failed: ${data.error}`, 'error');
      }
    } catch (err: any) {
      console.error(err);
      toast('Error auto-uploading to Discord.', 'error');
    } finally {
      setIsDiscordSending(false);
    }
  };

  const handleManualSendToDiscord = async () => {
    if (!discordConfig?.botToken || !discordConfig?.channelId) {
      toast('Please configure Discord Bot Token and Channel ID in the sidebar settings first!', 'error');
      return;
    }

    setIsDiscordSending(true);
    try {
      const doc = generateCompanyPDF(report);
      const pdfBase64 = doc.output('datauristring').split(',')[1];

      const response = await fetch('/api/discord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: discordConfig.botToken,
          channelId: discordConfig.channelId,
          applicantName: discordConfig.applicantName,
          applicantEmail: discordConfig.applicantEmail,
          companyName: report.name,
          companyWebsite: report.website,
          pdfBase64,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsDiscordSent(true);
        toast('PDF report successfully uploaded to Discord!', 'success');
      } else {
        toast(`Upload failed: ${data.error}`, 'error');
      }
    } catch (err: any) {
      console.error(err);
      toast('Error uploading to Discord.', 'error');
    } finally {
      setIsDiscordSending(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonStr = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-research-report.json`;
      a.click();
      toast('JSON Exported!', 'success');
    } catch (e) {
      toast('JSON Export failed.', 'error');
    }
  };

  const handleExportMarkdown = () => {
    try {
      let md = `# Company Research Report: ${report.name}\n\n`;
      md += `**Website:** ${report.website}\n`;
      md += `**Phone:** ${report.phone}\n`;
      md += `**Address:** ${report.address}\n`;
      md += `**Industry:** ${report.industry}\n`;
      md += `**Research Date:** ${report.timestamp}\n`;
      md += `**AI Model:** ${report.model}\n\n`;
      
      md += `## Executive Summary\n${report.summary}\n\n`;
      
      md += `## Products & Services\n`;
      report.products.forEach(p => md += `- ${p.name}${p.url ? ` (Source: ${p.url})` : ''}\n`);
      report.services.forEach(s => md += `- ${s.name}${s.url ? ` (Source: ${s.url})` : ''}\n`);
      
      md += `\n## AI-Generated Pain Points\n`;
      report.pain_points.forEach(p => md += `- ${p.point}${p.url ? ` (Source: ${p.url})` : ''}\n`);
      
      md += `\n## Competitors\n`;
      report.competitors.forEach(c => md += `- **${c.name}** (${c.website}): ${c.reason || 'Direct Competitor'}\n`);
      
      md += `\n## Sources\n`;
      report.sources.forEach(s => md += `- ${s}\n`);

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-research-report.md`;
      a.click();
      toast('Markdown Exported!', 'success');
    } catch (e) {
      toast('Markdown Export failed.', 'error');
    }
  };

  const handleShareLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast('Link copied to clipboard! (Research data is cached locally)', 'info');
    } catch (e) {
      toast('Failed to copy link.', 'error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-100 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Duration</span>
            <span className="text-xs font-semibold text-slate-200">
              {report.durationMs ? `${(report.durationMs / 1000).toFixed(2)}s` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
          <div className="bg-blue-500/10 text-blue-500 p-2 rounded-lg">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Pages Crawled</span>
            <span className="text-xs font-semibold text-slate-200">{report.pagesCrawledCount || 0}</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Sources Analyzed</span>
            <span className="text-xs font-semibold text-slate-200">{report.sourcesAnalyzedCount || 0}</span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 flex items-center gap-3">
          <div className="bg-purple-500/10 text-purple-500 p-2 rounded-lg">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Model</span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px] block" title={report.model}>
              {report.model.split('/').pop()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Report Header */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">{report.name}</h2>
            <a 
              href={report.website} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-500 hover:text-amber-400 text-xs font-semibold tracking-wide flex items-center gap-1 mt-1 hover:underline"
            >
              {report.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <span className="self-start md:self-center px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-widest uppercase rounded-full">
            ● RESEARCH COMPLETE
          </span>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3">
            <Phone className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PHONE</span>
              <span className="text-sm font-semibold text-slate-200">{report.phone}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3">
            <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">HEADQUARTERS</span>
              <span className="text-sm font-semibold text-slate-200">{report.address}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Executive Summary
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
            {report.summary}
          </p>
        </div>
      </div>

      {/* Products & Services */}
      {(report.products.length > 0 || report.services.length > 0) && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4" />
            Products & Services
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {report.products.map((p, i) => (
              <span 
                key={`p-${i}`} 
                className="px-3.5 py-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => p.url && window.open(p.url, '_blank')}
                title={p.url ? `Source: ${p.url}` : undefined}
              >
                {p.name}
                {p.url && <ExternalLink className="h-3 w-3 opacity-60" />}
              </span>
            ))}
            {report.services.map((s, i) => (
              <span 
                key={`s-${i}`} 
                className="px-3.5 py-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                onClick={() => s.url && window.open(s.url, '_blank')}
                title={s.url ? `Source: ${s.url}` : undefined}
              >
                {s.name}
                {s.url && <ExternalLink className="h-3 w-3 opacity-60" />}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Pain Points */}
      {report.pain_points.length > 0 && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4" />
            AI-Generated Pain Points
          </h3>
          <ul className="space-y-3.5">
            {report.pain_points.map((p, i) => (
              <li key={`pp-${i}`} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                <div className="text-sm text-slate-300 leading-relaxed font-normal">
                  {p.point}
                  {p.url && (
                    <a 
                      href={p.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-0.5 text-xs text-amber-500/80 hover:text-amber-400 font-semibold hover:underline ml-2"
                    >
                      [Source]
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SWOT Strengths / Weaknesses Grid */}
      {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">Strengths</h4>
            <ul className="space-y-2">
              {report.strengths.map((s, i) => (
                <li key={`str-${i}`} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4">Weaknesses</h4>
            <ul className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <li key={`wk-${i}`} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="text-rose-500 mt-0.5 font-bold">✗</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Competitors List */}
      {report.competitors.length > 0 && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            Competitors
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.competitors.map((c, i) => (
              <div 
                key={`c-${i}`} 
                className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/80 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-200 group-hover:text-amber-500 transition-colors text-sm">
                      {c.name}
                    </h4>
                    {c.website && (
                      <a 
                        href={c.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-0.5 hover:underline"
                      >
                        Visit Website
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal mb-3">
                    {c.reason}
                  </p>
                </div>
                {c.industry && (
                  <span className="self-start text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800/50 px-2 py-0.5 rounded uppercase">
                    {c.industry}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources Footer */}
      {report.sources.length > 0 && (
        <div className="p-4 bg-slate-950/20 border border-slate-900/60 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            RESEARCH SOURCES UTILIZED
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] text-slate-500">
            {report.sources.slice(0, 10).map((s, i) => (
              <a 
                key={`src-${i}`} 
                href={s} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-slate-300 hover:underline flex items-center gap-0.5 truncate max-w-xs font-semibold"
              >
                {s.replace(/https?:\/\/(www\.)?/, '')}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Footer Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-900">
        <div className="flex items-center gap-2">
          {/* Main Action buttons */}
          <Button onClick={handleDownloadPDF} variant="primary" className="gap-2 text-xs font-semibold px-5 py-3">
            <Download className="h-4 w-4" />
            Download PDF Report
          </Button>

          {isDiscordSent ? (
            <div className="bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Check className="h-4 w-4" />
              Sent to Discord
            </div>
          ) : (
            <Button 
              onClick={handleManualSendToDiscord} 
              variant="secondary" 
              disabled={isDiscordSending}
              className="gap-2 text-xs font-semibold px-4 py-3"
            >
              {isDiscordSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to Discord
            </Button>
          )}
        </div>

        {/* Extra Export utility items */}
        <div className="flex items-center gap-2">
          <Button onClick={handleExportJSON} variant="ghost" className="text-xs p-2.5" title="Export JSON">
            <FileText className="h-4 w-4 mr-1 text-blue-400" />
            JSON
          </Button>
          <Button onClick={handleExportMarkdown} variant="ghost" className="text-xs p-2.5" title="Export Markdown">
            <FileText className="h-4 w-4 mr-1 text-emerald-400" />
            MD
          </Button>
          <Button onClick={handleShareLink} variant="ghost" className="text-xs p-2.5" title="Share Report Link">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
