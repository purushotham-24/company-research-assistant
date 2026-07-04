# AI Company Research Assistant 📊🤖

A production-ready, high-performance web application designed to research companies by name or website URL. It crawls company websites, scans internet sources via Serper.dev, runs advanced AI reasoning via OpenRouter, discovers competitors, renders findings in a sleek ChatGPT-style dark mode interface, compiles details into a professional PDF, and automatically uploads the report to a Discord channel.

This application is built for the **Relu Consultancy AI & Automation Developer Hiring Hackathon**.

---

## Key Features

- **Double Input Resolution:** Submit either a Company Name (e.g. *Stripe*) or a Website URL (e.g. *https://stripe.com*).
- **Intelligent Website Crawling:** A custom recursive Cheerio + Axios crawler scans key company pages (About, Products, Pricing, Services, etc.) and ignores duplicates, accounts, legal text, and dashboard portals.
- **Multi-Query Competitor Discovery:** Serper.dev performs parallel queries to extract, count, and deduplicate real market competitors.
- **Streaming AI Analysis:** OpenRouter integrates with any model (Gemini, Claude, GPT-4, Llama, DeepSeek) to stream insights chunk-by-chunk in real time.
- **Ratelimiting & 15-Minute Server Caching:** Dedupes concurrent requests and caches search/crawl results in memory for 15 minutes to reduce API credit usage.
- **Professional PDF Builder:** Generates an styled multi-page PDF on the client-side with logos, tables, sources, footers, and page numbers using `jspdf` and `jspdf-autotable`.
- **Discord Bot Automation:** Uploads applicant details and the generated PDF report to a target Discord channel using multipart file attachment API.
- **Local Storage Settings Sync:** Remembers your applicant details, API keys, selected model, and history locally.
- **Error Recovery:** Handles invalid URLs, crawler blocks, SSL warnings, API timeouts, and failure states gracefully with fallback UI states.

---

## Architecture Diagram

```
                              [ User UI Input ]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
      [ Settings Sidebar ]                           [ Main Chat Dashboard ]
    ┌────────────────────┐                          ┌───────────────────────┐
    │ API Keys           │                          │ Live Timeline Stepper │
    │ Model Selector     │                          │ SSE Typing Text Area  │
    │ Discord Bot Config │                          │ Report Details Card   │
    └─────────┬──────────┘                          └───────────┬───────────┘
              │                                                 │
              └───────────────► [ Next.js API Routes ] ◄────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   [ /api/research ]             [ /api/crawl ]               [ /api/discord ]
     (SSE Stream)              (Standalone Crawl)             (PDF Bot Upload)
           │                            │                            │
           ├─► Server-Side Cache        └─► Custom Crawler           └─► Discord Bot API
           ├─► Serper.dev Search
           ├─► Custom Website Crawl
           └─► OpenRouter AI Stream
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Edge Compatible API routes)
- **Styling:** Tailwind CSS (v4) & Framer Motion
- **Core Integrations:** Serper.dev API, OpenRouter AI, Discord Webhook/Bot API
- **PDF Engine:** jsPDF & jsPDF-AutoTable
- **Scraper Engine:** Axios & Cheerio

---

## Setup & Installation

### Prerequisites

- Node.js 18+ installed on your system.
- NPM, Yarn, or PNPM package managers.

### 1. Clone & Install Dependencies

```bash
# Navigate into the project folder
cd company-research-assistant

# Install npm packages
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory by copying the `.env.example`:

```bash
cp .env.example .env.local
```

Populate the following values (Optional, keys can also be configured dynamically in the UI):

```env
OPENROUTER_API_KEY=your_openrouter_api_key
SERPER_API_KEY=your_serper_api_key
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_discord_channel_id
```

---

## Running Locally

To launch the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Deployment (Vercel Ready)

The project is fully stateless and compatible with Vercel edge routes. To deploy to Vercel, run the following command from the root folder:

```bash
# Install vercel cli if missing
npm install -g vercel

# Deploy
vercel
```

Make sure to configure the Environment Variables (`OPENROUTER_API_KEY`, `SERPER_API_KEY`, etc.) inside your Vercel project dashboard settings.
