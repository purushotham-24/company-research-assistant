import { CrawledPage } from './crawler';

export const SYSTEM_PROMPT = `You are a Senior Staff Software Engineer, AI Architect, and Corporate Research Analyst.
Your task is to analyze the provided company data and generate a structured, professional, and detailed report.

CRITICAL REQUIREMENT:
You must respond with ONLY a single, valid JSON object. No pre-amble, no markdown wrapping (do NOT wrap the JSON in \`\`\`json ... \`\`\`), and no conversational text. The response must start with '{' and end with '}'.

The JSON structure must match this EXACT schema:
{
  "summary": "Detailed executive summary of the company, its mission, and its core value proposition. Include inline citations to sources if relevant.",
  "industry": "Specific industry sector (e.g. FinTech, Developer Tools, E-commerce, Aerospace, etc.)",
  "products": [
    {
      "name": "Product Name",
      "url": "Specific source URL from the crawled pages where this product is mentioned (use exact page URL from context, e.g. https://stripe.com/billing)"
    }
  ],
  "services": [
    {
      "name": "Service Name",
      "url": "Specific source URL from the crawled pages where this service is mentioned"
    }
  ],
  "pain_points": [
    {
      "point": "Detail of a specific pain point or industry challenge the company faces or addresses (e.g., scaling transaction processing, cloud costs)",
      "url": "Source URL supporting this pain point (can be a website page or serper news link)"
    }
  ],
  "strengths": [
    "Key strength 1 (e.g., strong API developer experience)",
    "Key strength 2"
  ],
  "weaknesses": [
    "Key weakness 1 (e.g., highly dependent on credit card processors)",
    "Key weakness 2"
  ],
  "tech_stack": [
    "React", "Node.js", "AWS", "Stripe API"
  ],
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "https://competitor.com",
      "reason": "Clear explanation of why they compete with this company",
      "country": "Country of operation if known",
      "industry": "Industry classification"
    }
  ]
}

Ensure all source URLs match URLs present in the input data. Do not invent links. Make sure the output is valid JSON. Escape double quotes inside strings properly.`;

export function buildUserPrompt(
  companyName: string,
  websiteUrl: string,
  crawledPages: CrawledPage[],
  serperData: any[],
  competitorsData: any[]
): string {
  const crawledContext = crawledPages
    .map((p) => `URL: ${p.url}\nTITLE: ${p.title}\nCONTENT:\n${p.content}\n---`)
    .join('\n\n');

  const serperContext = serperData
    .map((s) => `TITLE: ${s.title}\nLINK: ${s.link}\nSNIPPET: ${s.snippet}\n---`)
    .join('\n');

  const competitorsContext = competitorsData
    .map((c) => `NAME: ${c.name}\nWEBSITE: ${c.website}\nREASON: ${c.reason}\n---`)
    .join('\n');

  return `Here is the collected public data for the company:
Company Name: ${companyName}
Official Website: ${websiteUrl}

=== CRAWLED WEBSITE PAGES ===
${crawledContext}

=== SEARCH ENGINE (SERPER.DEV) RESULTS ===
${serperContext}

=== PRELIMINARY COMPETITOR DATA ===
${competitorsContext}

Please analyze this information. Extract the executive summary, industry, products, services, pain points, strengths, weaknesses, tech stack, and finalize the list of competitors (matching their website and detail).
Remember to output ONLY valid JSON matching the system schema. Include source URL attributions from the crawled pages or search links for products, services, and pain points.`;
}
