import type { GeneralRanks } from '../../types';
import { ATK_INT_VALUES, DEF_VALUES, SPD_VALUES } from '../../data';

interface Props {
  ranks: GeneralRanks;
  size?: number;
  showLabels?: boolean;
}

function rankToPercent(rank: string, attr: 'atk' | 'int' | 'def' | 'spd'): number {
  const map = attr === 'def' ? DEF_VALUES : attr === 'spd' ? SPD_VALUES : ATK_INT_VALUES;
  const max = attr === 'def' ? 90 : attr === 'spd' ? 100 : 200;
  const val = (map as Record<string, number>)[rank] ?? 100;
  return (val / max) * 100;
}

const ATTRS = [
  { key: 'atk' as const, label: '武', color: '#ef4444', angle: -90 },
  { key: 'int' as const, label: '智', color: '#a855f7', angle: 0 },
  { key: 'def' as const, label: '统', color: '#3b82f6', angle: 90 },
  { key: 'spd' as const, label: '速', color: '#22c55e', angle: 180 },
];

export default function RadarChart({ ranks, size = 160, showLabels = true }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  function polar(angleDeg: number, radius: number): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function polygonPath(values: number[]): string {
    return ATTRS.map((attr, i) => {
      const [x, y] = polar(attr.angle, r * (values[i] / 100));
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  }

  const values = ATTRS.map(a => rankToPercent(ranks[a.key], a.key));

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Chart without text */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {/* Grid */}
        {[
          { value: 0.25, opacity: 0.3 },
          { value: 0.45, opacity: 0.35 },
          { value: 0.65, opacity: 0.4 },
          { value: 0.82, opacity: 0.5 },
          { value: 0.95, opacity: 0.55 },
        ].map((lv, i) => (
          <path
            key={i}
            d={polygonPath(ATTRS.map(() => lv.value * 100))}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
            opacity={lv.opacity}
          />
        ))}

        {/* Axis lines */}
        {ATTRS.map(attr => {
          const [x, y] = polar(attr.angle, r);
          return (
            <line key={attr.key} x1={cx} y1={cy} x2={x} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
          );
        })}

        {/* Data fill */}
        <path d={polygonPath(values)} fill="rgba(201,168,76,0.12)"
          stroke="#c9a84c" strokeWidth="1.2" strokeLinejoin="round" />

        {/* Data points */}
        {ATTRS.map((attr, i) => {
          const [x, y] = polar(attr.angle, r * (values[i] / 100));
          return (
            <circle key={attr.key} cx={x} cy={y} r="2.5"
              fill={attr.color} stroke="transparent" strokeWidth="0" />
          );
        })}
      </svg>

      {/* Labels below chart */}
      {showLabels && (
        <div className="flex gap-3 text-sm">
          {ATTRS.map(attr => (
            <span key={attr.key} style={{ color: attr.color, fontWeight: 600 }}>
              {attr.label}{ranks[attr.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
