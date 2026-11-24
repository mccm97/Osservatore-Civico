import { useState } from 'react';
import { CITY_PALETTE, PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type { PillarKey, PillarScores } from '../types/civic';

export interface RadarSeries {
  id: string;
  label: string;
  scores: PillarScores;
  colorHex: string;
  dashed?: boolean;
  fillOpacity?: number;
}

interface RadarChartProps {
  series: RadarSeries[];
  benchmarkScores?: PillarScores;
  benchmarkLabel?: string;
  height?: number;
}

export function RadarChart({
  series,
  benchmarkScores,
  benchmarkLabel = 'Media Italia',
  height = 360,
}: RadarChartProps) {
  const [hoveredPillar, setHoveredPillar] = useState<PillarKey | null>(null);

  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 128;
  const levels = [20, 40, 60, 80, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / PILLAR_KEYS.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const buildPolygonPoints = (scores: PillarScores) =>
    PILLAR_KEYS.map((key, idx) => {
      const pt = getPoint(idx, scores[key]);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

  return (
    <div className="w-full">
      <div className="relative flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ maxHeight: `${height}px` }}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Grafico radar di confronto sui cinque pilastri normalizzati"
        >
          {levels.map((lvl) => {
            const pts = PILLAR_KEYS.map((_, idx) => {
              const p = getPoint(idx, lvl);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(' ');
            return (
              <polygon
                key={lvl}
                points={pts}
                fill="none"
                stroke="#E5E3DC"
                strokeWidth={lvl === 100 ? 1.25 : 1}
              />
            );
          })}

          {PILLAR_KEYS.map((key, idx) => {
            const outer = getPoint(idx, 100);
            const labelPos = getPoint(idx, 122);
            const isHovered = hoveredPillar === key;
            return (
              <g key={key}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={isHovered ? '#18181B' : '#E5E3DC'}
                  strokeWidth={isHovered ? 1.4 : 1}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={
                    Math.abs(labelPos.x - cx) < 12
                      ? 'middle'
                      : labelPos.x > cx
                      ? 'start'
                      : 'end'
                  }
                  dominantBaseline="middle"
                  className={`text-[12px] font-medium transition-colors cursor-pointer ${
                    isHovered ? 'fill-[#1E3A8A] font-semibold' : 'fill-[#18181B]'
                  }`}
                  onMouseEnter={() => setHoveredPillar(key)}
                  onMouseLeave={() => setHoveredPillar(null)}
                >
                  {PILLAR_META[key].shortLabel}
                </text>
              </g>
            );
          })}

          {[40, 60, 80, 100].map((lvl) => {
            const pt = getPoint(0, lvl);
            return (
              <text
                key={lvl}
                x={pt.x + 6}
                y={pt.y + 3}
                className="text-[10px] font-mono fill-[#57534E]"
              >
                {lvl}
              </text>
            );
          })}

          {benchmarkScores && (
            <polygon
              points={buildPolygonPoints(benchmarkScores)}
              fill="none"
              stroke="#57534E"
              strokeWidth={1.6}
              strokeDasharray="4 4"
            />
          )}

          {series.map((s) => (
            <g key={s.id}>
              <polygon
                points={buildPolygonPoints(s.scores)}
                fill={s.colorHex}
                fillOpacity={s.fillOpacity ?? 0.08}
                stroke={s.colorHex}
                strokeWidth={s.dashed ? 2 : 2.2}
                strokeDasharray={s.dashed ? '5 3' : undefined}
              />
              {PILLAR_KEYS.map((key, idx) => {
                const pt = getPoint(idx, s.scores[key]);
                const isHovered = hoveredPillar === key;
                return (
                  <circle
                    key={`${s.id}-${key}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5 : 3.5}
                    fill={s.colorHex}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPillar(key)}
                    onMouseLeave={() => setHoveredPillar(null)}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 pt-3 border-t border-[#E5E3DC] min-h-[48px] flex flex-wrap items-center justify-between gap-3 text-xs">
        {hoveredPillar ? (
          <>
            <div className="font-medium text-[#18181B]">
              {PILLAR_META[hoveredPillar].label}
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
              {series.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-xs inline-block"
                    style={{ backgroundColor: s.colorHex }}
                  />
                  <span className="text-[#57534E]">{s.label}:</span>
                  <span className="font-semibold text-[#18181B]">
                    {s.scores[hoveredPillar]}
                  </span>
                </span>
              ))}
              {benchmarkScores && (
                <span className="text-[#57534E]">
                  {benchmarkLabel}: {benchmarkScores[hoveredPillar]}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-[#57534E]">
            <div className="flex flex-wrap items-center gap-4">
              {series.map((s, idx) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 text-[#18181B] font-medium"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{
                      backgroundColor:
                        s.colorHex || CITY_PALETTE[idx % CITY_PALETTE.length].hex,
                    }}
                  />
                  <span>{s.label}</span>
                </span>
              ))}
              {benchmarkScores && (
                <span className="inline-flex items-center gap-1.5 text-[#57534E]">
                  <span className="w-4 border-t-2 border-dashed border-[#57534E] inline-block" />
                  <span>{benchmarkLabel}</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#57534E]">
              Passa sui vertici per ispezionare
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
