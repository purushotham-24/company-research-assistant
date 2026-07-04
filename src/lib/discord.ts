export interface DiscordPostParams {
  botToken: string;
  channelId: string;
  applicantName: string;
  applicantEmail: string;
  companyName: string;
  companyWebsite: string;
  pdfBase64: string; // Base64 encoded PDF string
}

export async function sendReportToDiscord(params: DiscordPostParams): Promise<boolean> {
  const { botToken, channelId, applicantName, applicantEmail, companyName, companyWebsite, pdfBase64 } = params;

  if (!botToken || !channelId) {
    console.warn('[Discord] Bot token or channel ID missing. Skipping upload.');
    return false;
  }

  try {
    console.log(`[Discord] Uploading research report for ${companyName} to channel ${channelId}`);

    // Convert Base64 PDF back to a Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Create multipart/form-data payload
    const formData = new FormData();
    
    // Content message
    const messageContent = {
      content: `📊 **New AI Company Research Report Generated!**\n\n**Applicant Details:**\n👤 **Name:** ${applicantName || 'Not configured'}\n📧 **Email:** ${applicantEmail || 'Not configured'}\n\n**Research Details:**\n🏢 **Company:** ${companyName}\n🌐 **Website:** ${companyWebsite}\n🕒 **Timestamp:** ${new Date().toLocaleString()}`,
    };

    formData.append('payload_json', JSON.stringify(messageContent));
    
    // Create File blob from buffer
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const filename = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-research-report.pdf`;
    
    formData.append('files[0]', pdfBlob, filename);

    // Call Discord API
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Discord] API upload failed (${response.status}):`, errorText);
      return false;
    }

    console.log('[Discord] PDF report uploaded successfully!');
    return true;
  } catch (err: any) {
    console.error('[Discord] Error posting to Discord channel:', err.message || err);
    return false;
  }
}
