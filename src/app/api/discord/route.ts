import { NextRequest, NextResponse } from 'next/server';
import { sendReportToDiscord } from '@/lib/discord';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      botToken,
      channelId,
      applicantName,
      applicantEmail,
      companyName,
      companyWebsite,
      pdfBase64,
    } = body;

    // Use environment fallback if client values are not passed
    const activeBotToken = botToken || process.env.DISCORD_BOT_TOKEN;
    const activeChannelId = channelId || process.env.DISCORD_CHANNEL_ID;

    if (!activeBotToken || !activeChannelId) {
      return NextResponse.json(
        { success: false, error: 'Discord Bot Token or Channel ID is missing.' },
        { status: 400 }
      );
    }

    if (!companyName || !pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'Company Name and PDF Base64 string are required.' },
        { status: 400 }
      );
    }

    const success = await sendReportToDiscord({
      botToken: activeBotToken,
      channelId: activeChannelId,
      applicantName: applicantName || 'Not Provided',
      applicantEmail: applicantEmail || 'Not Provided',
      companyName,
      companyWebsite: companyWebsite || 'Not Provided',
      pdfBase64,
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'PDF report successfully sent to Discord!' });
    } else {
      return NextResponse.json({ success: false, error: 'Discord API upload failed.' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[Discord API Endpoint] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
