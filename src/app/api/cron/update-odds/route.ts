import { NextResponse } from 'next/server';
import { updateOddsFromAPI, getOddsApiStatus } from '@/lib/odds';
import { ensureInitialized } from '@/lib/init-app';

// 这个接口可以被外部 cron 服务每分钟调用
// 也可以手动触发: curl http://localhost:3100/api/cron/update-odds
export async function GET() {
  ensureInitialized();

  const status = getOddsApiStatus();
  if (!status.configured) {
    return NextResponse.json({
      error: 'ODDS_API_KEY 未配置',
      hint: '在 .env 或环境变量中设置 ODDS_API_KEY（从 the-odds-api.com 免费获取）',
      status: 'not_configured',
    }, { status: 400 });
  }

  try {
    const result = await updateOddsFromAPI(process.env.ODDS_API_KEY!);
    return NextResponse.json({
      success: true,
      updated_options: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update odds error:', error);
    return NextResponse.json(
      { error: '更新赔率失败', detail: String(error) },
      { status: 500 }
    );
  }
}
