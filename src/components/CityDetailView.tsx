import { ArrowLeft, Plus, RefreshCw, Search, Wind } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MEF_INDICATOR_DEFS, PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type {
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  MunicipalitySummary,
  NationalBenchmarks,
  PillarKey,
} from '../types/civic';
import {
  formatMetricValue,
  formatNumberIt,
  formatTimeIt,
  getBenchmarkStatus,
} from '../utils/formatters';
import { RadarChart } from './RadarChart';

interface CityDetailViewProps {
  city: Municipality | null;
  loadingCity: boolean;
  totalMunicipalities: number;
  activeCities: Municipality[];
  selectedIds: string[];
  benchmarks: NationalBenchmarks;
  indicatorMeta: Record<string, IndicatorMeta>;
  liveReading?: LiveEnvironmentReading;
  envLoading: boolean;
  onSelectDetailCity: (id: string) => void;
  onAddToComparison: (id: string) => void;
  onRefreshEnv: (id: string) => void;
  onBackToComparison: () => void;
}

interface HistoricalCardItem {
  key: string;
  label: string;
  pillar: PillarKey;
  scope: 'Comunale' | 'Provinciale';
  source: string;
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
  points: { year: number; value: number; benchmark: number }[];
}

function MiniHistoricalChart({
  item,
}: {
  item: HistoricalCardItem;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const pts = item.points;
  const allVals = pts.flatMap((p) => [p.value, p.benchmark]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = Math.max(0.5, (rawMax - rawMin) * 0.18);
  const minV = Math.max(0, rawMin - pad);
  const maxV = rawMax + pad;
  const span = Math.max(0.5, maxV - minV);

  const w = 320;
  const h = 112;
  const pL = 10;
  const pR = 10;
  const pT = 14;
  const pB = 22;
  const plotW = w - pL - pR;
  const plotH = h - pT - pB;

  const getX = (i: number) =>
    pts.length === 1 ? pL + plotW / 2 : pL + (i / (pts.length - 1)) * plotW;
  const getY = (v: number) => pT + ((maxV - v) / span) * plotH;

  const cityPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.value).toFixed(1)}`)
    .join(' ');
  const benchPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.benchmark).toFixed(1)}`)
    .join(' ');

  const activeIdx = hoveredIdx !== null ? hoveredIdx : pts.length - 1;
  const activePt = pts[activeIdx];
  const firstPt = pts[0];
  const latestPt = pts[pts.length - 1];
  const diffYears = latestPt.value - firstPt.value;
  const status = getBenchmarkStatus(
    latestPt.value,
    latestPt.benchmark,
    item.higherIsBetter,
    item.decimals
  );

  return (
    <article className="bg-white border border-[#E5E3DC] rounded-lg p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-[#57534E]">
              {PILLAR_META[item.pillar].shortLabel} · {item.scope} · {item.source}
            </div>
            <h3 className="text-sm font-semibold text-[#18181B] mt-0.5 leading-snug">
              {item.label}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-base font-semibold text-[#18181B] tabular-nums">
              {formatMetricValue(activePt.value, item.unit, item.decimals)}
            </div>
            <div className={`text-[11px] font-mono tabular-nums ${status.toneClass}`}>
              {status.label}
            </div>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto mt-2"
          role="img"
          aria-label={`Andamento storico ${item.label}`}
        >
          <line x1={pL} y1={pT + plotH} x2={w - pR} y2={pT + plotH} stroke="#E5E3DC" strokeWidth={1} />
          <path
            d={benchPath}
            fill="none"
            stroke="#57534E"
            strokeWidth={1.3}
            strokeDasharray="3 3"
          />
          <path
            d={cityPath}
            fill="none"
            stroke="#1E3A8A"
            strokeWidth={2}
          />
          {pts.map((p, idx) => (
            <g key={p.year}>
              <circle
                cx={getX(idx)}
                cy={getY(p.value)}
                r={activeIdx === idx ? 4 : 2.5}
                fill={activeIdx === idx ? '#1E3A8A' : '#FFFFFF'}
                stroke="#1E3A8A"
                strokeWidth={1.6}
              />
              <text
                x={getX(idx)}
                y={h - 5}
                textAnchor="middle"
                className={`text-[10px] font-mono ${
                  activeIdx === idx ? 'fill-[#18181B] font-semibold' : 'fill-[#57534E]'
                }`}
              >
                {p.year}
              </text>
              <rect
                x={getX(idx) - plotW / Math.max(2, pts.length * 2)}
                y={0}
                width={plotW / Math.max(1, pts.length)}
                height={h}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 pt-2 border-t border-[#E5E3DC]/70 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#57534E]">
        <span>
          {activePt.year}: Italia{' '}
          {formatMetricValue(activePt.benchmark, item.unit, item.decimals)}
        </span>
        {pts.length >= 2 && (
          <span
            className={
              (item.higherIsBetter ? diffYears >= 0 : diffYears <= 0)
                ? 'text-[#16A34A]'
                : 'text-[#DC2626]'
            }
          >
            {diffYears >= 0 ? '+' : ''}
            {formatNumberIt(diffYears, item.decimals)} dal {firstPt.year}
          </span>
        )}
      </div>
    </article>
  );
}

export function CityDetailView({
  city,
  loadingCity,
  totalMunicipalities,
  activeCities,
  selectedIds,
  benchmarks,
  indicatorMeta,
  liveReading,
  envLoading,
  onSelectDetailCity,
  onAddToComparison,
  onRefreshEnv,
  onBackToComparison,
}: CityDetailViewProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<MunicipalitySummary[]>([]);
  const [pillarFilter, setPillarFilter] = useState<'all' | PillarKey>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Comunale' | 'Provinciale'>('all');

  useEffect(() => {
    if (!dropdownOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/municipalities/search?q=${encodeURIComponent(
            query.trim()
          )}&limit=10&sort=popolazione&dir=desc`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: MunicipalitySummary[] };
        if (!cancelled) setSearchResults(data.items);
      } catch {
        // ignore transient search cancel
      }
    }, 140);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, dropdownOpen]);

  const historicalItems: HistoricalCardItem[] = useMemo(() => {
    if (!city) return [];
    const list: HistoricalCardItem[] = [];

    // 1. Municipal MEF 2020-2024 historical indicators
    for (const def of MEF_INDICATOR_DEFS) {
      const pts = city.mefHistory
        .map((pt) => {
          const val = pt[def.key as keyof typeof pt];
          const benchPt = benchmarks.overall.mefHistory.find(
            (b) => b.year === pt.year
          );
          const benchVal = benchPt
            ? benchPt[def.key as keyof typeof benchPt]
            : undefined;
          if (typeof val !== 'number' || typeof benchVal !== 'number') return null;
          return { year: pt.year, value: val, benchmark: benchVal };
        })
        .filter((x): x is { year: number; value: number; benchmark: number } => x !== null);

      if (pts.length >= 2) {
        list.push({
          key: `mef-${def.key}`,
          label: def.label,
          pillar: def.pillar,
          scope: 'Comunale',
          source: 'MEF · 2020–2024',
          unit: def.unit,
          decimals: def.decimals,
          higherIsBetter: def.higherIsBetter,
          points: pts,
        });
      }
    }

    // 2. Provincial QDV 2020-2025 historical indicators
    for (const meta of Object.values(indicatorMeta)) {
      const pts = city.provHistory
        .map((pt) => {
          const val = pt[meta.key];
          const benchPt = benchmarks.overall.provHistory.find(
            (b) => b.year === pt.year
          );
          const benchVal = benchPt?.[meta.key];
          if (typeof val !== 'number' || typeof benchVal !== 'number') return null;
          return { year: pt.year, value: val, benchmark: benchVal };
        })
        .filter((x): x is { year: number; value: number; benchmark: number } => x !== null);

      if (pts.length >= 2) {
        list.push({
          key: `qdv-${meta.key}`,
          label: meta.label,
          pillar: meta.pillar,
          scope: 'Provinciale',
          source: `${meta.source} · ${pts[0].year}–${pts[pts.length - 1].year}`,
          unit: meta.unit,
          decimals: meta.decimals,
          higherIsBetter: meta.higherIsBetter,
          points: pts,
        });
      }
    }

    return list;
  }, [city, benchmarks, indicatorMeta]);

  const filteredHistorical = useMemo(
    () =>
      historicalItems.filter((item) => {
        if (pillarFilter !== 'all' && item.pillar !== pillarFilter) return false;
        if (scopeFilter !== 'all' && item.scope !== scopeFilter) return false;
        return true;
      }),
    [historicalItems, pillarFilter, scopeFilter]
  );

  if (loadingCity && !city) {
    return (
      <div className="bg-white border border-[#E5E3DC] rounded-lg p-8 animate-pulse space-y-4">
        <div className="h-7 bg-[#FAF9F6] rounded w-1/3" />
        <div className="h-4 bg-[#FAF9F6] rounded w-1/2" />
        <div className="h-64 bg-[#FAF9F6] rounded" />
      </div>
    );
  }

  if (!city) return null;

  const tierBenchmark = benchmarks.byTier[city.fascia];
  const isInComparison = selectedIds.includes(city.id);
  const canAddToComparison = !isInComparison && selectedIds.length < 4;

  const middleBracketPct = city.mef2024
    ? Math.max(
        0,
        Math.round(
          (100 -
            city.mef2024.quotaFasciaBassa15k -
            city.mef2024.quotaFasciaAlta55k) *
            10
        ) / 10
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* City Picker & Switcher Strip */}
      <section className="no-print bg-white border border-[#E5E3DC] rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onBackToComparison}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Torna al confronto</span>
          </button>

          <div className="relative w-full sm:w-80 shrink-0">
            <Search
              className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              placeholder={`Scegli tra ${formatNumberIt(totalMunicipalities)} comuni...`}
              aria-label="Cerca un comune italiano da analizzare in dettaglio"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
            />
            {dropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E5E3DC] rounded-lg shadow-sm max-h-72 overflow-y-auto z-30">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={() => {
                      onSelectDetailCity(item.id);
                      setQuery('');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#FAF9F6] border-b last:border-b-0 border-[#E5E3DC]/60 cursor-pointer"
                  >
                    <div className="text-sm font-medium text-[#18181B]">
                      {item.nome} ({item.sigla})
                    </div>
                    <div className="text-xs text-[#57534E]">
                      {item.regione} · {formatNumberIt(item.popolazione)} ab.
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activeCities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectDetailCity(c.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap cursor-pointer ${
                  c.id === city.id
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-[#FAF9F6] text-[#18181B] border-[#E5E3DC] hover:border-[#1E3A8A]'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>

        {canAddToComparison && (
          <button
            type="button"
            onClick={() => onAddToComparison(city.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#FAF9F6] border border-[#E5E3DC] rounded-md hover:border-[#1E3A8A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Aggiungi al confronto</span>
          </button>
        )}
      </section>

      {/* City Monograph Header */}
      <section className="bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E5E3DC]">
          <div>
            <p className="text-xs text-[#57534E]">
              Scheda Monografica Comunale · Codice ISTAT {city.codiceIstat} · {city.fascia}
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#18181B] mt-1.5 tracking-tight">
              {city.nome} ({city.sigla})
            </h1>
            <p className="text-sm text-[#57534E] mt-2">
              Provincia di {city.provincia} · {city.regione} · {city.ripartizione}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 font-mono tabular-nums">
            <div>
              <div className="text-[11px] font-sans text-[#57534E]">Popolazione</div>
              <div className="text-lg font-semibold text-[#18181B]">
                {formatNumberIt(city.popolazione)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-sans text-[#57534E]">Superficie / Densità</div>
              <div className="text-lg font-semibold text-[#18181B]">
                {formatNumberIt(city.superficieKm2, 1)} km²
              </div>
              <div className="text-[11px] text-[#57534E]">
                {formatNumberIt(city.densita, 0)} ab./km²
              </div>
            </div>
            <div>
              <div className="text-[11px] font-sans text-[#57534E]">Indice Complessivo</div>
              <div className="text-lg font-semibold text-[#1E3A8A]">
                {formatNumberIt(city.indiceComplessivo, 1)}/100
              </div>
              <div className="text-[11px] text-[#57534E]">
                Italia: {formatNumberIt(benchmarks.overall.indiceComplessivo, 1)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-sans text-[#57534E]">IRPEF Medio (2024)</div>
              <div className="text-lg font-semibold text-[#18181B]">
                {city.mef2024
                  ? `€ ${formatNumberIt(city.mef2024.redditoMedioImponibile, 0)}`
                  : 'N/D'}
              </div>
              <div className="text-[11px] text-[#57534E]">
                Italia: € {formatNumberIt(benchmarks.overall.mef2024.redditoMedioImponibile, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Monograph Body: Radar vs Tax/Air Breakdown */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-lg font-semibold text-[#18181B] mb-1">
              Profilo Sui 5 Pilastri vs Benchmark
            </h2>
            <p className="text-xs text-[#57534E] mb-3">
              Confronto con la media nazionale e la media dei comuni nella stessa fascia ({city.fascia})
            </p>
            <RadarChart
              series={[
                {
                  id: city.id,
                  label: city.nome,
                  scores: city.pillars,
                  colorHex: '#1E3A8A',
                  fillOpacity: 0.12,
                },
                {
                  id: 'tier',
                  label: `Media ${city.fascia.split(' ')[0]}`,
                  scores: tierBenchmark.pillars,
                  colorHex: '#9A3412',
                  dashed: true,
                  fillOpacity: 0.03,
                },
              ]}
              benchmarkScores={benchmarks.overall.pillars}
              benchmarkLabel="Media Italia"
              height={320}
            />
          </div>

          <div className="lg:col-span-7 space-y-6">
            {/* Municipal MEF Tax Brackets Breakdown */}
            <div className="border border-[#E5E3DC] rounded-md p-4 sm:p-5 bg-[#FAF9F6]/50">
              <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-[#E5E3DC]">
                <h2 className="font-serif text-lg font-semibold text-[#18181B]">
                  Struttura dei Redditi Comunali (MEF 2024)
                </h2>
                {city.mef2024 && (
                  <span className="font-mono text-xs text-[#57534E] tabular-nums">
                    {formatNumberIt(city.mef2024.contribuenti)} contribuenti
                  </span>
                )}
              </div>

              {city.mef2024 ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#57534E]">
                        Distribuzione contribuenti per scaglione di reddito
                      </span>
                      <span className="font-mono tabular-nums text-[#18181B]">
                        ≤15k: {city.mef2024.quotaFasciaBassa15k}% · 15–55k:{' '}
                        {middleBracketPct}% · &gt;55k: {city.mef2024.quotaFasciaAlta55k}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-xs overflow-hidden flex border border-[#E5E3DC]">
                      <div
                        style={{ width: `${city.mef2024.quotaFasciaBassa15k}%` }}
                        className="bg-[#9A3412]"
                        title={`Fascia ≤ 15.000 €: ${city.mef2024.quotaFasciaBassa15k}%`}
                      />
                      <div
                        style={{ width: `${middleBracketPct}%` }}
                        className="bg-[#1E3A8A]/75"
                        title={`Fascia 15.000–55.000 €: ${middleBracketPct}%`}
                      />
                      <div
                        style={{ width: `${city.mef2024.quotaFasciaAlta55k}%` }}
                        className="bg-[#14532D]"
                        title={`Fascia > 55.000 €: ${city.mef2024.quotaFasciaAlta55k}%`}
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
                    <div>
                      <dt className="text-[#57534E]">Lavoro dipendente</dt>
                      <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                        {formatNumberIt(city.mef2024.quotaLavoroDipendente, 1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Redditi da pensione</dt>
                      <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                        {formatNumberIt(city.mef2024.quotaPensioni, 1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Imposta netta media</dt>
                      <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                        € {formatNumberIt(city.mef2024.impostaNettaMedia, 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Addizionale comunale</dt>
                      <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                        € {formatNumberIt(city.mef2024.addizionaleProCapite, 1)}/ab.
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#57534E]">
                  Dati fiscali comunali non disponibili per questo codice ISTAT.
                </p>
              )}
            </div>

            {/* Live Open-Meteo Box for Single City */}
            <div className="border border-[#E5E3DC] rounded-md p-4 sm:p-5 bg-[#FAF9F6]/50">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E3DC]">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#18181B]">
                    Rilevazione Ambientale Live (Open-Meteo)
                  </h2>
                  <p className="text-[11px] text-[#57534E]">
                    Coordinate comunali: {city.lat?.toFixed(4) ?? '—'}, {city.lon?.toFixed(4) ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRefreshEnv(city.id)}
                  disabled={envLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E3A8A] bg-white border border-[#E5E3DC] rounded-md cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${envLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>Aggiorna</span>
                </button>
              </div>

              {liveReading?.available ? (
                <dl className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
                  <div>
                    <dt className="text-[#57534E]">Indice EAQI</dt>
                    <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                      {liveReading.europeanAqi ?? '—'} · {liveReading.aqiLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#57534E]">PM2.5</dt>
                    <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                      {liveReading.pm25 !== null ? `${formatNumberIt(liveReading.pm25, 1)} µg/m³` : 'N/D'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#57534E]">PM10</dt>
                    <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                      {liveReading.pm10 !== null ? `${formatNumberIt(liveReading.pm10, 1)} µg/m³` : 'N/D'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#57534E]">Temperatura</dt>
                    <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                      {liveReading.temperatureC !== null ? `${formatNumberIt(liveReading.temperatureC, 1)} °C` : 'N/D'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#57534E] inline-flex items-center gap-1">
                      <Wind className="w-3 h-3" aria-hidden="true" />
                      <span>Vento</span>
                    </dt>
                    <dd className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-0.5">
                      {liveReading.windSpeedKmh !== null ? `${formatNumberIt(liveReading.windSpeedKmh, 1)} km/h` : 'N/D'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-xs text-[#57534E]">
                  {envLoading ? 'Caricamento telemetria Open-Meteo...' : 'Dati live non ancora disponibili.'}
                </p>
              )}

              {liveReading?.fetchedAt && (
                <div className="mt-3 text-[11px] font-mono text-[#57534E]">
                  Ultimo rilevamento: {formatTimeIt(liveReading.fetchedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Historical Series Grid Across All Main Indicators */}
      <section aria-label="Andamento storico di tutti gli indicatori principali">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#18181B]">
              Andamento Storico Completo ({historicalItems.length} Indicatori Reali)
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Linea blu continua: {city.nome} · Linea tratteggiata: Media Italia · Passa il cursore sugli anni per leggere i singoli valori
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E3DC] rounded-md">
              {(['all', 'Comunale', 'Provinciale'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScopeFilter(sc)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm whitespace-nowrap cursor-pointer ${
                    scopeFilter === sc
                      ? 'bg-[#1E3A8A] text-white'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {sc === 'all' ? 'Tutti i livelli' : sc}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#E5E3DC] rounded-md">
              <button
                type="button"
                onClick={() => setPillarFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm whitespace-nowrap cursor-pointer ${
                  pillarFilter === 'all'
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Tutti ({historicalItems.length})
              </button>
              {PILLAR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPillarFilter(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm whitespace-nowrap cursor-pointer ${
                    pillarFilter === key
                      ? 'bg-[#1E3A8A] text-white'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {PILLAR_META[key].shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredHistorical.map((item) => (
            <MiniHistoricalChart key={item.key} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
