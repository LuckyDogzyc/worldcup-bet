export type TeamVisualKind = 'flag' | 'crest' | 'fallback';

export interface TeamVisual {
  kind: TeamVisualKind;
  value: string;
  label: string;
}

export const settlementBasisText = '所有足球盘口均按常规90分钟加伤停补时的官方比分结算，不包含加时赛和点球大战。决赛如果90分钟打平，即胜负盘的平局赢；让球和大小2.5球也只看90分钟加伤停补时内的比分。';

const FLAG_MAP: Record<string, string> = {
  '乌兹别克斯坦': '🇺🇿',
  '乌拉圭': '🇺🇾',
  '伊拉克': '🇮🇶',
  '伊朗': '🇮🇷',
  '佛得角': '🇨🇻',
  '克罗地亚': '🇭🇷',
  '刚果民主共和国': '🇨🇩',
  '刚果（金）': '🇨🇩',
  '加拿大': '🇨🇦',
  '加纳': '🇬🇭',
  '南非': '🇿🇦',
  '卡塔尔': '🇶🇦',
  '厄瓜多尔': '🇪🇨',
  '哥伦比亚': '🇨🇴',
  '土耳其': '🇹🇷',
  '埃及': '🇪🇬',
  '塞内加尔': '🇸🇳',
  '墨西哥': '🇲🇽',
  '奥地利': '🇦🇹',
  '巴拉圭': '🇵🇾',
  '巴拿马': '🇵🇦',
  '巴西': '🇧🇷',
  '库拉索': '🇨🇼',
  '德国': '🇩🇪',
  '挪威': '🇳🇴',
  '捷克': '🇨🇿',
  '摩洛哥': '🇲🇦',
  '新西兰': '🇳🇿',
  '日本': '🇯🇵',
  '比利时': '🇧🇪',
  '沙特': '🇸🇦',
  '法国': '🇫🇷',
  '波斯尼亚和黑塞哥维那': '🇧🇦',
  '波黑': '🇧🇦',
  '海地': '🇭🇹',
  '澳大利亚': '🇦🇺',
  '瑞典': '🇸🇪',
  '瑞士': '🇨🇭',
  '科特迪瓦': '🇨🇮',
  '突尼斯': '🇹🇳',
  '约旦': '🇯🇴',
  '美国': '🇺🇸',
  '苏格兰': '🏴',
  '英格兰': '🏴',
  '荷兰': '🇳🇱',
  '葡萄牙': '🇵🇹',
  '西班牙': '🇪🇸',
  '阿尔及利亚': '🇩🇿',
  '阿根廷': '🇦🇷',
  '韩国': '🇰🇷',
};

const CREST_MAP: Record<string, string> = {
  '巴黎圣日耳曼': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  '阿森纳': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  '皇家马德里': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  '拜仁慕尼黑': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/FC_Bayern_München_logo_%282017%29.svg',
  '曼城': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  '巴塞罗那': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  '国际米兰': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
};

export function getTeamVisual(teamName: string): TeamVisual {
  const normalized = teamName.trim();
  const crest = CREST_MAP[normalized];
  if (crest) return { kind: 'crest', value: crest, label: normalized + ' 队徽' };

  const flag = FLAG_MAP[normalized];
  if (flag) return { kind: 'flag', value: flag, label: normalized + ' 国旗' };

  return { kind: 'fallback', value: normalized.slice(0, 2) || '?', label: normalized + ' 标识' };
}
