import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { serverCache } from './cache';

// Disable SSL verification for crawler to handle broken/misconfigured certificates
const axiosInstance = axios.create({
  timeout: 8000, // 8s timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 ReluConsultancyBot/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export interface CrawledPage {
  url: string;
  title: string;
  headings: string[];
  content: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  phone: string;
  address: string;
  emails: string[];
  socialLinks: string[];
}

export async function crawlWebsite(startUrl: string): Promise<CrawlResult> {
  // Ensure startUrl has protocol
  let urlStr = startUrl.trim();
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }

  const cacheKey = `crawler:results:${urlStr.toLowerCase()}`;
  const cached = serverCache.get<CrawlResult>(cacheKey);
  if (cached) {
    console.log(`[Crawler] Found cached crawl results for: ${urlStr}`);
    return cached;
  }

  let baseUrlObj: URL;
  try {
    baseUrlObj = new URL(urlStr);
  } catch (e) {
    console.error(`[Crawler] Invalid starting URL: ${urlStr}`);
    return { pages: [], phone: '', address: '', emails: [], socialLinks: [] };
  }

  const baseDomain = baseUrlObj.hostname.replace('www.', '').toLowerCase();

  const pagesToCrawl: string[] = [baseUrlObj.origin + baseUrlObj.pathname];
  const crawledUrls = new Set<string>();
  const pages: CrawledPage[] = [];

  const foundPhoneNumbers = new Set<string>();
  const foundEmails = new Set<string>();
  const foundSocials = new Set<string>();

  // Filter criteria lists
  const whitelistedPaths = [
    'about', 'products', 'services', 'solutions', 'pricing', 'contact', 'blog', 
    'resources', 'docs', 'features', 'industries', 'customers', 'case-studies', 'overview'
  ];
  
  const blacklistedPaths = [
    'login', 'signup', 'signin', 'register', 'privacy', 'terms', 'cookies', '404', 
    'account', 'dashboard', 'settings', 'admin', 'cart', 'checkout', 'apply', 'careers'
  ];

  // Regex patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const socialDomains = ['linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'github.com', 'youtube.com'];

  // Start BFS crawling with concurrency limit
  let pagesCrawled = 0;
  const MAX_PAGES = 10;

  while (pagesToCrawl.length > 0 && pagesCrawled < MAX_PAGES) {
    const currentUrl = pagesToCrawl.shift()!;
    if (crawledUrls.has(currentUrl)) continue;

    crawledUrls.add(currentUrl);
    console.log(`[Crawler] Crawling page ${pagesCrawled + 1}/${MAX_PAGES}: ${currentUrl}`);

    try {
      const response = await axiosInstance.get(currentUrl);
      const contentType = String(response.headers['content-type'] || '');
      
      if (!contentType.includes('text/html')) {
        continue;
      }

      const html = response.data;
      const $ = cheerio.load(html);

      // Remove script, style, noscript, and iframe elements
      $('script, style, noscript, iframe, svg, path, nav, footer').remove();

      const title = $('title').text().trim();

      // Gather text content
      const headings: string[] = [];
      $('h1, h2, h3').each((_, elem) => {
        const text = $(elem).text().replace(/\s+/g, ' ').trim();
        if (text.length > 3 && text.length < 150) {
          headings.push(text);
        }
      });

      // Paragraphs
      const paragraphs: string[] = [];
      $('p').each((_, elem) => {
        const text = $(elem).text().replace(/\s+/g, ' ').trim();
        if (text.length > 20 && text.length < 1000) {
          paragraphs.push(text);
        }
      });

      const cleanContent = paragraphs.slice(0, 30).join('\n\n'); // Grab first 30 paragraphs to prevent overflow

      pages.push({
        url: currentUrl,
        title: title || currentUrl,
        headings: headings.slice(0, 10),
        content: cleanContent,
      });
      pagesCrawled++;

      // Scan page body for emails, phone numbers
      const fullText = $.text();
      
      const pageEmails = fullText.match(emailRegex);
      if (pageEmails) {
        pageEmails.forEach(e => {
          const email = e.toLowerCase().trim();
          // Filter common false positives
          if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.endsWith('.gif') && !email.endsWith('.svg')) {
            foundEmails.add(email);
          }
        });
      }

      const pagePhones = fullText.match(phoneRegex);
      if (pagePhones) {
        pagePhones.forEach(p => {
          const cleaned = p.trim();
          if (cleaned.length >= 7 && cleaned.length <= 20) {
            foundPhoneNumbers.add(cleaned);
          }
        });
      }

      // Find links
      $('a').each((_, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;

        // Resolve absolute URL
        let resolvedUrl: string;
        try {
          resolvedUrl = new URL(href, currentUrl).href;
        } catch (e) {
          return;
        }

        // Clean link hash and query params
        const cleanUrlObj = new URL(resolvedUrl);
        cleanUrlObj.hash = '';
        cleanUrlObj.search = '';
        const cleanUrl = cleanUrlObj.href;

        // Check if link is social network
        const isSocial = socialDomains.some(d => cleanUrl.toLowerCase().includes(d));
        if (isSocial) {
          foundSocials.add(cleanUrl);
          return;
        }

        // Must be on the same base domain
        const linkDomain = cleanUrlObj.hostname.replace('www.', '').toLowerCase();
        if (linkDomain !== baseDomain) {
          return;
        }

        // Exclude duplicate/already-queued links
        if (crawledUrls.has(cleanUrl) || pagesToCrawl.includes(cleanUrl)) {
          return;
        }

        // Filter based on blacklist and whitelist path components
        const path = cleanUrlObj.pathname.toLowerCase();
        const hasBlacklisted = blacklistedPaths.some(p => path.includes(p));
        if (hasBlacklisted) {
          return;
        }

        const hasWhitelisted = whitelistedPaths.some(p => path.includes(p));
        // Also allow root path
        if (path === '/' || path === '' || hasWhitelisted) {
          pagesToCrawl.push(cleanUrl);
        }
      });

    } catch (err: any) {
      console.error(`[Crawler] Failed to crawl page "${currentUrl}":`, err.message);
    }
  }

  const result: CrawlResult = {
    pages,
    phone: Array.from(foundPhoneNumbers)[0] || '',
    address: '', // Will resolve from Serper search
    emails: Array.from(foundEmails).slice(0, 5),
    socialLinks: Array.from(foundSocials).slice(0, 8),
  };

  serverCache.set(cacheKey, result);
  return result;
}
