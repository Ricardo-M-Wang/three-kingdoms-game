import type { RoundSnapshot } from '../../types';

interface Props {
  snapshots: RoundSnapshot[];
  metric: 'hp' | 'damage';
}

// 每个武将独立颜色，一组暖色一组冷色区分阵营
const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

const CHART_W = 600;
const CHART_H = 220;
const PAD_L = 50;
const PAD_R = 20;
const PAD_T = 15;
const PAD_B = 30;
const W = CHART_W - PAD_L - PAD_R;
const H = CHART_H - PAD_T - PAD_B;

export default function RoundChart({ snapshots, metric }: Props) {
  if (snapshots.length === 0) {
    return <div className="text-[#5a4328] text-sm text-center py-4">无回合数据</div>;
  }

  const maxRounds = snapshots[snapshots.length - 1].round;
  const xScale = (round: number) => PAD_L + (round / Math.max(1, maxRounds)) * W;

  // 按阵营分组武将
  const playerGenerals = snapshots[0]?.generals.filter(g => g.side === 'player') ?? [];
  const enemyGenerals = snapshots[0]?.generals.filter(g => g.side === 'enemy') ?? [];
  const allGens = [...playerGenerals, ...enemyGenerals];

  // 给每个武将分配颜色
  const colorMap: Record<string, string> = {};
  allGens.forEach((g, i) => {
    colorMap[g.side + ':' + g.generalId] = COLORS[i % COLORS.length];
  });

  // 获取某回合某武将的值；伤害模式取回合增量
  function getValue(snapIdx: number, generalId: string, side: string): number {
    const snap = snapshots[snapIdx];
    const g = snap?.generals.find(g2 => g2.generalId === generalId && g2.side === side);
    if (!g) return 0;
    if (metric === 'hp') return Math.max(0, g.hp);

    // 每回合伤害 = 累计差
    const curAcc = g.accumulatedDamage;
    if (snapIdx === 0) return 0;
    const prevSnap = snapshots[snapIdx - 1];
    const prevG = prevSnap?.generals.find(g2 => g2.generalId === generalId && g2.side === side);
    const prevAcc = prevG?.accumulatedDamage ?? 0;
    return Math.max(0, curAcc - prevAcc);
  }

  // 计算Y轴范围
  let maxVal = 1;
  for (let si = 0; si < snapshots.length; si++) {
    for (const gen of allGens) {
      const v = getValue(si, gen.generalId, gen.side);
      if (v > maxVal) maxVal = v;
    }
  }
  const yScale = (v: number) => PAD_T + H - (v / maxVal) * H;

  // 生成折线点
  function linePoints(gen: typeof allGens[0]): string {
    return snapshots.map((s, si) => {
      const v = getValue(si, gen.generalId, gen.side);
      return `${xScale(s.round)},${yScale(v)}`;
    }).join(' ');
  }

  return (
    <div className="bg-transparent border border-white/10 rounded-lg p-4 mb-4">
      <h4 className="text-[#c9a84c] text-sm font-bold mb-2">
        {metric === 'hp' ? '各武将生命变化' : '各武将每回合造成伤害'}
      </h4>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-xs">
        {allGens.map(g => (
          <div key={g.side + ':' + g.generalId} className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: colorMap[g.side + ':' + g.generalId] }} />
            <span className={g.side === 'player' ? 'text-[#6bc96b]' : 'text-[#d46b6b]'}>
              {g.name}
            </span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ maxHeight: 240 }}>
        {/* Y轴网格 + 标签 */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = yScale(maxVal * pct);
          return (
            <g key={pct}>
              <line x1={PAD_L} y1={y} x2={PAD_L + W} y2={y} stroke="#3d2b1a" strokeWidth={0.5} />
              <text x={PAD_L - 6} y={y + 4} fill="#5a4328" fontSize={9} textAnchor="end">
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* X轴 */}
        {Array.from({ length: maxRounds + 1 }, (_, r) => (
          <text key={r} x={xScale(r)} y={CHART_H - 6} fill="#5a4328" fontSize={9} textAnchor="middle">
            {r}
          </text>
        ))}
        <text x={PAD_L + W / 2} y={CHART_H - 2} fill="#5a4328" fontSize={9} textAnchor="middle" dy={14}>
          回合
        </text>

        {/* 每条武将线 */}
        {allGens.map(gen => {
          const color = colorMap[gen.side + ':' + gen.generalId];
          const points = linePoints(gen);
          const isEnemy = gen.side === 'enemy';
          return (
            <g key={gen.side + ':' + gen.generalId}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray={isEnemy ? '6,3' : undefined}
              />
              {snapshots.map((s, si) => {
                const v = getValue(si, gen.generalId, gen.side);
                return (
                  <circle
                    key={s.round}
                    cx={xScale(s.round)}
                    cy={yScale(v)}
                    r={2.5}
                    fill={color}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
