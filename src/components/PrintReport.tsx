import {
  MEF_INDICATOR_DEFS,
  PILLAR_KEYS,
  PILLAR_META,
} from '../data/constants';
import type {
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  NationalBenchmarks,
} from '../types/civic';
import { formatMetricValue, formatNumberIt } from '../utils/formatters';

interface PrintReportProps {
  cities: Municipality[];
  benchmarks: NationalBenchmarks;
  indicatorMeta: Record<string, IndicatorMeta>;
  liveEnv: Record<string, LiveEnvironmentReading>;
}

export function PrintReport({
  cities,
  benchmarks,
  indicatorMeta,
  liveEnv,
}: PrintReportProps) {
  const today = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const allDefs = [...MEF_INDICATOR_DEFS, ...Object.values(indicatorMeta)];

  return (
    <div className="hidden print-only text-[#18181B] bg-white">
      <div className="border-b-2 border-[#18181B] pb-4 mb-6 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#57534E]">
            Osservatorio Civico Italia · Rapporto su Dati Ufficiali (ISTAT / MEF / QDV / Open-Meteo)
          </div>
          <h1 className="font-serif text-2xl font-bold mt-1">
            Scheda Comparativa Comuni Italiani
          </h1>
        </div>
        <div className="text-xs font-mono text-[#57534E]">Data: {today}</div>
      </div>

      <h2 className="font-serif text-lg font-semibold mb-2">
        1. Profilo Normalizzato sui Cinque Pilastri (Scala 0–100)
      </h2>
      <table className="w-full text-left border-collapse text-xs mb-6">
        <thead>
          <tr className="border-b border-[#18181B]">
            <th className="py-2 pr-3">Dimensione</th>
            <th className="py-2 px-3 text-right">Media Italia</th>
            {cities.map((c) => (
              <th key={c.id} className="py-2 pl-3 text-right">
                {c.nome} ({c.sigla})
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E3DC]">
          <tr className="font-semibold bg-[#FAF9F6]">
            <td className="py-2 pr-3">Indice Sintetico Complessivo</td>
            <td className="py-2 px-3 text-right font-mono tabular-nums">
              {formatNumberIt(benchmarks.overall.indiceComplessivo, 1)}
            </td>
            {cities.map((c) => (
              <td key={c.id} className="py-2 pl-3 text-right font-mono tabular-nums">
                {formatNumberIt(c.indiceComplessivo, 1)}
              </td>
            ))}
          </tr>
          {PILLAR_KEYS.map((key) => (
            <tr key={key}>
              <td className="py-1.5 pr-3">{PILLAR_META[key].label}</td>
              <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                {formatNumberIt(benchmarks.overall.pillars[key], 1)}
              </td>
              {cities.map((c) => (
                <td key={c.id} className="py-1.5 pl-3 text-right font-mono tabular-nums">
                  {formatNumberIt(c.pillars[key], 1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-serif text-lg font-semibold mb-2">
        2. Qualità dell’Aria & Meteo Live (Open-Meteo)
      </h2>
      <table className="w-full text-left border-collapse text-xs mb-6">
        <thead>
          <tr className="border-b border-[#18181B]">
            <th className="py-2 pr-3">Comune</th>
            <th className="py-2 px-3 text-right">EAQI</th>
            <th className="py-2 px-3 text-right">PM2.5 (µg/m³)</th>
            <th className="py-2 px-3 text-right">PM10 (µg/m³)</th>
            <th className="py-2 pl-3 text-right">Temperatura</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E3DC]">
          {cities.map((c) => {
            const env = liveEnv[c.id];
            return (
              <tr key={c.id}>
                <td className="py-1.5 pr-3 font-medium">
                  {c.nome} ({c.sigla})
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                  {env?.available && env.europeanAqi !== null
                    ? `${env.europeanAqi} (${env.aqiLabel})`
                    : 'N/D'}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                  {env?.pm25 !== null && env?.pm25 !== undefined
                    ? formatNumberIt(env.pm25, 1)
                    : 'N/D'}
                </td>
                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                  {env?.pm10 !== null && env?.pm10 !== undefined
                    ? formatNumberIt(env.pm10, 1)
                    : 'N/D'}
                </td>
                <td className="py-1.5 pl-3 text-right font-mono tabular-nums">
                  {env?.temperatureC !== null && env?.temperatureC !== undefined
                    ? `${formatNumberIt(env.temperatureC, 1)} °C`
                    : 'N/D'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="font-serif text-lg font-semibold mb-2">
        3. Indicatori Ufficiali Comunali (MEF) e Provinciali (ISTAT / QDV 2025)
      </h2>
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-[#18181B]">
            <th className="py-1.5 pr-3">Indicatore</th>
            <th className="py-1.5 px-2">Livello · Fonte</th>
            <th className="py-1.5 px-2 text-right">Media Italia</th>
            {cities.map((c) => (
              <th key={c.id} className="py-1.5 pl-2 text-right">
                {c.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E3DC]">
          {allDefs.map((def) => {
            const isMuni = def.scope === 'Comunale';
            const natVal = isMuni
              ? benchmarks.overall.mef2024[
                  def.key as keyof typeof benchmarks.overall.mef2024
                ]
              : benchmarks.overall.provMetrics[def.key];

            return (
              <tr key={`${def.scope}-${def.key}`}>
                <td className="py-1 pr-3">{def.label}</td>
                <td className="py-1 px-2 text-[#57534E]">
                  {def.scope} · {def.source} ({def.referenceYear})
                </td>
                <td className="py-1 px-2 text-right font-mono tabular-nums">
                  {formatMetricValue(natVal, def.unit, def.decimals)}
                </td>
                {cities.map((c) => {
                  const val = isMuni
                    ? c.mef2024?.[
                        def.key as keyof NonNullable<Municipality['mef2024']>
                      ]
                    : c.provMetrics[def.key];
                  return (
                    <td
                      key={c.id}
                      className="py-1 pl-2 text-right font-mono tabular-nums"
                    >
                      {formatMetricValue(val, def.unit, def.decimals)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
