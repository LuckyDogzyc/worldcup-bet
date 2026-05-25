/**
 * Shared utilities for the World Cup betting app.
 * All labels are in Chinese; odds helpers convert API price (0–1) to display values.
 */

/**
 * Converts an API price (0–1 probability) to a decimal odds multiplier.
 * Returns 0 if the price is invalid (≤ 0).
 */
export function priceToOdds(price: number): number {
  if (price <= 0) return 0;
  return 1 / price;
}

/**
 * Returns a formatted odds string like "2.50倍" from an API price.
 */
export function formatOdds(price: number): string {
  const odds = priceToOdds(price);
  if (odds === 0) return '0.00倍';
  return `${odds.toFixed(2)}倍`;
}

/**
 * Maps a market type key to its Chinese label.
 */
export function getMarketLabel(marketType: string): string {
  switch (marketType) {
    case '1x2':
      return '胜负';
    case 'ou25':
      return '大小2.5球';
    case 'cs':
      return '正确比分';
    default:
      return marketType;
  }
}

/**
 * Maps a result key to its Chinese label.
 */
export function getResultLabel(result: string): string {
  switch (result) {
    case 'home':
      return '主胜';
    case 'draw':
      return '平局';
    case 'away':
      return '客胜';
    case 'over':
      return '大于2.5球';
    case 'under':
      return '小于2.5球';
    default:
      return result;
  }
}

/**
 * Maps a match status key to its Chinese label.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'upcoming':
      return '未开始';
    case 'live':
      return '进行中';
    case 'finished':
      return '已结束';
    default:
      return status;
  }
}

/**
 * Returns a Tailwind text-color class based on the API price.
 * Higher price → lower odds (favorite) → green.
 * Lower price → higher odds (underdog) → red.
 */
export function oddsColor(price: number): string {
  if (price <= 0) return 'text-gray-400';
  if (price >= 0.6) return 'text-green-400';
  if (price >= 0.35) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Formats an ISO date string to 'MM月DD日 HH:mm' (Chinese-style date/time).
 * Returns '时间待定' if the input cannot be parsed.
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '时间待定';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}
