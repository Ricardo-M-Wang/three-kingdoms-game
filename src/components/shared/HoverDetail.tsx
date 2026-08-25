import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getGeneralById, getSkillById } from '../../data';
import type { GeneralDef } from '../../types';
import type { SkillDef } from '../../types/skill';
import GeneralPortrait from './GeneralPortrait';
import SkillIcon from './SkillIcon';
import RadarChart from './RadarChart';

type DetailType = 'general' | 'skill' | 'button';

interface Props {
  type: DetailType;
  id?: string;
  label?: string;
  children: React.ReactNode;
}

const BUTTON_DESCRIPTIONS: Record<string, string> = {
  '开始新战斗': '编组武将阵容，搭配战法，挑战AI对手。运筹帷幄之中，决胜千里之外。',
  '匹配对战': '与天下豪杰实时对决。五局三胜制，禁用敌将、轮选战法，智勇双全者方能称霸。',
  '招贤纳士': '消耗金币抽取三国名将与绝世战法。良将如云，霸业可期。每次消耗100金币。',
  '就绪': '确认当前阵容配置，锁定武将属性与战法选择，准备迎接战斗。',
  '保存': '将当前阵容保存为预设，随时调用，应对不同战局。',
  '加载': '从已保存的阵容预设中快速调用，免去重复配将之劳。',
  '随机': '随机生成敌方阵容，用于演练战术与测试搭配。',
};

export default function HoverDetail({ type, id, label, children }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = useCallback((e: React.MouseEvent) => {
    clearTimeout(hideTimer.current);
    const el = e.currentTarget as HTMLElement;
    showTimer.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const panelW = 330;
      const x = rect.right + 12 > window.innerWidth - panelW
        ? rect.left - panelW - 12
        : rect.right + 12;
      const y = Math.max(8, Math.min(window.innerHeight - 480, rect.top + rect.height / 2 - 230));
      setPos({ x, y });
      setShow(true);
    }, 250);
  }, []);

  const handleLeave = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const detail = useMemo(() => {
    if (type === 'general' && id) return getGeneralById(id);
    if (type === 'skill' && id) return getSkillById(id);
    return null;
  }, [type, id]);

  return (
    <>
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </div>

      {show && createPortal(
        <div
          className="hover-detail-panel"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={handleLeave}
        >
          {type === 'general' && detail && (
            <GeneralPreview general={detail as GeneralDef} />
          )}
          {type === 'skill' && detail && (
            <SkillPreview skill={detail as SkillDef} />
          )}
          {type === 'button' && label && (
            <ButtonPreview label={label} description={BUTTON_DESCRIPTIONS[label] ?? ''} />
          )}
        </div>
      , document.body)}
    </>
  );
}

function GeneralPreview({ general }: { general: GeneralDef }) {
  const innate = getSkillById(general.innateSkillId);
  return (
    <div className="bg-[#1a0f07] border border-[#5a4328] rounded-lg p-4 shadow-2xl"
      style={{ width: 320, boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(201,168,76,0.12)' }}>
      <div className="flex items-center gap-3 mb-3">
        <GeneralPortrait generalId={general.id} name={general.name} size="lg" />
        <div>
          <h3 className="text-[#c9a84c] text-lg font-bold">{general.name}</h3>
          <div className="text-[#8b7355] text-xs">
            {general.skillType === 'active' ? '主动型' : general.skillType === 'pursuit' ? '追击型' : general.skillType === 'command' ? '指挥型' : '被动型'}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-center mb-1">
          <RadarChart ranks={general.ranks} size={100} />
        </div>
        <div className="grid grid-cols-4 gap-1 text-center text-xs">
          <div><span className="text-[#ef4444] font-bold">{general.ranks.atk}</span></div>
          <div><span className="text-[#a855f7] font-bold">{general.ranks.int}</span></div>
          <div><span className="text-[#3b82f6] font-bold">{general.ranks.def}</span></div>
          <div><span className="text-[#22c55e] font-bold">{general.ranks.spd}</span></div>
        </div>
      </div>
      {innate && (
        <div className="border-t border-[#3d2b1a] pt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <SkillIcon type={innate.type} size="sm" />
            <span className="text-[#c9a84c] text-sm font-bold">{innate.name}</span>
            {innate.activationRate > 0 && (
              <span className="text-[#8b7355] text-xs ml-auto">{innate.activationRate}%</span>
            )}
          </div>
          <div className="text-[#8b7355] text-xs leading-snug">{innate.description}</div>
        </div>
      )}
    </div>
  );
}

function SkillPreview({ skill }: { skill: SkillDef }) {
  return (
    <div className="bg-[#1a0f07] border border-[#5a4328] rounded-lg p-4 shadow-2xl"
      style={{ width: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(201,168,76,0.12)' }}>
      <div className="flex items-center gap-2 mb-3">
        <SkillIcon type={skill.type} size="md" />
        <h3 className="text-[#c9a84c] text-lg font-bold">{skill.name}</h3>
      </div>
      <div className="flex items-center gap-3 mb-2 text-sm">
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          skill.type === 'active' ? 'bg-[#3a1010] text-[#ef4444]' :
          skill.type === 'pursuit' ? 'bg-[#1a2a1a] text-[#22c55e]' :
          skill.type === 'command' ? 'bg-[#1a1a3a] text-[#818cf8]' :
          'bg-[#2a1a0a] text-[#c9a84c]'
        }`}>
          {skill.type === 'active' ? '主动' : skill.type === 'pursuit' ? '追击' : skill.type === 'command' ? '指挥' : '被动'}
        </span>
        {skill.activationRate > 0 && (
          <span className="text-[#c9a84c] font-bold">发动率 {skill.activationRate}%</span>
        )}
      </div>
      <div className="text-[#d4c5a0] text-sm leading-relaxed bg-[#0d0704] rounded p-3 border border-[#3d2b1a]">
        {skill.description}
      </div>
    </div>
  );
}

function ButtonPreview({ label, description }: { label: string; description: string }) {
  return (
    <div className="bg-[#1a0f07] border border-[#5a4328] rounded-lg p-4 shadow-2xl"
      style={{ width: 260, boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(201,168,76,0.12)' }}>
      <h3 className="text-[#c9a84c] text-base font-bold mb-2">{label}</h3>
      <div className="text-[#d4c5a0] text-sm leading-relaxed">{description}</div>
    </div>
  );
}
