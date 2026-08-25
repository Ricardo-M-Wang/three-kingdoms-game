import type { SkillDef } from '../types';

// ============ 武将自带战法 ============
export const innateSkills: SkillDef[] = [
  // ---- 主动战法 ----
  {
    id: 'yingshilanggu', name: '鹰视狼顾', type: 'active', activationRate: 100,
    description: '对敌方两人造成10%+回合数×40%智力伤害。每回合结束时，提升自身10%智力，5%暴击率',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 0.1, target: 'enemy_two' }],
    triggerCondition: { type: 'on_turn' },
  },
  {
    id: 'shishengshibai', name: '十胜十败', type: 'active', activationRate: 60,
    description: '对敌方单体造成400%智力伤害。若暴击则再次发动(每回合限3次)',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 4.0, target: 'enemy_single' }],
    triggerCondition: { type: 'on_turn' },
  },
  {
    id: 'shuiyanqijun', name: '水淹七军', type: 'active', activationRate: 40,
    description: '准备一回合，对敌方全体施加洪水并造成360%武力伤害。若目标已持有洪水则额外造成200%武力附加伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 3.6, target: 'enemy_all' }],
    needsPreparation: true,
  },
  {
    id: 'fuhaipingshan', name: '覆海平山', type: 'active', activationRate: 70,
    description: '对敌方全体造成140%武力伤害。第三次及后续倍率提升40%。第四次及后续使目标受到武力伤害+30%。第五次及后续破甲提升40%',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 1.4, target: 'enemy_all' }],
  },
  {
    id: 'jushuiduanqiao', name: '据水断桥', type: 'active', activationRate: 50,
    description: '对敌方全体施加畏惧(持续1回合)并造成180%武力伤害。若敌方有洪水则无视40%防御',
    effects: [
      { type: 'debuff', debuffId: 'fear', duration: 1, target: 'enemy_all' },
      { type: 'damage', damageType: 'physical', multiplier: 1.8, target: 'enemy_all' },
    ],
  },
  {
    id: 'wuleihongding', name: '五雷轰顶', type: 'active', activationRate: 50,
    description: '准备一回合，对敌方随机目标造成5次180%智力伤害。若目标有洪水则伤害提升50%',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 1.8, target: 'enemy_random' }],
    needsPreparation: true,
  },
  {
    id: 'huoshaolianying', name: '火烧连营', type: 'active', activationRate: 60,
    description: '对敌方全体造成280%智力伤害，结算目标灼烧伤害(不清除层数)',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 2.8, target: 'enemy_all' }],
  },

  // ---- 追击战法 ----
  {
    id: 'ziqilvli', name: '姿器膂力', type: 'pursuit', activationRate: 50,
    description: '普攻后随机获得一种功能性增益(优先未拥有)，随后对目标造成380%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 3.8, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'baibuchuanyang', name: '百步穿杨', type: 'pursuit', activationRate: 50,
    description: '普攻后提升20%暴击率(可叠加，上限100%)，对目标造成360%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 3.6, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'zhengqing', name: '争擎', type: 'pursuit', activationRate: 100,
    description: '普攻后目标和自身防御均降低20(每回合结束时重置)，对目标造成240%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 2.0, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'jieying', name: '劫营', type: 'pursuit', activationRate: 40,
    description: '普攻后对目标造成400%武力伤害并施加断粮(降低回复效果70%)',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 4.0, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },

  // ---- 指挥战法 ----
  {
    id: 'qiaobian', name: '巧变', type: 'command', activationRate: 0,
    description: '我方任意武将每次获得功能性增益时，令其额外获得一种(每回合限1次)',
    effects: [], triggerCondition: { type: 'on_ally_gain_buff' }, maxTriggersPerRound: 1,
  },
  {
    id: 'hubaoxiongqi', name: '虎豹骑', type: 'command', activationRate: 0,
    description: '前三回合我方全体武力+20、速度+20、增伤+30%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'beifazhizhi', name: '北伐之志', type: 'command', activationRate: 0,
    description: '我方全体造成非普攻伤害后，姜维对目标造成100%武力+100%智力伤害(每回合限3次)',
    effects: [], triggerCondition: { type: 'on_ally_skill' }, maxTriggersPerRound: 3,
  },
  {
    id: 'haolingqunxiong', name: '号令群雄', type: 'command', activationRate: 0,
    description: '自身行动时，令我方智力最高单体对敌方全体造成90%智力伤害，令我方武力最高单体对敌方全体造成90%武力伤害',
    effects: [], triggerCondition: { type: 'on_turn' },
  },
  {
    id: 'qixi', name: '奇袭', type: 'command', activationRate: 0,
    description: '战斗开始时对敌方全体施加4层奇袭。每回合开始时对敌方两人造成200%武力伤害(奇袭:受到邓艾伤害时必定暴击，每次消耗1层)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'yacibibao', name: '睚眦必报', type: 'command', activationRate: 0,
    description: '我方全体武将释放准备战法时50%概率令其跳过准备回合直接释放(每回合上限2次)',
    effects: [], triggerCondition: { type: 'on_ally_prepare_skill' }, maxTriggersPerRound: 2,
  },
  {
    id: 'taoyuanjieyi', name: '桃园结义', type: 'command', activationRate: 0,
    description: '战斗开始时我方全体统帅+20。每回合结束时回复我方全体100%智力生命，为生命最低武将额外回复50%智力生命',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'xiandeng', name: '先登', type: 'command', activationRate: 0,
    description: '战斗开始时提升我方全体40速度。我方速度最高武将增伤+20%、减伤+20%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'guruojintang', name: '固若金汤', type: 'command', activationRate: 0,
    description: '前三回合敌方全体造成伤害降低40%。第四回合开始我方全体最高属性+10%、增伤+20%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'xianzhenzhizhi', name: '陷阵之志', type: 'command', activationRate: 0,
    description: '战斗开始为敌方全体施加10层弱点，我方全体减伤+60%，场上每消耗1层弱点我方减伤降低3%(弱点:受到普攻时消耗1层且全属性-3%，每消耗5层陷入震慑)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'biyue', name: '闭月', type: 'command', activationRate: 0,
    description: '每回合开始时令我方武力最高单体获得连击和骁勇(持续1回合)。骁勇:每次普攻后提升5武力(上限20层)',
    effects: [], triggerCondition: { type: 'round_start' },
  },
  {
    id: 'quanyujiangdong', name: '权御江东', type: 'command', activationRate: 0,
    description: '我方每回合首次释放主动战法时:奇数回合回复我方全体120%智力生命，偶数回合令其额外释放一次主动战法(上限一次)',
    effects: [], triggerCondition: { type: 'on_ally_skill' },
  },
  {
    id: 'huoshaochibi', name: '火烧赤壁', type: 'command', activationRate: 60,
    description: '我方任意武将释放主动战法后，周瑜60%概率对敌方全体造成80%智力伤害并施加1层灼烧(持续2回合)。每触发一次概率下降10%，每回合重置。每回合上限3次',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 0.8, target: 'enemy_all' }],
    triggerCondition: { type: 'on_ally_skill' }, maxTriggersPerRound: 3,
  },
  {
    id: 'benyu', name: '贲育', type: 'command', activationRate: 0,
    description: '我方任意武将造成暴击伤害时，自身回复我方全体40%智力生命。敌方任意武将受到暴击伤害时，使其获得1层〔伏兵〕(每回合限3次)。〔伏兵〕:受到智力伤害提升10%，受到暴击伤害后消耗一层',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'tianrenzhiyong', name: '天人之勇', type: 'command', activationRate: 0,
    description: '敌方任意武将释放主动战法时，我方全体武将减伤提升10%(持续至回合结束)。敌方任意武将普攻时，我方全体武将增伤提升10%(持续至回合结束)。以上任意效果触发时，60%概率对敌方全体武将造成250%统帅伤害(每回合限4次)',
    effects: [], triggerCondition: { type: 'battle_start' }, maxTriggersPerRound: 4,
  },

  // ---- 被动战法 ----
  {
    id: 'baiyidujiang', name: '白衣渡江', type: 'passive', activationRate: 0,
    description: '每次受到伤害获得一层〔谋断〕。自身普攻后100%概率消耗一层〔谋断〕对敌方单体造成210%智力伤害，触发后可重复判定，每触发一次概率降低20%。〔谋断〕:自身智力提升10，统帅提升5，上限10层',
    effects: [], triggerCondition: { type: 'on_damage_taken' },
  },
  {
    id: 'shenweitainjiangjun', name: '神威天将军', type: 'passive', activationRate: 0,
    description: '每次普攻后速度提升5%。马超造成的追击伤害额外提升(双方速度差×100%，上限100%)',
    effects: [], triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'shensu', name: '神速', type: 'passive', activationRate: 0,
    description: '每回合开始时武力提升当前速度的25%(回合结束时重置)。对敌方全体造成120%武力伤害，对速度低于自身的武将伤害提升30%',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 1.2, target: 'enemy_all' }],
    triggerCondition: { type: 'round_start' },
  },
  {
    id: 'guzhielai', name: '古之恶来', type: 'passive', activationRate: 0,
    description: '战斗开始时统帅+40。受到普攻时获得1层恶来并反击(每回合上限5次)。恶来:武力+5、反击伤害+20%(上限5层)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'weizhenxiaoyao', name: '威震逍遥', type: 'passive', activationRate: 0,
    description: '回合开始时降低敌方全体5%统帅。自身行动时对敌方统帅最低单体造成260%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 2.6, target: 'enemy_lowest_def' }],
    triggerCondition: { type: 'on_turn' },
  },
  {
    id: 'kanpo', name: '看破', type: 'passive', activationRate: 0,
    description: '敌方任意武将释放主动战法时，诸葛亮对其造成200%智力伤害并有50%概率施加技穷(持续1回合)。每回合限3次',
    effects: [], triggerCondition: { type: 'on_enemy_skill' }, maxTriggersPerRound: 3,
  },
  {
    id: 'qijinqichu', name: '七进七出', type: 'passive', activationRate: 0,
    description: '规避率+40%。成功规避后对敌方两名武将造成80%武力伤害。每回合规避上限7次',
    effects: [], triggerCondition: { type: 'on_dodge' },
  },
  {
    id: 'wangzuo', name: '王佐', type: 'passive', activationRate: 0,
    description: '战斗开始时，我方智力最高武将暴击率+40%、暴击伤害+40%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'luanshixiaoxiong', name: '乱世枭雄', type: 'passive', activationRate: 0,
    description: '我方全体减伤+15%。首回合为我方全体施加1层归心，每回合结束时为我方生命最低武将施加1层归心。归心:受到高于当前生命10%的伤害时消耗一层并使本次伤害降低70%(最多两层)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'ganglie', name: '刚烈', type: 'passive', activationRate: 0,
    description: '受到伤害时对目标反击(100%武力+100%防御)，并使目标增伤降低10%(可叠加上限4层)。每回合最多4次',
    effects: [], triggerCondition: { type: 'on_damage_taken' },
  },
  {
    id: 'wuqian', name: '无前', type: 'passive', activationRate: 0,
    description: '敌方武将即将行动时若吕布武力高于对方则立即对目标普攻一次(每回合限3次)',
    effects: [], triggerCondition: { type: 'on_enemy_about_to_act' },
  },
];

// ============ 通用战法 ============
export const generalSkills: SkillDef[] = [
  // ---- 指挥战法 ----
  {
    id: 'biqiruizhi', name: '避其锐气', type: 'command', activationRate: 0,
    description: '前四回合，我方全体武将减伤提升20%',
    effects: [{ type: 'buff', buffId: 'biqi_dmg_reduction', target: 'ally_all', duration: 4 }],
    triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'bubuweijing', name: '步步为营', type: 'command', activationRate: 0,
    description: '每回合开始时，我方全体武将减伤提升5%(上限30%)',
    effects: [{ type: 'buff', buffId: 'bubu_dmg_reduction', target: 'ally_all', duration: 99 }],
    triggerCondition: { type: 'round_start' },
  },
  {
    id: 'duangeduofeng', name: '断戈夺锋', type: 'command', activationRate: 0,
    description: '前三回合，敌方全体增伤降低35%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'xushidaifa', name: '蓄势待发', type: 'command', activationRate: 0,
    description: '每回合开始时，我方全体武将增伤提升8%',
    effects: [], triggerCondition: { type: 'round_start' },
  },
  {
    id: 'quanjunchuji', name: '全军出击', type: 'command', activationRate: 0,
    description: '前三回合，我方全体武将增伤提升30%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'sheshengquyi', name: '舍生取义', type: 'command', activationRate: 0,
    description: '自身增伤降低40%，我方武力最高武将增伤提升30%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },

  // ---- 被动战法 ----
  {
    id: 'huixin', name: '会心', type: 'passive', activationRate: 0,
    description: '暴击率提升20%。每回合结束时暴击率提升10%，爆伤提升5%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'fange', name: '反戈', type: 'passive', activationRate: 0,
    description: '反击伤害提升40%，反击后额外对目标造成50%武力伤害',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'lianpo', name: '连破', type: 'passive', activationRate: 0,
    description: '自身回合开始时，70%概率获得连击(持续1回合)',
    effects: [], triggerCondition: { type: 'round_start' },
  },
  {
    id: 'ruibukedang', name: '锐不可当', type: 'passive', activationRate: 0,
    description: '造成伤害提升40%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'taoguangyanghui', name: '韬光养晦', type: 'passive', activationRate: 0,
    description: '主动战法发动率提升15%，主动战法增伤提升20%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'bingguishensu', name: '兵贵神速', type: 'passive', activationRate: 0,
    description: '速度提升20。每回合开始时对速度低于自身的敌方武将造成100%武力伤害',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'jianbiqingye', name: '坚壁清野', type: 'passive', activationRate: 0,
    description: '统帅提升30。每回合开始时，60%概率嘲讽敌方全体武将(嘲讽:普攻优先选择施加嘲讽的目标)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },

  // ---- 追击战法 ----
  {
    id: 'zhuikan', name: '追砍', type: 'pursuit', activationRate: 40,
    description: '普攻后，对目标造成375%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 3.75, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'tuci', name: '突刺', type: 'pursuit', activationRate: 40,
    description: '普攻后，对敌方全体武将造成130%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 1.3, target: 'enemy_all' }],
    triggerCondition: { type: 'after_normal_attack' },
  },

  // ---- 主动战法 ----
  {
    id: 'jijiu', name: '急救', type: 'active', activationRate: 50,
    description: '为我方生命最低武将回复300%智力生命',
    effects: [{ type: 'heal', multiplier: 3.0, target: 'ally_lowest_hp' }],
  },
  {
    id: 'chuji', name: '出击', type: 'active', activationRate: 50,
    description: '对敌方随机武将造成500%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 5.0, target: 'enemy_random' }],
  },
  {
    id: 'luanwu', name: '乱舞', type: 'active', activationRate: 45,
    description: '对敌方全体武将造成220%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 2.2, target: 'enemy_all' }],
  },
  {
    id: 'cuifengpodi', name: '摧锋破敌', type: 'active', activationRate: 50,
    description: '提升敌方统帅最低单体10%受到伤害，随后对其造成380%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 3.8, target: 'enemy_lowest_def' }],
  },
  {
    id: 'huxiao', name: '呼啸', type: 'active', activationRate: 45,
    description: '对敌方全体武将造成220%智力伤害',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 2.2, target: 'enemy_all' }],
  },
  {
    id: 'kuangfengdazuo', name: '狂风大作', type: 'active', activationRate: 50,
    description: '准备一回合，对敌方全体施加狂风(速度-20，持续2回合)，随后造成380%智力伤害',
    effects: [
      { type: 'debuff', debuffId: 'wind', duration: 2, target: 'enemy_all' },
      { type: 'damage', damageType: 'magical', multiplier: 3.8, target: 'enemy_all' },
    ],
    needsPreparation: true,
  },
  {
    id: 'podi', name: '破敌', type: 'active', activationRate: 40,
    description: '准备一回合，对敌方全体造成420%武力伤害',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 4.2, target: 'enemy_all' }],
    needsPreparation: true,
  },
  {
    id: 'dianhuo', name: '点火', type: 'active', activationRate: 50,
    description: '对敌方全体造成150%智力伤害并施加1层灼烧',
    effects: [
      { type: 'damage', damageType: 'magical', multiplier: 1.5, target: 'enemy_all' },
      { type: 'dot', damageType: 'magical', multiplier: 0.6, duration: 2, target: 'enemy_all' },
    ],
  },
  {
    id: 'liaoshirushen', name: '料事如神', type: 'active', activationRate: 45,
    description: '对敌方两人造成220%智力伤害并施加技穷(持续1回合)',
    effects: [
      { type: 'damage', damageType: 'magical', multiplier: 2.2, target: 'enemy_two' },
      { type: 'status', statusId: 'silence', duration: 1, target: 'enemy_two' },
    ],
  },
  {
    id: 'diukuiqijia', name: '丢盔卸甲', type: 'active', activationRate: 45,
    description: '对敌方两人造成220%武力伤害并施加缴械(持续1回合)',
    effects: [
      { type: 'damage', damageType: 'physical', multiplier: 2.2, target: 'enemy_two' },
      { type: 'status', statusId: 'disarm', duration: 1, target: 'enemy_two' },
    ],
  },
  {
    id: 'yuanmensheji', name: '辕门射戟', type: 'pursuit', activationRate: 70,
    description: '普攻后对目标造成260%武力伤害。若自身武力高于目标，则本次伤害提升40%',
    effects: [{ type: 'damage', damageType: 'physical', multiplier: 2.6, target: 'enemy_single' }],
    triggerCondition: { type: 'after_normal_attack' },
  },
  {
    id: 'wenwushuangquan', name: '文武双全', type: 'passive', activationRate: 0,
    description: '造成武力伤害时提升5智力(上限14层)。造成智力伤害时提升5武力(上限14层)',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'keji', name: '克己', type: 'passive', activationRate: 0,
    description: '无法普攻，自身最高属性提升50，增伤提升10%，减伤提升10%',
    effects: [], triggerCondition: { type: 'battle_start' },
  },
  {
    id: 'mingqixushi', name: '明其虚实', type: 'active', activationRate: 45,
    description: '偷取敌方两名武将30智力，随后对其造成200%智力伤害(偷取的智力持续两回合，重复偷取刷新，不可叠加)',
    effects: [{ type: 'damage', damageType: 'magical', multiplier: 2.0, target: 'enemy_two' }],
  },
];

// ============ 全部战法 ============
export const allSkills: SkillDef[] = [
  ...innateSkills,
  ...generalSkills,
];

// 按类型分类
export const skillsByType = {
  active: allSkills.filter(s => s.type === 'active'),
  pursuit: allSkills.filter(s => s.type === 'pursuit'),
  command: allSkills.filter(s => s.type === 'command'),
  passive: allSkills.filter(s => s.type === 'passive'),
};

// 按ID查找战法
export function getSkillById(id: string): SkillDef | undefined {
  return allSkills.find(s => s.id === id);
}