import { useState } from 'react';
import { useGeneralPortrait } from '../../hooks/useGeneralPortrait';
import { getGeneralById } from '../../../game/generals';

interface Props {
  generalId: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showFrame?: boolean;
  showRank?: boolean;
  fullBody?: boolean;
  greyed?: boolean;
}

const SIZES = {
  sm: { container: 'w-12 h-12', text: 'text-base', rank: 'text-[7px]', badge: 'w-4 h-4 text-[6px]' },
  md: { container: 'w-16 h-16', text: 'text-xl', rank: 'text-[8px]', badge: 'w-5 h-5 text-[7px]' },
  lg: { container: 'w-24 h-24', text: 'text-3xl', rank: 'text-[9px]', badge: 'w-6 h-6 text-[8px]' },
  xl: { container: 'w-32 h-32', text: 'text-4xl', rank: 'text-[10px]', badge: 'w-7 h-7 text-[9px]' },
  xxl: { container: 'w-36 h-52', text: 'text-5xl', rank: 'text-[11px]', badge: 'w-8 h-8 text-[10px]' },
};

function RankDot({ rank, color }: { rank: string; color: string }) {
  const level = rank === 'S' ? 5 : rank === 'A' ? 4 : rank === 'B' ? 3 : rank === 'C' ? 2 : 1;
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: i < level ? color : '#3d2b1a' }}
        />
      ))}
    </div>
  );
}

export default function GeneralPortrait({ generalId, name, size = 'md', showFrame = true, showRank = true, fullBody = false, greyed = false }: Props) {
  const { faction, title } = useGeneralPortrait(generalId);
  const generalDef = getGeneralById(generalId);
  const s = SIZES[size];
  const [imgError, setImgError] = useState(false);
  const portraitId = generalDef?.portrait || generalId;
  const imgClass = fullBody
    ? 'absolute inset-0 w-full h-full object-cover object-top z-10'
    : 'absolute inset-0 w-full h-full object-cover object-top z-10';

  const greyStyle = greyed ? { filter: 'grayscale(100%) brightness(0.5)', opacity: 0.6 } : {};

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* 外框 */}
      <div
        className={`${s.container} relative rounded-lg overflow-hidden flex items-center justify-center
          shadow-lg mx-auto`}
        style={{
          background: fullBody ? 'transparent' : faction.bgGradient,
          border: showFrame ? `2px solid ${faction.borderColor}` : 'none',
          boxShadow: showFrame ? `0 0 12px ${faction.glowColor}, inset 0 0 8px rgba(0,0,0,0.3)` : 'none',
        }}
      >
        {/* 立绘图片 */}
        {!imgError && (
          <img
            src={`/generals/${portraitId}.jpg`}
            alt={name}
            className={imgClass}
            style={greyStyle}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith('.webp') && !img.src.endsWith('.png')) {
                img.src = `/generals/${portraitId}.webp`;
              } else if (!img.src.endsWith('.png')) {
                img.src = `/generals/${portraitId}.png`;
              } else {
                setImgError(true);
              }
            }}
          />
        )}

        {/* 文字回退（立绘加载失败时显示） */}
        {imgError && (
          <>
            <div
              className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"
              style={{ fontSize: size === 'sm' ? '20px' : size === 'md' ? '28px' : size === 'lg' ? '42px' : size === 'xxl' ? '64px' : '56px' }}
            >
              {faction.emblem}
            </div>
            <span
              className={`${s.text} font-bold relative z-10 select-none`}
              style={{
                color: faction.textColor,
                textShadow: `0 2px 4px rgba(0,0,0,0.5), 0 0 8px ${faction.glowColor}`,
                fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
              }}
            >
              {name[0]}
            </span>
          </>
        )}

        {/* 阵营徽记角标 */}
        {showFrame && (
          <div
            className={`${s.badge} absolute top-0.5 right-0.5 rounded-full flex items-center justify-center font-bold
              opacity-80 z-20`}
            style={{ backgroundColor: faction.accentColor, color: '#fff' }}
          >
            {faction.emblem}
          </div>
        )}
      </div>

      {/* 等级指示 */}
      {showRank && generalDef && size !== 'sm' && (
        <div className="flex gap-1 mt-0.5">
          <RankDot rank={generalDef.ranks.atk} color="#ef4444" />
          <RankDot rank={generalDef.ranks.def} color="#3b82f6" />
          <RankDot rank={generalDef.ranks.int} color="#a855f7" />
          <RankDot rank={generalDef.ranks.spd} color="#22c55e" />
        </div>
      )}

      {/* 称号（仅大尺寸显示） */}
      {title && (size === 'lg' || size === 'xl' || size === 'xxl') && (
        <span
          className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full opacity-70"
          style={{ backgroundColor: faction.accentColor + '22', color: faction.accentColor, border: `1px solid ${faction.accentColor}44` }}
        >
          {title}
        </span>
      )}
    </div>
  );
}
