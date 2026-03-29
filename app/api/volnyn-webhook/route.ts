import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createHmac } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { logoUrl, volnynUserId, timestamp, callbackUrl, signature } = await req.json();

    if (!logoUrl || !volnynUserId || !timestamp || !callbackUrl || !signature) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const secret = process.env.LOGOAI_SHARED_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });
    }

    // Verify the HMAC signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${volnynUserId}|${timestamp}|${callbackUrl}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
    }

    // Check token expiry (30 minutes)
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 1800) {
      return NextResponse.json({ success: false, message: 'Token expired' }, { status: 403 });
    }

    // Read the logo file from public/logos/
    let logoBase64: string;

    if (logoUrl.startsWith('/logos/')) {
      const filePath = join(process.cwd(), 'public', logoUrl);
      const fileBuffer = await readFile(filePath);
      logoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
    } else if (logoUrl.startsWith('data:')) {
      logoBase64 = logoUrl;
    } else {
      return NextResponse.json({ success: false, message: 'Invalid logo URL format' }, { status: 400 });
    }

    // POST the logo to Volnyn's webhook endpoint
    const volnynResponse = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: volnynUserId,
        timestamp,
        callback_url: callbackUrl,
        signature,
        logo_data: logoBase64,
      }),
    });

    const volnynData = await volnynResponse.json();

    if (!volnynResponse.ok || !volnynData.success) {
      return NextResponse.json(
        { success: false, message: volnynData.message || 'Volnyn webhook failed' },
        { status: volnynResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      redirect_url: volnynData.redirect_url,
    });
  } catch (error) {
    console.error('[volnyn-webhook] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
