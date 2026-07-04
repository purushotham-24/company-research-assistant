import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite } from '@/lib/crawler';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'A valid URL is required.' },
        { status: 400 }
      );
    }

    const crawlResult = await crawlWebsite(url);
    
    return NextResponse.json({
      success: true,
      pagesCount: crawlResult.pages.length,
      phone: crawlResult.phone,
      address: crawlResult.address,
      emails: crawlResult.emails,
      socialLinks: crawlResult.socialLinks,
      pages: crawlResult.pages,
    });
  } catch (err: any) {
    console.error('[Crawl API Route] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
