import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createHmac } from 'crypto';
import https from 'https';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, volnynUserId, timestamp, callbackUrl, signature, context } = await req.json();

    if (!imageUrl || !volnynUserId || !timestamp || !callbackUrl || !signature || !context) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const secret = process.env.LOGOAI_SHARED_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, message: 'Server misconfigured' }, { status: 500 });
    }

    // Verify the HMAC signature (includes context to prevent tampering)
    const expectedSignature = createHmac('sha256', secret)
      .update(`${volnynUserId}|${timestamp}|${callbackUrl}|${context}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 403 });
    }

    // Check token expiry (30 minutes)
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 1800) {
      return NextResponse.json({ success: false, message: 'Token expired' }, { status: 403 });
    }

    // Read the image file from public/logos/
    let imageBase64: string;

    if (imageUrl.startsWith('/logos/')) {
      const filePath = join(process.cwd(), 'public', imageUrl);
      const fileBuffer = await readFile(filePath);
      imageBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`;
    } else if (imageUrl.startsWith('data:')) {
      imageBase64 = imageUrl;
    } else {
      return NextResponse.json({ success: false, message: 'Invalid image URL format' }, { status: 400 });
    }

    // POST the image to Volnyn's webhook endpoint
    // Use custom agent to allow self-signed certs in local development
    const payload = JSON.stringify({
      user_id: volnynUserId,
      timestamp,
      callback_url: callbackUrl,
      signature,
      image_data: imageBase64,
      context,
    });

    const volnynData = await new Promise<{ success: boolean; redirect_url?: string; message?: string }>((resolve, reject) => {
      const url = new URL(callbackUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        rejectUnauthorized: false, // Allow self-signed certs for local dev
      };

      const protocol = url.protocol === 'https:' ? https : require('http');
      const request = protocol.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON response from Volnyn: ${data}`));
          }
        });
      });

      request.on('error', (err: Error) => reject(err));
      request.write(payload);
      request.end();
    });

    if (!volnynData.success) {
      return NextResponse.json(
        { success: false, message: volnynData.message || 'Volnyn webhook failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      redirect_url: volnynData.redirect_url,
    });
  } catch (error) {
    console.error('[volnyn-image-webhook] Error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
