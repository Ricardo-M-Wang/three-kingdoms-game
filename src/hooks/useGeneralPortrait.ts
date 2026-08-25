// 阵营定义
export interface FactionInfo {
  id: string;
  name: string;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  pattern: string;      // CSS pattern class
  emblem: string;       // 阵营徽记
  frameGradient: string;
  glowColor: string;
}

export const FACTIONS: Record<string, FactionInfo> = {
  wei: {
    id: 'wei', name: '魏',
    bgGradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a5c 40%, #0d2137 100%)',
    textColor: '#7eb8da',
    accentColor: '#4a90d9',
    borderColor: '#2a5a8a',
    pattern: 'faction-wei',
    emblem: '魏',
    frameGradient: 'linear-gradient(180deg, #3a6a9a, #1a3a5c, #3a6a9a)',
    glowColor: 'rgba(74,144,217,0.4)',
  },
  shu: {
    id: 'shu', name: '蜀',
    bgGradient: 'linear-gradient(135deg, #0a1a0a 0%, #1a4a1a 40%, #0d2a0d 100%)',
    textColor: '#7ecb8a',
    accentColor: '#4aaf5c',
    borderColor: '#2a6a3a',
    pattern: 'faction-shu',
    emblem: '蜀',
    frameGradient: 'linear-gradient(180deg, #3a7a4a, #1a4a2a, #3a7a4a)',
    glowColor: 'rgba(74,175,92,0.4)',
  },
  wu: {
    id: 'wu', name: '吴',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #5a1a1a 40%, #2a0d0d 100%)',
    textColor: '#e08070',
    accentColor: '#c44a3a',
    borderColor: '#8a2a2a',
    pattern: 'faction-wu',
    emblem: '吴',
    frameGradient: 'linear-gradient(180deg, #8a3a2a, #5a1a1a, #8a3a2a)',
    glowColor: 'rgba(196,74,58,0.4)',
  },
  qun: {
    id: 'qun', name: '群',
    bgGradient: 'linear-gradient(135deg, #1a1008 0%, #4a3020 40%, #2a1808 100%)',
    textColor: '#d4a060',
    accentColor: '#b88040',
    borderColor: '#6a4020',
    pattern: 'faction-qun',
    emblem: '群',
    frameGradient: 'linear-gradient(180deg, #7a5030, #4a3020, #7a5030)',
    glowColor: 'rgba(184,128,64,0.4)',
  },
};

// 武将阵营映射
export const GENERAL_FACTION: Record<string, string> = {
  dianwei: 'wei', xiahoudun: 'wei', xuchu: 'wei', caocao: 'wei',
  caoren: 'wei', spcaoren: 'wei', caochun: 'wei', zhanghe: 'wei', zhangliao: 'wei',
  yuejin: 'wei', xunyu: 'wei', chengyu: 'wei', guojia: 'wei', simayi: 'wei', dengai: 'wei',
  guanyu: 'shu', zhangfei: 'shu', zhaoyun: 'shu', machao: 'shu',
  huangzhong: 'shu', zhugeliang: 'shu', liubei: 'shu', jiangwei: 'shu',
  fazheng: 'shu', xiahouyuan: 'wei',
  sunce: 'wu', sunquan: 'wu', zhouyu: 'wu', luxun: 'wu', ganning: 'wu', lvmeng: 'wu',
  gaoshun: 'qun', lvbu: 'qun', diaochan: 'qun', zhangjiao: 'qun',
  yuanshao: 'qun', wenyang: 'qun',
};

// 武将历史称号（用于立绘副标题）
export const GENERAL_TITLES: Record<string, string> = {
  caocao: '乱世枭雄', liubei: '仁德之君', sunquan: '碧眼紫髯',
  guanyu: '义薄云天', zhangfei: '万夫莫敌', zhaoyun: '一身是胆',
  machao: '锦马超', huangzhong: '老当益壮', zhugeliang: '卧龙',
  jiangwei: '天水麒麟', lvbu: '飞将', diaochan: '闭月羞花',
  zhouyu: '美周郎', luxun: '书生拜将', simayi: '冢虎',
  zhangjiao: '大贤良师', dianwei: '古之恶来', xuchu: '虎痴',
  zhangliao: '威震逍遥', zhanghe: '巧变良将', sunce: '小霸王',
  yuanshao: '四世三公', fazheng: '奇画策士', ganning: '锦帆贼',
  xunyu: '王佐之才', guojia: '十胜十败', yuejin: '先登勇将', caoren: '固若金汤', spcaoren: '天人之勇',
  gaoshun: '陷阵之志', xiahoudun: '刚烈不屈', xiahouyuan: '神速',
  wenyang: '姿器膂力', dengai: '奇袭名将', caochun: '虎豹统领',
  lvmeng: '克己', chengyu: '贲育',
};

export function useGeneralPortrait(generalId: string) {
  const factionId = GENERAL_FACTION[generalId] ?? 'qun';
  const faction = FACTIONS[factionId] ?? FACTIONS.qun;
  const title = GENERAL_TITLES[generalId] ?? '';
  return { faction, title, factionId };
}
