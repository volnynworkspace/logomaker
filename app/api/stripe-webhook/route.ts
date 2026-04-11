import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not defined');
  return new Stripe(key, { apiVersion: '2025-10-29.clover' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = (await headers()).get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err instanceof Error
        ? err
        : new Error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const credits = session.metadata?.credits;

      if (!userId || !credits) {
        return NextResponse.json(
          { error: 'Missing required metadata' },
          { status: 400 }
        );
      }

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: parseInt(credits, 10) } },
        });

        return NextResponse.json({ received: true });
      } catch (error) {
        const updateError = error instanceof Error
          ? new Error(`Failed to update user credits: ${error.message}`)
          : new Error('Failed to update user credits');
        updateError.cause = error;
        return NextResponse.json(
          { error: 'Failed to update credits' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const webhookError = error instanceof Error
      ? new Error(`Webhook handler failed: ${error.message}`)
      : new Error('Webhook handler failed');
    webhookError.cause = error;
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
