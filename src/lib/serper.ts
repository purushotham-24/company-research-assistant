import axios from 'axios';
import { serverCache } from './cache';
import { Competitor } from '@/types';

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

export async function searchSerper(query: string, apiKey: string): Promise<SerperResult[]> {
  if (!apiKey) {
    throw new Error('Serper API Key is required');
  }

  const cacheKey = `serper:search:${query.toLowerCase().trim()}`;
  
  return serverCache.getOrCreatePending(cacheKey, async () => {
    console.log(`[Serper] Fetching live search results for: "${query}"`);
    try {
      const response = await axios.post(
        'https://google.serper.dev/search',
        { q: query, num: 10 },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10s timeout
        }
      );

      const organic = response.data.organic || [];
      return organic.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
      }));
    } catch (err: any) {
      console.error(`[Serper] Error fetching query "${query}":`, err.message);
      return [];
    }
  });
}

// 1. Resolve Company Name to Website
export async function resolveOfficialWebsite(companyName: string, apiKey: string): Promise<string> {
  const query = `${companyName} official website`;
  const results = await searchSerper(query, apiKey);

  if (results.length === 0) {
    throw new Error(`Could not find any search results for ${companyName}`);
  }

  // Filter out social networks, directory sites, news, etc.
  const blacklistedDomains = [
    'wikipedia.org',
    'linkedin.com',
    'twitter.com',
    'x.com',
    'crunchbase.com',
    'facebook.com',
    'instagram.com',
    'youtube.com',
    'glassdoor.com',
    'reddit.com',
    'github.com',
    'g2.com',
    'capterra.com',
    'bloomberg.com',
    'forbes.com',
    'yahoo.com',
  ];

  for (const item of results) {
    try {
      const url = new URL(item.link);
      const host = url.hostname.replace('www.', '');
      if (!blacklistedDomains.some((domain) => host.includes(domain))) {
        // Return protocol + host (or full domain)
        return `${url.protocol}//${url.hostname}`;
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  // Fallback to the first organic link
  return results[0].link;
}

// 2. Multi-query competitor discovery
export async function discoverCompetitors(companyName: string, industry: string, apiKey: string): Promise<Competitor[]> {
  const queries = [
    `competitors of ${companyName}`,
    `alternatives to ${companyName}`,
    `companies similar to ${companyName}`,
  ];

  if (industry) {
    queries.push(`top companies in ${industry} industry`);
  }

  // Fetch all in parallel
  const searchPromises = queries.map((q) => searchSerper(q, apiKey));
  const resultsGrouped = await Promise.all(searchPromises);

  const competitorMap = new Map<string, { name: string; website: string; count: number; snippets: string[] }>();

  // Extract potential competitors from snippets and titles
  // We look for name patterns and website links.
  for (let i = 0; i < resultsGrouped.length; i++) {
    const results = resultsGrouped[i];
    const queryUsed = queries[i];

    for (const item of results) {
      try {
        const url = new URL(item.link);
        const domain = url.hostname.replace('www.', '').toLowerCase();
        
        // Skip searching company itself
        if (domain.includes(companyName.toLowerCase().replace(/\s/g, ''))) {
          continue;
        }

        // Avoid common high-level domains
        const skipDomains = [
          'linkedin.com', 'wikipedia.org', 'youtube.com', 'twitter.com', 'x.com', 
          'crunchbase.com', 'facebook.com', 'g2.com', 'capterra.com', 'reddit.com',
          'google.com', 'medium.com', 'github.com', 'glassdoor.com'
        ];
        if (skipDomains.some(d => domain.includes(d))) {
          continue;
        }

        // Guess Name from Title (e.g. "Stripe - Competitors" -> "Stripe")
        let name = item.title.split(/[-|:|–]/)[0].trim();
        // Clean up common suffix
        name = name.replace(/(Alternative|Competitors|Competitor|Review|vs|Pricing|Login)/gi, '').trim();

        if (name.length < 2 || name.length > 25) {
          name = domain.split('.')[0].toUpperCase();
        }

        const cleanKey = domain;
        const existing = competitorMap.get(cleanKey);

        if (existing) {
          existing.count += 1;
          existing.snippets.push(item.snippet);
        } else {
          competitorMap.set(cleanKey, {
            name,
            website: `${url.protocol}//${url.hostname}`,
            count: 1,
            snippets: [item.snippet],
          });
        }
      } catch (e) {
        // Invalid URL
      }
    }
  }

  // Sort by count (frequency of appearance) and format as Competitor list
  const sorted = Array.from(competitorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Limit to top 5
    .map((comp) => {
      // Find a reasonable snippet description for why it was selected
      let reason = `Identified as a direct competitor or alternative to ${companyName}`;
      if (comp.snippets.length > 0) {
        const relevantSnippet = comp.snippets.find(s => 
          s.toLowerCase().includes('competitor') || 
          s.toLowerCase().includes('alternative') || 
          s.toLowerCase().includes('vs')
        );
        if (relevantSnippet) {
          reason = relevantSnippet.length > 120 ? relevantSnippet.slice(0, 117) + '...' : relevantSnippet;
        } else {
          reason = comp.snippets[0].length > 120 ? comp.snippets[0].slice(0, 117) + '...' : comp.snippets[0];
        }
      }

      return {
        name: comp.name,
        website: comp.website,
        reason: reason,
        industry: industry || 'Technology',
      };
    });

  return sorted;
}

// 3. Search and extract contact info & details
export async function getCompanyContactInfo(companyName: string, domain: string, apiKey: string): Promise<{ phone: string; address: string }> {
  const query = `"${companyName}" address phone number headquarters contact information`;
  const results = await searchSerper(query, apiKey);

  let phone = 'Not publicly listed';
  let address = 'Not publicly listed';

  // Search snippets for patterns
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  
  for (const item of results) {
    const text = `${item.title} ${item.snippet}`;
    
    // Attempt to extract phone number if not found yet
    if (phone === 'Not publicly listed') {
      const match = text.match(phoneRegex);
      if (match && match.length > 0) {
        phone = match[0].trim();
      }
    }

    // Attempt to extract address from snippet
    if (address === 'Not publicly listed') {
      if (text.toLowerCase().includes('headquarters at') || text.toLowerCase().includes('hq is located') || text.toLowerCase().includes('address:')) {
        const index = text.toLowerCase().indexOf('address:');
        if (index !== -1) {
          address = text.slice(index + 8, index + 100).split('.')[0].trim();
        } else {
          const hqIndex = text.toLowerCase().indexOf('headquarters');
          if (hqIndex !== -1) {
            address = text.slice(hqIndex, hqIndex + 90).split('.')[0].trim();
          }
        }
      }
    }
  }

  // If still not found, do a specific address query
  if (address === 'Not publicly listed') {
    const addrResults = await searchSerper(`"${companyName}" headquarters address`, apiKey);
    if (addrResults.length > 0) {
      address = addrResults[0].snippet.split('.')[0].trim();
    }
  }

  return { phone, address };
}
