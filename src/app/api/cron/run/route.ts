import { NextResponse } from 'next/server';
import { runAllAutomation } from '@/lib/automation';
import { ensureInitialized } from '@/lib/init-app';

/**
 * GET /api/cron/run
 *
 * Runs full automation: sync events → update odds → auto-settle.
 * Protected by CRON_SECRET query param (if set in env).
 *
 * Usage:
 *   curl "http://localhost:3100/api/cron/run?secret=YOUR_CRON_SECRET"
 *   curl "http://localhost:3100/api/cron/run"  (if CRON_SECRET not set)
 */
export async function GET(request: Request) {
  ensureInitialized();

  // Check CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const { searchParams } = new URL(request.url);
    const provided = searchParams.get('secret');
    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid or missing secret' },
        { status: 401 }
      );
    }
  }

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ODDS_API_KEY not configured',
        hint: 'Set ODDS_API_KEY in .env (get one free at the-odds-api.com)',
      },
      { status: 400 }
    );
  }

  try {
    const result = await runAllAutomation(apiKey);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/run] Automation error:', error);
    return NextResponse.json(
      { error: 'Automation run failed', detail: String(error) },
      { status: 500 }
    );
  }
}
