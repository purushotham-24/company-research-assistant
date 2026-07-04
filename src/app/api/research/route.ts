import { NextRequest } from 'next/server';
import { resolveOfficialWebsite, getCompanyContactInfo, discoverCompetitors } from '@/lib/serper';
import { crawlWebsite } from '@/lib/crawler';
import { getOpenRouterStream } from '@/lib/openrouter';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';
import { CompanyReport } from '@/types';

export const dynamic = 'force-dynamic';

function cleanJsonString(raw: string): string {
  let clean = raw.trim();
  // Strip starting ```json or ```
  if (clean.startsWith('```json')) {
    clean = clean.slice(7);
  } else if (clean.startsWith('```')) {
    clean = clean.slice(3);
  }
  // Strip ending ```
  if (clean.endsWith('```')) {
    clean = clean.slice(0, -3);
  }
  return clean.trim();
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const startTime = Date.now();

  // Get data from headers or body
  const openrouterApiKey = req.headers.get('x-openrouter-key') || process.env.OPENROUTER_API_KEY || '';
  const serperApiKey = req.headers.get('x-serper-key') || process.env.SERPER_API_KEY || '';

  const body = await req.json().catch(() => ({}));
  const { input, model } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (type: 'status' | 'text' | 'report' | 'error' | 'done', data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
          );
        } catch (e) {
          console.warn('[Research API] Controller enqueue failed (client probably disconnected).');
        }
      };

      if (!input) {
        sendUpdate('error', { message: 'Input (Company Name or Website URL) is required.' });
        controller.close();
        return;
      }

      if (!openrouterApiKey) {
        sendUpdate('error', { message: 'OpenRouter API Key is missing. Configure it in the API settings tab.' });
        controller.close();
        return;
      }

      if (!serperApiKey) {
        sendUpdate('error', { message: 'Serper.dev API Key is missing. Configure it in the API settings tab.' });
        controller.close();
        return;
      }

      try {
        let websiteUrl = input.trim();
        let companyName = '';

        // 1. Resolve Website URL
        sendUpdate('status', {
          step: 'resolving',
          status: 'running',
          message: 'Checking input type and resolving official website...',
        });

        const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(websiteUrl);

        if (isUrl) {
          // Normalize URL
          if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
            websiteUrl = `https://${websiteUrl}`;
          }
          try {
            const urlObj = new URL(websiteUrl);
            companyName = urlObj.hostname.replace('www.', '').split('.')[0];
            // Capitalize
            companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
          } catch (e) {
            companyName = websiteUrl;
          }
          sendUpdate('status', {
            step: 'resolving',
            status: 'completed',
            message: `Input recognized as URL. Using: ${websiteUrl}`,
          });
        } else {
          companyName = websiteUrl;
          sendUpdate('status', {
            step: 'resolving',
            status: 'running',
            message: `Searching Serper.dev to find official website for "${companyName}"...`,
          });

          try {
            websiteUrl = await resolveOfficialWebsite(companyName, serperApiKey);
            sendUpdate('status', {
              step: 'resolving',
              status: 'completed',
              message: `Official website found: ${websiteUrl}`,
            });
          } catch (err: any) {
            console.error('[Research API] Failed to resolve website name:', err.message);
            sendUpdate('status', {
              step: 'resolving',
              status: 'failed',
              message: `Could not resolve official website for "${companyName}". Fallback to Google Search content.`,
            });
            // Try crawling google search page instead, or proceed with empty website URL
            websiteUrl = `https://www.google.com/search?q=${encodeURIComponent(companyName)}`;
          }
        }

        // 2. Crawl Website & Gather Search Data in Parallel
        sendUpdate('status', {
          step: 'crawling',
          status: 'running',
          message: `Crawling key pages of ${websiteUrl}...`,
        });
        sendUpdate('status', {
          step: 'searching',
          status: 'running',
          message: `Searching internet for detailed information on ${companyName}...`,
        });

        // Run crawl and search concurrently
        const crawlPromise = crawlWebsite(websiteUrl).catch((err) => {
          console.error('[Research API] Crawl failed:', err.message);
          return { pages: [], phone: '', address: '', emails: [], socialLinks: [] };
        });

        const searchPromise = getCompanyContactInfo(companyName, websiteUrl, serperApiKey).catch((err) => {
          console.error('[Research API] Contact info search failed:', err.message);
          return { phone: 'Not publicly listed', address: 'Not publicly listed' };
        });

        const [crawlResult, contactInfo] = await Promise.all([crawlPromise, searchPromise]);

        sendUpdate('status', {
          step: 'crawling',
          status: 'completed',
          message: `Crawled ${crawlResult.pages.length} pages. Extracted ${crawlResult.socialLinks.length} social links.`,
        });

        sendUpdate('status', {
          step: 'searching',
          status: 'completed',
          message: `Gathered search info. Headquarters: ${contactInfo.address}`,
        });

        // 3. Competitor Discovery
        sendUpdate('status', {
          step: 'searching',
          status: 'running',
          message: `Discovering key competitors and industry peers...`,
        });

        const industry = ''; // Will let AI determine exact industry
        const competitors = await discoverCompetitors(companyName, industry, serperApiKey).catch((err) => {
          console.error('[Research API] Competitor discovery failed:', err.message);
          return [];
        });

        sendUpdate('status', {
          step: 'searching',
          status: 'completed',
          message: `Identified ${competitors.length} potential competitors.`,
        });

        // 4. AI Analysis & Streaming
        sendUpdate('status', {
          step: 'ai_analysis',
          status: 'running',
          message: `Analyzing data with OpenRouter model: ${model || 'google/gemini-2.0-flash-exp'}...`,
        });

        // Build User Prompt
        const userPrompt = buildUserPrompt(companyName, websiteUrl, crawlResult.pages, crawlResult.pages, competitors);

        // Get Stream from OpenRouter
        const aiResponse = await getOpenRouterStream(openrouterApiKey, model, SYSTEM_PROMPT, userPrompt);
        const aiReader = aiResponse.body?.getReader();
        const aiDecoder = new TextDecoder();
        
        let fullAiResponseText = '';
        let buffer = '';

        if (!aiReader) {
          throw new Error('Could not get reader from OpenRouter response stream.');
        }

        while (true) {
          const { done, value } = await aiReader.read();
          if (done) break;

          buffer += aiDecoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;

            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.slice(6));
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullAiResponseText += content;
                  sendUpdate('text', { chunk: content });
                }
              } catch (e) {
                // Ignore parse errors on partial stream lines
              }
            }
          }
        }

        // Flush any remaining buffer
        if (buffer.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(buffer.slice(6));
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullAiResponseText += content;
              sendUpdate('text', { chunk: content });
            }
          } catch (e) {}
        }

        sendUpdate('status', {
          step: 'ai_analysis',
          status: 'completed',
          message: 'AI analysis completed successfully.',
        });

        // 5. PDF Generation & Final Payload Formatting
        sendUpdate('status', {
          step: 'pdf_generation',
          status: 'running',
          message: 'Structuring report details and formatting final payload...',
        });

        // Parse JSON output from AI
        let parsedReport: Partial<CompanyReport> = {};
        const cleanedText = cleanJsonString(fullAiResponseText);
        try {
          parsedReport = JSON.parse(cleanedText);
        } catch (err: any) {
          console.error('[Research API] Failed to parse AI JSON response:', err.message);
          console.log('[Research API] Raw text was:', cleanedText);
          // Attempt to build a basic fallback report structure by regex
          parsedReport = {
            summary: cleanedText.slice(0, 1000),
            industry: 'Technology',
            products: [],
            services: [],
            pain_points: [],
            strengths: [],
            weaknesses: [],
            competitors: competitors,
          };
        }

        // Gather all research sources (crawled URLs + search links)
        const sources = Array.from(
          new Set([
            websiteUrl,
            ...crawlResult.pages.map((p) => p.url),
            ...competitors.map((c) => c.website),
          ])
        ).filter(Boolean);

        // Construct final report
        const finalReport: CompanyReport = {
          name: parsedReport.name || companyName,
          website: websiteUrl,
          phone: crawlResult.phone || contactInfo.phone || 'Not publicly listed',
          address: contactInfo.address || 'Not publicly listed',
          industry: parsedReport.industry || 'Technology',
          summary: parsedReport.summary || 'Summary unavailable.',
          products: parsedReport.products || [],
          services: parsedReport.services || [],
          pain_points: parsedReport.pain_points || [],
          strengths: parsedReport.strengths || [],
          weaknesses: parsedReport.weaknesses || [],
          tech_stack: parsedReport.tech_stack || [],
          competitors: parsedReport.competitors && parsedReport.competitors.length > 0 
            ? parsedReport.competitors 
            : competitors,
          sources: sources,
          timestamp: new Date().toLocaleString(),
          model: model || 'google/gemini-2.0-flash-exp',
          durationMs: Date.now() - startTime,
          pagesCrawledCount: crawlResult.pages.length,
          sourcesAnalyzedCount: sources.length,
        };

        sendUpdate('status', {
          step: 'pdf_generation',
          status: 'completed',
          message: 'Report payload structured.',
        });

        // Send completed report object
        sendUpdate('report', { report: finalReport });
        sendUpdate('done', { message: 'Research process finished successfully!' });
        controller.close();

      } catch (err: any) {
        console.error('[Research API] Critical failure:', err);
        sendUpdate('error', { message: err.message || 'An unexpected error occurred during research.' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
