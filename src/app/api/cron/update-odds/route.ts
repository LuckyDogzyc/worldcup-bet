import { NextResponse } from 'next/server';
import { syncUpcomingEvents, updateOdds } from '@/lib/automation';
import { ensureInitialized } from '@/lib/init-app';

/**
 * GET /api/cron/update-odds
 *
 * Syncs upcoming events from API, then updates odds for all matches.
 * Can be called by external cron service or manually.
 *
 * Usage:
 *   curl http://localhost:3100/api/cron/update-odds
 */
export async function GET() {
  ensureInitialized();

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ODDS_API_KEY not configured',
        hint: 'Set ODDS_API_KEY in .env (get one free at the-odds-api.com)',
        status: 'not_configured',
      },
      { status: 400 }
    );
  }

  try {
    // Step 1: Sync new upcoming events from API
    const syncResult = await syncUpcomingEvents(apiKey);

    // Step 2: Update odds for all upcoming matches
    const oddsResult = await updateOdds(apiKey);

    return NextResponse.json({
      success: true,
      sync: {
        new_matches: syncResult.synced,
        skipped: syncResult.skipped,
        errors: syncResult.errors,
      },
      odds: {
        updated_options: oddsResult.updated,
        errors: oddsResult.errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update odds error:', error);
    return NextResponse.json(
      { error: 'Sync/update failed', detail: String(error) },
      { status: 500 }
    );
  }
}
