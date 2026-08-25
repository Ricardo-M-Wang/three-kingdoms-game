// 战法类型图标与配色
const SKILL_STYLES = {
  active: {
    bg: 'linear-gradient(135deg, #3a1010, #6a1a1a)',
    border: '#8a2a2a',
    icon: '⚔',
    label: '主动',
    glow: 'rgba(200,60,40,0.5)',
  },
  pursuit: {
    bg: 'linear-gradient(135deg, #1a2a1a, #2a4a1a)',
    border: '#4a7a2a',
    icon: '🏹',
    label: '追击',
    glow: 'rgba(100,180,60,0.5)',
  },
  command: {
    bg: 'linear-gradient(135deg, #1a1a3a, #2a2a5a)',
    border: '#4a4a8a',
    icon: '📯',
    label: '指挥',
    glow: 'rgba(100,100,200,0.5)',
  },
  passive: {
    bg: 'linear-gradient(135deg, #2a1a0a, #4a2a10)',
    border: '#7a4a20',
    icon: '🛡',
    label: '被动',
    glow: 'rgba(180,120,40,0.5)',
  },
};

interface Props {
  type: 'active' | 'pursuit' | 'command' | 'passive';
  size?: 'sm' | 'md';
}

export default function SkillIcon({ type, size = 'md' }: Props) {
  const style = SKILL_STYLES[type];
  const dims = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';

  return (
    <div
      className={`${dims} rounded-md flex items-center justify-center flex-shrink-0`}
      style={{
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        boxShadow: `0 0 6px ${style.glow}`,
      }}
      title={style.label}
    >
      <span className="leading-none">{style.icon}</span>
    </div>
  );
}

export function getSkillStyle(type: string) {
  return SKILL_STYLES[type as keyof typeof SKILL_STYLES] ?? SKILL_STYLES.active;
}
