import assert from 'node:assert/strict';
import { getTeamVisual, settlementBasisText } from '../src/lib/teamVisuals';

assert.equal(getTeamVisual('墨西哥').kind, 'flag');
assert.equal(getTeamVisual('墨西哥').value, '🇲🇽');
assert.equal(getTeamVisual('波黑').value, '🇧🇦');
assert.equal(getTeamVisual('波斯尼亚和黑塞哥维那').value, '🇧🇦');
assert.equal(getTeamVisual('巴黎圣日耳曼').kind, 'crest');
assert.match(getTeamVisual('巴黎圣日耳曼').value, /Paris_Saint-Germain/);
assert.equal(getTeamVisual('未知球队').kind, 'fallback');
assert.equal(settlementBasisText.includes('常规90分钟'), true);
assert.equal(settlementBasisText.includes('不包含加时赛'), true);
assert.equal(settlementBasisText.includes('点球大战'), true);

console.log('team visuals and settlement basis checks passed');
