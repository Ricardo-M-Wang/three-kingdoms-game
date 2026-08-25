-- ============================================
-- 三国志略 数据库
-- MySQL Workbench 导入用
-- ============================================

CREATE DATABASE IF NOT EXISTS san_kingdoms
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE san_kingdoms;

-- ============================================
-- 属性等级对照表
-- ============================================
DROP TABLE IF EXISTS rank_values;
CREATE TABLE rank_values (
  `rank` CHAR(1) PRIMARY KEY COMMENT '等级 (S/A/B/C/D)',
  atk_value INT NOT NULL COMMENT '武力值',
  int_value INT NOT NULL COMMENT '智力值',
  def_value INT NOT NULL COMMENT '统帅值',
  spd_value INT NOT NULL COMMENT '速度值'
) COMMENT '属性等级对照';

INSERT INTO rank_values VALUES
('S', 200, 200, 90, 100),
('A', 180, 180, 80,  90),
('B', 160, 160, 70,  80),
('C', 140, 140, 60,  70),
('D', 100, 100, 50,  60);

-- ============================================
-- 战法表
-- ============================================
DROP TABLE IF EXISTS skills;
CREATE TABLE skills (
  id VARCHAR(50) PRIMARY KEY COMMENT '战法ID',
  name VARCHAR(50) NOT NULL COMMENT '战法名称',
  type ENUM('active','pursuit','command','passive') NOT NULL COMMENT '战法类型: 主动/追击/指挥/被动',
  activation_rate INT NOT NULL DEFAULT 0 COMMENT '发动率(%) 0=必定/条件触发',
  description VARCHAR(500) NOT NULL COMMENT '战法描述',
  max_triggers_per_round INT DEFAULT NULL COMMENT '每回合触发上限',
  needs_preparation TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否需要准备',
  is_innate TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为武将自带战法'
) COMMENT '战法表';

-- ========== 自带战法(innate) ==========
INSERT INTO skills VALUES
-- 主动
('yingshilanggu', '鹰视狼顾', 'active', 100, '对敌方两人造成10%+回合数×40%智力伤害。每回合结束时提升自身智力', NULL, 0, 1),
('shuiyanqijun', '水淹七军', 'active', 40, '准备一回合，对敌方全体施加洪水并造成360%武力伤害。若目标已持有洪水则额外造成150%武力附加伤害', NULL, 1, 1),
('fuhaipingshan', '覆海平山', 'active', 70, '对敌方全体造成140%武力伤害。第三次及后续倍率+40%，第四次+受到伤害+30%，第五次+破甲+40%', NULL, 0, 1),
('jushuiduanqiao', '据水断桥', 'active', 50, '对敌方全体施加畏惧(持续1回合)并造成180%武力伤害。若敌方有洪水则无视40%防御', NULL, 0, 1),
('wuleihongding', '五雷轰顶', 'active', 50, '准备一回合，对敌方随机目标造成5次180%智力伤害。若目标有洪水则伤害+50%', NULL, 1, 1),
('huoshaolianying', '火烧连营', 'active', 60, '对敌方全体造成280%智力伤害，结算目标灼烧伤害(不清除层数)', NULL, 0, 1),
('shishengshibai', '十胜十败', 'active', 50, '对敌方全体造成220%智力伤害并施加技穷(持续1回合)', NULL, 0, 1),
-- 追击
('ziqilvli', '姿器膂力', 'pursuit', 50, '普攻后随机获得一种功能性增益(优先未拥有)，随后对目标造成380%武力伤害', NULL, 0, 1),
('baibuchuanyang', '百步穿杨', 'pursuit', 50, '普攻后提升20%暴击率，对目标造成360%武力伤害', NULL, 0, 1),
('zhengqing', '争擎', 'pursuit', 100, '普攻后目标和自身防御均降低20(回合结束重置)，对目标造成200%武力伤害', NULL, 0, 1),
('jieying', '劫营', 'pursuit', 40, '普攻后对目标造成400%武力伤害并施加断粮(降低回复70%)', NULL, 0, 1),
-- 指挥
('qiaobian', '巧变', 'command', 0, '我方任意武将每次获得功能性增益时，令其额外获得一种(每回合限1次)', 1, 0, 1),
('hubaoxiongqi', '虎豹骑', 'command', 0, '前三回合我方全体武力+20、速度+20、增伤+30%', NULL, 0, 1),
('beifazhizhi', '北伐之志', 'command', 0, '我方全体造成非普攻伤害后，姜维对目标造成90%武力+90%智力伤害(每回合限3次)', 3, 0, 1),
('haolingqunxiong', '号令群雄', 'command', 0, '自身行动时令智力最高单体对敌全体造成90%智力伤害，武力最高单体对敌全体造成90%武力伤害', NULL, 0, 1),
('qixi', '奇袭', 'command', 0, '战斗开始时对敌方全体施加4层奇袭。每回合开始时对敌方两人造成180%武力伤害(奇袭:受到邓艾伤害必定暴击)', NULL, 0, 1),
('yacibibao', '睚眦必报', 'command', 0, '我方全体武将释放准备战法时40%概率令其跳过准备回合直接释放(每回合上限2次)', 2, 0, 1),
('taoyuanjieyi', '桃园结义', 'command', 0, '战斗开始时我方全体减伤+15%。每回合结束时回复我方全体100%智力生命，为生命最低武将额外回复50%智力生命', NULL, 0, 1),
('xiandeng', '先登', 'command', 0, '战斗开始时提升我方全体40速度。我方速度最高武将增伤+20%、减伤+20%', NULL, 0, 1),
('guruojintang', '固若金汤', 'command', 0, '前三回合敌方全体造成伤害-40%。第四回合开始我方全体最高属性+10%、增伤+20%', NULL, 0, 1),
('xianzhenzhizhi', '陷阵之志', 'command', 0, '战斗开始为敌方全体施加弱点(每人10层共享池)，我方全体减伤+60%。每消耗1层我方减伤-2%', NULL, 0, 1),
('biyue', '闭月', 'command', 0, '每回合开始时令我方武力最高单体获得连击和骁勇(持续1回合)', NULL, 0, 1),
('quanyujiangdong', '权御江东', 'command', 0, '每回合首次释放主动战法:奇数回合回复全体120%智力生命，偶数回合额外释放一次(上限一次)', 1, 0, 1),
('huoshaochibi', '火烧赤壁', 'command', 60, '我方释放主动战法后60%概率对敌方全体造成80%智力伤害+灼烧。每次触发后概率-10%，每回合重置。上限3次', 3, 0, 1),
('benyu', '贲育', 'command', 0, '我方全体每次释放主动战法后，程昱对目标造成120%智力伤害(每回合限3次)', 3, 0, 1),
-- 被动
('baiyidujiang', '白衣渡江', 'passive', 0, '每受到三次伤害后闪避下一次伤害。对生命高于50%的目标造成伤害+30%', NULL, 0, 1),
('shenweitainjiangjun', '神威天将军', 'passive', 0, '每次普攻后速度+5%。马超造成的追击伤害额外提升(双方速度差×100%，上限100%)', NULL, 0, 1),
('shensu', '神速', 'passive', 0, '每回合开始时武力提升当前速度的25%(回合结束重置)。对敌方全体造成120%武力伤害，对速度低于自身的+30%', NULL, 0, 1),
('guzhielai', '古之恶来', 'passive', 0, '战斗开始时统帅+40。受到普攻时获得恶来并反击(每回合上限5次)。恶来:武力+5、反击伤害+10%(上限5层)', NULL, 0, 1),
('weizhenxiaoyao', '威震逍遥', 'passive', 0, '回合开始时降低敌方全体5%武力和5%防御。自身行动时对敌方防御最低单体造成260%武力伤害', NULL, 0, 1),
('kanpo', '看破', 'passive', 0, '敌方任意武将释放主动战法时，诸葛亮对其造成150%智力伤害并有50%概率施加技穷(每回合限3次)', 3, 0, 1),
('qijinqichu', '七进七出', 'passive', 0, '规避率+40%。成功规避后对敌方两名武将造成80%武力伤害。每回合规避上限7次', NULL, 0, 1),
('wangzuo', '王佐', 'passive', 0, '战斗开始时我方智力最高武将暴击率+40%、暴击伤害+40%', NULL, 0, 1),
('luanshixiaoxiong', '乱世枭雄', 'passive', 0, '我方全体减伤+15%。首回合施加1层归心，每回合结束为生命最低武将施加1层归心(上限2层)', NULL, 0, 1),
('ganglie', '刚烈', 'passive', 0, '受到伤害时对目标反击(100%武力+100%防御)，同时使目标增伤降低10%(上限4层)。每回合最多4次', NULL, 0, 1),
('wuqian', '无前', 'passive', 0, '敌方武将即将行动时若吕布武力高于对方则立即对目标普攻一次(每回合限3次)', NULL, 0, 1);

-- ========== 通用战法(general) ==========
INSERT INTO skills VALUES
-- 指挥
('biqiruizhi', '避其锐气', 'command', 0, '战斗开始时我方全体武将减伤提升20%', NULL, 0, 0),
('bubuweijing', '步步为营', 'command', 0, '每回合开始时我方全体武将减伤提升5%(上限30%)', NULL, 0, 0),
('sheshengquyi', '舍生取义', 'command', 0, '自身增伤降低40%，我方武力最高武将增伤提升30%', NULL, 0, 0),
-- 被动
('huixin', '会心', 'passive', 0, '暴击率提升20%。每回合结束时暴击率提升10%', NULL, 0, 0),
('fange', '反戈', 'passive', 0, '反击伤害提升40%，反击后额外对目标造成50%武力伤害', NULL, 0, 0),
('lianpo', '连破', 'passive', 0, '自身回合开始时70%概率获得连击(持续1回合)', NULL, 0, 0),
('ruibukedang', '锐不可当', 'passive', 0, '造成伤害提升40%', NULL, 0, 0),
('taoguangyanghui', '韬光养晦', 'passive', 0, '主动战法发动率提升15%，主动战法增伤提升20%', NULL, 0, 0),
('bingguishensu', '兵贵神速', 'passive', 0, '速度提升20。每回合开始时对速度低于自身的敌方武将造成100%武力伤害', NULL, 0, 0),
-- 追击
('zhuikan', '追砍', 'pursuit', 40, '普攻后对目标造成375%武力伤害', NULL, 0, 0),
('tuci', '突刺', 'pursuit', 40, '普攻后对敌方全体武将造成130%武力伤害', NULL, 0, 0),
-- 主动
('jijiu', '急救', 'active', 50, '为我方生命最低武将回复300%智力生命', NULL, 0, 0),
('chuji', '出击', 'active', 50, '对敌方随机武将造成500%武力伤害', NULL, 0, 0),
('luanwu', '乱舞', 'active', 45, '对敌方全体武将造成220%武力伤害', NULL, 0, 0),
('huxiao', '呼啸', 'active', 45, '对敌方全体武将造成220%智力伤害', NULL, 0, 0),
('kuangfengdazuo', '狂风大作', 'active', 50, '准备一回合，对敌方全体施加狂风(速度-20,持续2回合)，随后造成380%智力伤害', NULL, 1, 0),
('podi', '破敌', 'active', 40, '准备一回合，对敌方全体造成420%武力伤害', NULL, 1, 0),
('dianhuo', '点火', 'active', 50, '对敌方全体造成150%智力伤害并施加1层灼烧', NULL, 0, 0),
('liaoshirushen', '料事如神', 'active', 45, '对敌方两人造成220%智力伤害并施加技穷(持续1回合)', NULL, 0, 0),
('diukuiqijia', '丢盔卸甲', 'active', 45, '对敌方两人造成220%武力伤害并施加缴械(持续1回合)', NULL, 0, 0),
('yuanmensheji', '辕门射戟', 'pursuit', 70, '普攻后对目标造成260%武力伤害。若自身武力高于目标则伤害+40%', NULL, 0, 0),
('wenwushuangquan', '文武双全', 'passive', 0, '造成武力伤害时提升5智力(上限10层)。造成智力伤害时提升5武力(上限10层)', NULL, 0, 0),
('keji', '克己', 'passive', 0, '无法普攻，自身最高属性提升50，增伤提升10%，减伤提升10%', NULL, 0, 0),
('mingqixushi', '明其虚实', 'active', 45, '偷取敌方两名武将30智力(持续2回合，可刷新不可叠加)，随后造成260%智力伤害', NULL, 0, 0);

-- ============================================
-- 武将表
-- ============================================
DROP TABLE IF EXISTS generals;
CREATE TABLE generals (
  id VARCHAR(30) PRIMARY KEY COMMENT '武将ID',
  name VARCHAR(20) NOT NULL COMMENT '武将名称',
  rank_atk CHAR(1) NOT NULL COMMENT '武力等级',
  rank_int CHAR(1) NOT NULL COMMENT '智力等级',
  rank_def CHAR(1) NOT NULL COMMENT '统帅等级',
  rank_spd CHAR(1) NOT NULL COMMENT '速度等级',
  innate_skill_id VARCHAR(50) NOT NULL COMMENT '自带战法ID',
  skill_type ENUM('active','pursuit','command','passive') NOT NULL COMMENT '自带战法类型',
  portrait VARCHAR(30) NOT NULL COMMENT '立绘文件名',
  hp INT NOT NULL DEFAULT 10000 COMMENT '生命值',
  free_points INT NOT NULL DEFAULT 50 COMMENT '自由属性点',
  faction VARCHAR(10) DEFAULT NULL COMMENT '阵营(wei/shu/wu/qun)',
  title VARCHAR(30) DEFAULT NULL COMMENT '历史称号',
  FOREIGN KEY (innate_skill_id) REFERENCES skills(id)
) COMMENT '武将表';

INSERT INTO generals VALUES
-- 主动型
('simayi', '司马懿', 'C','S','A','C', 'yingshilanggu', 'active', 'simayi', 10000, 50, 'wei', '冢虎'),
('guanyu', '关羽', 'S','C','B','A', 'shuiyanqijun', 'active', 'guanyu', 10000, 50, 'shu', '义薄云天'),
('sunce', '孙策', 'S','B','A','A', 'fuhaipingshan', 'active', 'sunce', 10000, 50, 'wu', '小霸王'),
('zhangfei', '张飞', 'S','B','B','S', 'jushuiduanqiao', 'active', 'zhangfei', 10000, 50, 'shu', '万夫莫敌'),
('zhangjiao', '张角', 'C','A','C','B', 'wuleihongding', 'active', 'zhangjiao', 10000, 50, 'qun', '大贤良师'),
('luxun', '陆逊', 'B','S','S','C', 'huoshaolianying', 'active', 'luxun', 10000, 50, 'wu', '书生拜将'),
('guojia', '郭嘉', 'D','S','C','B', 'shishengshibai', 'active', 'guojia', 10000, 50, 'wei', '鬼才'),
-- 追击型
('wenyang', '文鸯', 'S','D','A','S', 'ziqilvli', 'pursuit', 'wenyang', 10000, 50, 'qun', '姿器膂力'),
('huangzhong', '黄忠', 'A','B','B','A', 'baibuchuanyang', 'pursuit', 'huangzhong', 10000, 50, 'shu', '老当益壮'),
('xuchu', '许褚', 'S','D','B','C', 'zhengqing', 'pursuit', 'xuchu', 10000, 50, 'wei', '虎痴'),
('ganning', '甘宁', 'A','C','B','S', 'jieying', 'pursuit', 'ganning', 10000, 50, 'wu', '锦帆贼'),
-- 指挥型
('zhanghe', '张郃', 'A','B','B','A', 'qiaobian', 'command', 'zhanghe', 10000, 50, 'wei', '巧变良将'),
('caochun', '曹纯', 'B','C','A','S', 'hubaoxiongqi', 'command', 'caochun', 10000, 50, 'wei', '虎豹统领'),
('jiangwei', '姜维', 'A','A','A','A', 'beifazhizhi', 'command', 'jiangwei', 10000, 50, 'shu', '天水麒麟'),
('yuanshao', '袁绍', 'C','B','B','B', 'haolingqunxiong', 'command', 'yuanshao', 10000, 50, 'qun', '四世三公'),
('dengai', '邓艾', 'A','A','A','A', 'qixi', 'command', 'dengai', 10000, 50, 'wei', '奇袭名将'),
('fazheng', '法正', 'D','S','B','C', 'yacibibao', 'command', 'fazheng', 10000, 50, 'shu', '奇画策士'),
('liubei', '刘备', 'C','A','A','B', 'taoyuanjieyi', 'command', 'liubei', 10000, 50, 'shu', '仁德之君'),
('yuejin', '乐进', 'A','C','B','S', 'xiandeng', 'command', 'yuejin', 10000, 50, 'wei', '先登勇将'),
('caoren', '曹仁', 'A','B','A','C', 'guruojintang', 'command', 'caoren', 10000, 50, 'wei', '固若金汤'),
('gaoshun', '高顺', 'A','B','A','C', 'xianzhenzhizhi', 'command', 'gaoshun', 10000, 50, 'qun', '陷阵之志'),
('diaochan', '貂蝉', 'D','A','D','C', 'biyue', 'command', 'diaochan', 10000, 50, 'qun', '闭月羞花'),
('sunquan', '孙权', 'B','S','B','B', 'quanyujiangdong', 'command', 'sunquan', 10000, 50, 'wu', '碧眼紫髯'),
('zhouyu', '周瑜', 'B','S','S','B', 'huoshaochibi', 'command', 'zhouyu', 10000, 50, 'wu', '美周郎'),
('chengyu', '程昱', 'D','S','C','B', 'benyu', 'command', 'chengyu', 10000, 50, 'wei', '贲育之士'),
-- 被动型
('lvmeng', '吕蒙', 'A','S','A','C', 'baiyidujiang', 'passive', 'lvmeng', 10000, 50, 'wu', '士别三日'),
('machao', '马超', 'S','C','B','S', 'shenweitainjiangjun', 'passive', 'machao', 10000, 50, 'shu', '锦马超'),
('xiahouyuan', '夏侯渊', 'A','C','B','S', 'shensu', 'passive', 'xiahouyuan', 10000, 50, 'wei', '神速'),
('dianwei', '典韦', 'S','D','B','C', 'guzhielai', 'passive', 'dianwei', 10000, 50, 'wei', '古之恶来'),
('zhangliao', '张辽', 'S','B','A','S', 'weizhenxiaoyao', 'passive', 'zhangliao', 10000, 50, 'wei', '威震逍遥'),
('zhugeliang', '诸葛亮', 'C','S','A','D', 'kanpo', 'passive', 'zhugeliang', 10000, 50, 'shu', '卧龙'),
('zhaoyun', '赵云', 'S','B','B','A', 'qijinqichu', 'passive', 'zhaoyun', 10000, 50, 'shu', '一身是胆'),
('xunyu', '荀彧', 'D','S','D','C', 'wangzuo', 'passive', 'xunyu', 10000, 50, 'wei', '王佐之才'),
('caocao', '曹操', 'B','S','S','B', 'luanshixiaoxiong', 'passive', 'caocao', 10000, 50, 'wei', '乱世枭雄'),
('xiahoudun', '夏侯惇', 'B','C','B','C', 'ganglie', 'passive', 'xiahoudun', 10000, 50, 'wei', '刚烈不屈'),
('lvbu', '吕布', 'S','D','A','S', 'wuqian', 'passive', 'lvbu', 10000, 50, 'qun', '飞将');

-- ============================================
-- 查询视图
-- ============================================

-- 武将完整信息视图
CREATE OR REPLACE VIEW v_generals_full AS
SELECT
  g.id, g.name, g.faction, g.title,
  g.rank_atk, rv.atk_value AS atk_base,
  g.rank_int, rv.int_value AS int_base,
  g.rank_def, rv.def_value AS def_base,
  g.rank_spd, rv.spd_value AS spd_base,
  g.hp, g.free_points,
  g.skill_type,
  s.name AS skill_name,
  s.type AS skill_type,
  s.activation_rate,
  s.description AS skill_description
FROM generals g
JOIN skills s ON g.innate_skill_id = s.id
JOIN rank_values rv ON g.rank_atk = rv.rank;

-- 战法按类型统计
CREATE OR REPLACE VIEW v_skills_by_type AS
SELECT
  type,
  CASE type
    WHEN 'active' THEN '主动战法'
    WHEN 'pursuit' THEN '追击战法'
    WHEN 'command' THEN '指挥战法'
    WHEN 'passive' THEN '被动战法'
  END AS type_name,
  COUNT(*) AS total,
  SUM(CASE WHEN is_innate = 1 THEN 1 ELSE 0 END) AS innate_count,
  SUM(CASE WHEN is_innate = 0 THEN 1 ELSE 0 END) AS general_count
FROM skills
GROUP BY type
ORDER BY FIELD(type, 'active','pursuit','command','passive');

-- 武将按阵营统计
CREATE OR REPLACE VIEW v_generals_by_faction AS
SELECT
  faction,
  CASE faction
    WHEN 'wei' THEN '魏'
    WHEN 'shu' THEN '蜀'
    WHEN 'wu' THEN '吴'
    WHEN 'qun' THEN '群'
  END AS faction_name,
  COUNT(*) AS total,
  GROUP_CONCAT(name ORDER BY name SEPARATOR '、') AS generals_list
FROM generals
GROUP BY faction
ORDER BY total DESC;
