import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CITY_PALETTE,
  MEF_INDICATOR_DEFS,
  PILLAR_KEYS,
  PILLAR_META,
} from '../data/constants';
import type {
  DataSourceInfo,
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  NationalBenchmarks,
  PillarKey,
} from '../types/civic';
import {
  formatMetricValue,
  formatNumberIt,
  getBenchmarkStatus,
} from '../utils/formatters';
import { LiveEnvironmentStrip } from './LiveEnvironmentStrip';
import { RadarChart } from './RadarChart';
import { TrendChart } from './TrendChart';

interface ComparisonViewProps {
  totalMunicipalities: number;
  cities: Municipality[];
  benchmarks: NationalBenchmarks;
  indicatorMeta: Record<string, IndicatorMeta>;
  sources: DataSourceInfo[];
  benchmarkMode: 'national' | 'tier';
  liveEnv: Record<string, LiveEnvironmentReading>;
  envLoading: boolean;
  envError: string | null;
  onRefreshEnv: () => void;
  onOpenRankings: () => void;
  onOpenCityDetail: (id: string) => void;
}

export function ComparisonView({
  totalMunicipalities,
  cities,
  benchmarks,
  indicatorMeta,
  sources,
  benchmarkMode,
  liveEnv,
  envLoading,
  envError,
  onRefreshEnv,
  onOpenRankings,
  onOpenCityDetail,
}: ComparisonViewProps) {
  const [pillarFilter, setPillarFilter] = useState<'all' | PillarKey>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'Comunale' | 'Provinciale'>('all');

  const primaryCity = cities[0];
  const activeBenchmarkScores = useMemo(() => {
    if (benchmarkMode === 'tier' && primaryCity) {
      return benchmarks.byTier[primaryCity.fascia].pillars;
    }
    return benchmarks.overall.pillars;
  }, [benchmarkMode, benchmarks, primaryCity]);

  const activeBenchmarkOverall =
    benchmarkMode === 'tier' && primaryCity
      ? benchmarks.byTier[primaryCity.fascia].indiceComplessivo
      : benchmarks.overall.indiceComplessivo;

  const benchmarkLabel =
    benchmarkMode === 'tier' && primaryCity
      ? `Media ${primaryCity.fascia.split(' ')[0]}`
      : 'Media Italia';

  const radarSeries = useMemo(
    () =>
      cities.map((city, idx) => ({
        id: city.id,
        label: city.nome,
        scores: city.pillars,
        colorHex: CITY_PALETTE[idx % CITY_PALETTE.length].hex,
        fillOpacity: 0.09,
      })),
    [cities]
  );

  const allIndicators = useMemo(() => {
    const provList = Object.values(indicatorMeta);
    return [...MEF_INDICATOR_DEFS, ...provList];
  }, [indicatorMeta]);

  const visibleIndicators = useMemo(() => {
    return allIndicators.filter((def) => {
      if (pillarFilter !== 'all' && def.pillar !== pillarFilter) return false;
      if (scopeFilter !== 'all' && def.scope !== scopeFilter) return false;
      return true;
    });
  }, [allIndicators, pillarFilter, scopeFilter]);

  return (
    <div className="space-y-8">
      {/* Editorial Header & Head-to-Head Summary Strip */}
      <section aria-label="Sintesi confronto comuni">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
          <div>
            <p className="text-xs text-[#57534E] tracking-wide">
              Fonti ufficiali integrate: ISTAT · MEF Dip. Finanze (2020–2024) · Sole 24 Ore QDV (2020–2025) · Open-Meteo Live
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#18181B] mt-1.5 tracking-tight">
              Confronto Testa a Testa tra Comuni Italiani
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#57534E] shrink-0">
            <span>
              Benchmark su {formatNumberIt(totalMunicipalities)} comuni:{' '}
              <strong className="font-mono text-[#18181B] tabular-nums">
                {formatNumberIt(activeBenchmarkOverall, 1)}/100
              </strong>{' '}
              ({benchmarkLabel})
            </span>
            <button
              type="button"
              onClick={onOpenRankings}
              className="text-[#1E3A8A] font-semibold hover:underline whitespace-nowrap cursor-pointer"
            >
              Esplora tutti i {formatNumberIt(totalMunicipalities)} comuni
            </button>
          </div>
        </div>

        {/* City Executive Cards */}
        <div
          className={`mt-6 grid grid-cols-1 md:grid-cols-2 ${
            cities.length >= 3 ? 'xl:grid-cols-3' : ''
          } ${cities.length === 4 ? '2xl:grid-cols-4' : ''} gap-5`}
        >
          {cities.map((city, idx) => {
            const colorHex = CITY_PALETTE[idx % CITY_PALETTE.length].hex;
            const diff = city.indiceComplessivo - activeBenchmarkOverall;

            return (
              <article
                key={city.id}
                className="bg-white border border-[#E5E3DC] rounded-lg p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        <h2 className="font-serif text-2xl font-semibold text-[#18181B] truncate">
                          {city.nome}
                        </h2>
                      </div>
                      <p className="text-xs text-[#57534E] mt-1">
                        {city.provincia} ({city.sigla}) · {city.regione} · ISTAT {city.codiceIstat}
                      </p>
                      <p className="text-xs font-mono text-[#57534E] tabular-nums mt-0.5">
                        {formatNumberIt(city.popolazione)} ab. · {formatNumberIt(city.superficieKm2, 1)} km²
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                        {formatNumberIt(city.indiceComplessivo, 1)}
                      </div>
                      <div className="text-[11px] font-mono text-[#57534E] tabular-nums">
                        Indice /100
                      </div>
                    </div>
                  </div>

                  {/* Five-pillar compact bars */}
                  <div className="mt-4 pt-4 border-t border-[#E5E3DC] space-y-2">
                    {PILLAR_KEYS.map((key) => {
                      const val = city.pillars[key];
                      const bench = activeBenchmarkScores[key];
                      return (
                        <div key={key} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[#57534E]">
                              {PILLAR_META[key].shortLabel}
                            </span>
                            <span className="font-mono tabular-nums text-[#18181B] font-medium">
                              {formatNumberIt(val, 1)}{' '}
                              <span className="text-[11px] text-[#57534E]">
                                ({val - bench >= 0 ? '+' : ''}
                                {formatNumberIt(val - bench, 1)})
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#FAF9F6] border border-[#E5E3DC]/70 rounded-xs overflow-hidden">
                            <div
                              className="h-full transition-all duration-200"
                              style={{
                                width: `${val}%`,
                                backgroundColor: colorHex,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real MEF 2024 Municipal Highlight + Benchmark Delta */}
                <div className="mt-4 pt-3 border-t border-[#E5E3DC] flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 font-mono font-medium tabular-nums ${
                      diff >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {diff > 0.5 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : diff < -0.5 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>
                      {diff >= 0 ? '+' : ''}
                      {formatNumberIt(diff, 1)} vs {benchmarkLabel}
                    </span>
                  </span>

                  <span className="font-mono text-[#18181B] tabular-nums">
                    IRPEF:{' '}
                    {city.mef2024
                      ? `€ ${formatNumberIt(city.mef2024.redditoMedioImponibile, 0)}`
                      : 'N/D'}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E5E3DC]/70 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenCityDetail(city.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    <span>Analizza storico e scheda</span>
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Main Analytical Visualizations: Radar (Left) + Historical Real Series (Right) */}
      <section
        aria-label="Analisi comparativa radar e serie storiche ufficiali"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        <div className="lg:col-span-5 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[#E5E3DC]">
              <h2 className="font-serif text-xl font-semibold text-[#18181B]">
                Profilo Normalizzato sui 5 Pilastri
              </h2>
              <p className="text-xs text-[#57534E] mt-1">
                Punteggi 0–100 calcolati per normalizzazione (2°–98° percentile) sui dati reali comunali e provinciali rispetto a {benchmarkLabel}
              </p>
            </div>
            <div className="mt-4">
              <RadarChart
                series={radarSeries}
                benchmarkScores={activeBenchmarkScores}
                benchmarkLabel={benchmarkLabel}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[#E5E3DC] mb-4">
              <h2 className="font-serif text-xl font-semibold text-[#18181B]">
                Serie Storiche Ufficiali (2020–2025)
              </h2>
              <p className="text-xs text-[#57534E] mt-1">
                Andamento reale da dichiarazioni fiscali comunali MEF (2020–2024) e serie storiche provinciali ISTAT / Prometeia / SIAE / ACI (2020–2025)
              </p>
            </div>
            <TrendChart cities={cities} benchmarks={benchmarks} />
          </div>
        </div>
      </section>

      {/* Real-time Open-Meteo Air Quality + 48h Real Hourly Trend */}
      <LiveEnvironmentStrip
        cities={cities}
        liveEnv={liveEnv}
        envLoading={envLoading}
        envError={envError}
        onRefreshEnv={onRefreshEnv}
      />

      {/* Granular 30 Real Indicators Matrix with Explicit Source & Scope */}
      <section
        aria-label="Matrice analitica degli indicatori ufficiali"
        className="bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6"
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#18181B]">
              Indicatori Ufficiali Reali ({allIndicators.length} variabili certificate)
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Ogni riga riporta il livello geografico esatto (Comunale o Provinciale), la fonte primaria e l’anno di rilevazione ufficiale
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md">
              {(['all', 'Comunale', 'Provinciale'] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScopeFilter(sc)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm whitespace-nowrap shrink-0 cursor-pointer ${
                    scopeFilter === sc
                      ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {sc === 'all' ? 'Tutti i livelli' : `Livello ${sc}`}
                </button>
              ))}
            </div>

            {/* Pillar Filter */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md">
              <button
                type="button"
                onClick={() => setPillarFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  pillarFilter === 'all'
                    ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                Tutti ({allIndicators.length})
              </button>
              {PILLAR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPillarFilter(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    pillarFilter === key
                      ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {PILLAR_META[key].shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-[#E5E3DC] text-xs font-medium text-[#57534E]">
                <th className="py-3 pr-4">Indicatore Ufficiale</th>
                <th className="py-3 px-3">Livello · Fonte</th>
                <th className="py-3 px-3 text-right">Media Italia</th>
                {cities.map((city, idx) => {
                  const colorHex = CITY_PALETTE[idx % CITY_PALETTE.length].hex;
                  return (
                    <th key={city.id} className="py-3 pl-4 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5 text-[#18181B] font-semibold">
                        <span
                          className="w-2 h-2 rounded-xs inline-block"
                          style={{ backgroundColor: colorHex }}
                        />
                        <span>{city.nome}</span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC]/70 text-sm">
              {visibleIndicators.map((def) => {
                const isMunicipal = def.scope === 'Comunale';
                const natVal = isMunicipal
                  ? benchmarks.overall.mef2024[
                      def.key as keyof typeof benchmarks.overall.mef2024
                    ]
                  : benchmarks.overall.provMetrics[def.key];

                return (
                  <tr
                    key={`${def.scope}-${def.key}`}
                    className="hover:bg-[#FAF9F6]/80 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-medium text-[#18181B] text-xs sm:text-sm">
                        {def.label}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {PILLAR_META[def.pillar].shortLabel}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#57534E] whitespace-nowrap">
                      <div className="font-medium text-[#18181B]">{def.scope}</div>
                      <div className="text-[11px]">
                        {def.source} · {def.referenceYear}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-[#57534E] tabular-nums whitespace-nowrap">
                      {formatMetricValue(natVal, def.unit, def.decimals)}
                    </td>
                    {cities.map((city) => {
                      const val = isMunicipal
                        ? city.mef2024?.[
                            def.key as keyof NonNullable<Municipality['mef2024']>
                          ]
                        : city.provMetrics[def.key];

                      if (val === null || val === undefined || natVal === undefined) {
                        return (
                          <td
                            key={`${def.key}-${city.id}`}
                            className="py-3 pl-4 text-right font-mono text-xs text-[#57534E]"
                          >
                            N/D
                          </td>
                        );
                      }

                      const status = getBenchmarkStatus(
                        val,
                        natVal,
                        def.higherIsBetter,
                        def.decimals
                      );
                      return (
                        <td
                          key={`${def.key}-${city.id}`}
                          className="py-3 pl-4 text-right whitespace-nowrap"
                        >
                          <div className="font-mono text-sm font-semibold text-[#18181B] tabular-nums">
                            {formatMetricValue(val, def.unit, def.decimals)}
                          </div>
                          <div
                            className={`text-[11px] font-mono tabular-nums ${status.toneClass}`}
                          >
                            {status.deltaText} · {status.label}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Methodological Note & Sources */}
        <div className="mt-6 pt-4 border-t border-[#E5E3DC] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-[#57534E]">
          {sources.map((src) => (
            <div key={src.name}>
              <div className="font-medium text-[#18181B]">{src.name}</div>
              <div className="mt-0.5">
                {src.scope} · {src.year}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
