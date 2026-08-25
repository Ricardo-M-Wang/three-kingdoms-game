import type { GeneralDef } from '../types';

// ============ 主动战法型武将 ============
const activeGenerals: GeneralDef[] = [
  {
    id: 'simayi', name: '司马懿', ranks: { atk: 'C', int: 'S', def: 'A', spd: 'C' },
    innateSkillId: 'yingshilanggu', portrait: 'simayi', skillType: 'active',
  },
  {
    id: 'guanyu', name: '关羽', ranks: { atk: 'S', int: 'C', def: 'B', spd: 'A' },
    innateSkillId: 'shuiyanqijun', portrait: 'guanyu', skillType: 'active',
  },
  {
    id: 'sunce', name: '孙策', ranks: { atk: 'S', int: 'B', def: 'A', spd: 'A' },
    innateSkillId: 'fuhaipingshan', portrait: 'sunce', skillType: 'active',
  },
  {
    id: 'zhangfei', name: '张飞', ranks: { atk: 'S', int: 'B', def: 'B', spd: 'S' },
    innateSkillId: 'jushuiduanqiao', portrait: 'zhangfei', skillType: 'active',
  },
  {
    id: 'zhangjiao', name: '张角', ranks: { atk: 'C', int: 'A', def: 'C', spd: 'B' },
    innateSkillId: 'wuleihongding', portrait: 'zhangjiao', skillType: 'active',
  },
  {
    id: 'luxun', name: '陆逊', ranks: { atk: 'B', int: 'S', def: 'S', spd: 'C' },
    innateSkillId: 'huoshaolianying', portrait: 'luxun', skillType: 'active',
  },
  {
    id: 'guojia', name: '郭嘉', ranks: { atk: 'D', int: 'S', def: 'C', spd: 'B' },
    innateSkillId: 'shishengshibai', portrait: 'guojia', skillType: 'active',
  },
];

// ============ 追击战法型武将 ============
const pursuitGenerals: GeneralDef[] = [
  {
    id: 'wenyang', name: '文鸯', ranks: { atk: 'S', int: 'D', def: 'A', spd: 'S' },
    innateSkillId: 'ziqilvli', portrait: 'wenyang', skillType: 'pursuit',
  },
  {
    id: 'huangzhong', name: '黄忠', ranks: { atk: 'A', int: 'B', def: 'B', spd: 'A' },
    innateSkillId: 'baibuchuanyang', portrait: 'huangzhong', skillType: 'pursuit',
  },
  {
    id: 'xuchu', name: '许褚', ranks: { atk: 'S', int: 'D', def: 'B', spd: 'C' },
    innateSkillId: 'zhengqing', portrait: 'xuchu', skillType: 'pursuit',
  },
  {
    id: 'ganning', name: '甘宁', ranks: { atk: 'A', int: 'C', def: 'B', spd: 'S' },
    innateSkillId: 'jieying', portrait: 'ganning', skillType: 'pursuit',
  },
];

// ============ 指挥战法型武将 ============
const commandGenerals: GeneralDef[] = [
  {
    id: 'zhanghe', name: '张郃', ranks: { atk: 'A', int: 'B', def: 'B', spd: 'A' },
    innateSkillId: 'qiaobian', portrait: 'zhanghe', skillType: 'command',
  },
  {
    id: 'caochun', name: '曹纯', ranks: { atk: 'B', int: 'C', def: 'A', spd: 'S' },
    innateSkillId: 'hubaoxiongqi', portrait: 'caochun', skillType: 'command',
  },
  {
    id: 'jiangwei', name: '姜维', ranks: { atk: 'A', int: 'A', def: 'A', spd: 'A' },
    innateSkillId: 'beifazhizhi', portrait: 'jiangwei', skillType: 'command',
  },
  {
    id: 'yuanshao', name: '袁绍', ranks: { atk: 'C', int: 'B', def: 'B', spd: 'B' },
    innateSkillId: 'haolingqunxiong', portrait: 'yuanshao', skillType: 'command',
  },
  {
    id: 'dengai', name: '邓艾', ranks: { atk: 'A', int: 'A', def: 'A', spd: 'A' },
    innateSkillId: 'qixi', portrait: 'dengai', skillType: 'command',
  },
  {
    id: 'fazheng', name: '法正', ranks: { atk: 'D', int: 'S', def: 'B', spd: 'C' },
    innateSkillId: 'yacibibao', portrait: 'fazheng', skillType: 'command',
  },
  {
    id: 'liubei', name: '刘备', ranks: { atk: 'C', int: 'A', def: 'A', spd: 'B' },
    innateSkillId: 'taoyuanjieyi', portrait: 'liubei', skillType: 'command',
  },
  {
    id: 'yuejin', name: '乐进', ranks: { atk: 'A', int: 'C', def: 'B', spd: 'S' },
    innateSkillId: 'xiandeng', portrait: 'yuejin', skillType: 'command',
  },
  {
    id: 'caoren', name: '曹仁', ranks: { atk: 'A', int: 'B', def: 'A', spd: 'C' },
    innateSkillId: 'guruojintang', portrait: 'caoren', skillType: 'command',
  },
  {
    id: 'spcaoren', name: 'SP曹仁', ranks: { atk: 'A', int: 'B', def: 'S', spd: 'C' },
    innateSkillId: 'tianrenzhiyong', portrait: 'spcaoren', skillType: 'command',
  },
  {
    id: 'gaoshun', name: '高顺', ranks: { atk: 'A', int: 'B', def: 'A', spd: 'C' },
    innateSkillId: 'xianzhenzhizhi', portrait: 'gaoshun', skillType: 'command',
  },
  {
    id: 'diaochan', name: '貂蝉', ranks: { atk: 'D', int: 'A', def: 'D', spd: 'C' },
    innateSkillId: 'biyue', portrait: 'diaochan', skillType: 'command',
  },
  {
    id: 'sunquan', name: '孙权', ranks: { atk: 'B', int: 'S', def: 'B', spd: 'B' },
    innateSkillId: 'quanyujiangdong', portrait: 'sunquan', skillType: 'command',
  },
  {
    id: 'zhouyu', name: '周瑜', ranks: { atk: 'B', int: 'S', def: 'S', spd: 'B' },
    innateSkillId: 'huoshaochibi', portrait: 'zhouyu', skillType: 'command',
  },
  {
    id: 'chengyu', name: '程昱', ranks: { atk: 'D', int: 'S', def: 'C', spd: 'B' },
    innateSkillId: 'benyu', portrait: 'chengyu', skillType: 'command',
  },
];

// ============ 被动战法型武将 ============
const passiveGenerals: GeneralDef[] = [
  {
    id: 'lvmeng', name: '吕蒙', ranks: { atk: 'A', int: 'S', def: 'A', spd: 'C' },
    innateSkillId: 'baiyidujiang', portrait: 'lvmeng', skillType: 'passive',
  },
  {
    id: 'machao', name: '马超', ranks: { atk: 'S', int: 'C', def: 'B', spd: 'S' },
    innateSkillId: 'shenweitainjiangjun', portrait: 'machao', skillType: 'passive',
  },
  {
    id: 'xiahouyuan', name: '夏侯渊', ranks: { atk: 'A', int: 'C', def: 'B', spd: 'S' },
    innateSkillId: 'shensu', portrait: 'xiahouyuan', skillType: 'passive',
  },
  {
    id: 'dianwei', name: '典韦', ranks: { atk: 'S', int: 'D', def: 'B', spd: 'C' },
    innateSkillId: 'guzhielai', portrait: 'dianwei', skillType: 'passive',
  },
  {
    id: 'zhangliao', name: '张辽', ranks: { atk: 'S', int: 'B', def: 'A', spd: 'S' },
    innateSkillId: 'weizhenxiaoyao', portrait: 'zhangliao', skillType: 'passive',
  },
  {
    id: 'zhugeliang', name: '诸葛亮', ranks: { atk: 'C', int: 'S', def: 'A', spd: 'D' },
    innateSkillId: 'kanpo', portrait: 'zhugeliang', skillType: 'passive',
  },
  {
    id: 'zhaoyun', name: '赵云', ranks: { atk: 'S', int: 'B', def: 'B', spd: 'A' },
    innateSkillId: 'qijinqichu', portrait: 'zhaoyun', skillType: 'passive',
  },
  {
    id: 'xunyu', name: '荀彧', ranks: { atk: 'D', int: 'S', def: 'D', spd: 'C' },
    innateSkillId: 'wangzuo', portrait: 'xunyu', skillType: 'passive',
  },
  {
    id: 'caocao', name: '曹操', ranks: { atk: 'B', int: 'S', def: 'S', spd: 'B' },
    innateSkillId: 'luanshixiaoxiong', portrait: 'caocao', skillType: 'passive',
  },
  {
    id: 'xiahoudun', name: '夏侯惇', ranks: { atk: 'B', int: 'C', def: 'B', spd: 'C' },
    innateSkillId: 'ganglie', portrait: 'xiahoudun', skillType: 'passive',
  },
  {
    id: 'lvbu', name: '吕布', ranks: { atk: 'S', int: 'D', def: 'A', spd: 'S' },
    innateSkillId: 'wuqian', portrait: 'lvbu', skillType: 'passive',
  },
];

// ============ 全部武将 ============
export const allGenerals: GeneralDef[] = [
  ...activeGenerals,
  ...pursuitGenerals,
  ...commandGenerals,
  ...passiveGenerals,
];

// 按战法类型分类
export const generalsByType = {
  active: activeGenerals,
  pursuit: pursuitGenerals,
  command: commandGenerals,
  passive: passiveGenerals,
};

// 按ID查找武将
export function getGeneralById(id: string): GeneralDef | undefined {
  return allGenerals.find(g => g.id === id);
}
