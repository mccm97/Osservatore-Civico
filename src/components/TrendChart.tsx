import { useMemo, useState } from 'react';
import {
  CITY_PALETTE,
  REAL_TREND_OPTIONS,
  type RealTrendKey,
} from '../data/constants';
import type { Municipality, NationalBenchmarks } from '../types/civic';
import { formatMetricValue, formatNumberIt } from '../utils/formatters';

interface TrendChartProps {
  cities: Municipality[];
  benchmarks: NationalBenchmarks;
}

export function TrendChart({ cities, benchmarks }: TrendChartProps) {
  const [selectedKey, setSelectedKey] = useState<RealTrendKey>(
    'redditoMedioImponibile'
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeMeta = useMemo(
    () =>
      REAL_TREND_OPTIONS.find((o) => o.id === selectedKey) ??
      REAL_TREND_OPTIONS[0],
    [selectedKey]
  );

  const isMef =
    selectedKey === 'redditoMedioImponibile' ||
    selectedKey === 'addizionaleProCapite';

  const years = useMemo(
    () =>
      isMef
        ? benchmarks.overall.mefHistory.map((d) => d.year)
        : benchmarks.overall.provHistory.map((d) => d.year),
    [isMef, benchmarks]
  );

  const getSeriesForCity = (city: Municipality): (number | null)[] => {
    return years.map((yr) => {
      if (isMef) {
        const pt = city.mefHistory.find((p) => p.year === yr);
        if (!pt) return null;
        return selectedKey === 'redditoMedioImponibile'
          ? pt.redditoMedioImponibile
          : pt.addizionaleProCapite;
      }
      const pt = city.provHistory.find((p) => p.year === yr);
      if (!pt) return null;
      const val = pt[selectedKey as keyof typeof pt];
      return typeof val === 'number' ? val : null;
    });
  };

  const benchmarkSeries: number[] = useMemo(() => {
    if (isMef) {
      return benchmarks.overall.mefHistory.map((pt) =>
        selectedKey === 'redditoMedioImponibile'
          ? pt.redditoMedioImponibile
          : pt.addizionaleProCapite
      );
    }
    return benchmarks.overall.provHistory.map((pt) => {
      const val = pt[selectedKey as keyof typeof pt];
      return typeof val === 'number' ? val : 0;
    });
  }, [isMef, benchmarks, selectedKey]);

  const allValues = [
    ...benchmarkSeries,
    ...cities.flatMap((c) =>
      getSeriesForCity(c).filter((v): v is number => v !== null)
    ),
  ];

  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 100;
  const padding = Math.max(1, (rawMax - rawMin) * 0.15);
  const minVal = Math.max(0, Math.floor(rawMin - padding));
  const maxVal = Math.ceil(rawMax + padding);
  const span = Math.max(1, maxVal - minVal);

  const width = 580;
  const height = 265;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, years.length - 1)) * plotW;
  const getY = (val: number) =>
    padTop + ((maxVal - val) / span) * plotH;

  const buildPath = (vals: (number | null)[]) => {
    let path = '';
    vals.forEach((v, idx) => {
      if (v === null) return;
      const cmd = path === '' ? 'M' : 'L';
      path += `${cmd} ${getX(idx).toFixed(1)} ${getY(v).toFixed(1)} `;
    });
    return path.trim();
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * span);
  const activeIdx = Math.min(years.length - 1, hoveredIdx ?? years.length - 1);
  const activeYear = years[activeIdx];

  return (
    <div className="w-full">
      {/* Real Historical Series Selector */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md mb-3">
        {REAL_TREND_OPTIONS.map((opt) => {
          const active = selectedKey === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedKey(opt.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-white text-[#1E3A8A] shadow-2xs border border-[#E5E3DC]'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="text-[11px] text-[#57534E] mb-3">
        Livello: <strong className="text-[#18181B]">{activeMeta.scope}</strong> · Fonte: {activeMeta.source}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Serie storica reale ${activeMeta.label}`}
        >
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            const label =
              tick >= 1000
                ? `${formatNumberIt(Math.round(tick / 1000), 0)}k`
                : formatNumberIt(tick, activeMeta.decimals);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E5E3DC"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-[#57534E]"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {years.map((yr, idx) => (
            <text
              key={yr}
              x={getX(idx)}
              y={height - 8}
              textAnchor="middle"
              className={`text-[11px] font-mono ${
                activeIdx === idx
                  ? 'fill-[#18181B] font-semibold'
                  : 'fill-[#57534E]'
              }`}
            >
              {yr}
            </text>
          ))}

          <line
            x1={getX(activeIdx)}
            y1={padTop}
            x2={getX(activeIdx)}
            y2={padTop + plotH}
            stroke="#18181B"
            strokeOpacity={0.18}
            strokeWidth={1}
          />

          <path
            d={buildPath(benchmarkSeries)}
            fill="none"
            stroke="#57534E"
            strokeWidth={1.6}
            strokeDasharray="4 4"
          />

          {cities.map((city, cIdx) => {
            const color = CITY_PALETTE[cIdx % CITY_PALETTE.length].hex;
            const vals = getSeriesForCity(city);
            const activeVal = vals[activeIdx];
            return (
              <g key={city.id}>
                <path
                  d={buildPath(vals)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.2}
                />
                {activeVal !== null && activeVal !== undefined && (
                  <circle
                    cx={getX(activeIdx)}
                    cy={getY(activeVal)}
                    r={4}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            );
          })}

          {years.map((yr, idx) => {
            const bandW = plotW / Math.max(1, years.length - 1);
            const x = getX(idx) - bandW / 2;
            return (
              <rect
                key={`hit-${yr}`}
                x={Math.max(padLeft, x)}
                y={padTop}
                width={bandW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-2 pt-3 border-t border-[#E5E3DC] flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-mono font-semibold text-[#18181B] tabular-nums">
          Anno {activeYear}
        </span>
        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          {cities.map((city, idx) => {
            const color = CITY_PALETTE[idx % CITY_PALETTE.length].hex;
            const series = getSeriesForCity(city);
            const cur = series[activeIdx];
            const first = series[0];
            const delta =
              cur !== null && first !== null ? cur - first : null;

            return (
              <span key={city.id} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-xs inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[#57534E] font-sans">{city.nome}:</span>
                <span className="font-semibold text-[#18181B]">
                  {formatMetricValue(cur, activeMeta.unit, activeMeta.decimals)}
                </span>
                {delta !== null && (
                  <span
                    className={`text-[11px] ${
                      delta >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    ({delta >= 0 ? '+' : ''}
                    {formatNumberIt(delta, activeMeta.decimals)})
                  </span>
                )}
              </span>
            );
          })}
          <span className="text-[#57534E]">
            Media Italia:{' '}
            {formatMetricValue(
              benchmarkSeries[activeIdx],
              activeMeta.unit,
              activeMeta.decimals
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
