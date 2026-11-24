import { MEF_INDICATOR_DEFS, PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type {
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  NationalBenchmarks,
} from '../types/civic';

function escapeCsvCell(cell: string | number): string {
  const str = String(cell);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportComparisonCsv(
  cities: Municipality[],
  benchmarks: NationalBenchmarks,
  indicatorMeta: Record<string, IndicatorMeta>,
  liveEnv: Record<string, LiveEnvironmentReading>
): void {
  const headers = [
    'Pilastro / Sezione',
    'Indicatore',
    'Livello',
    'Fonte e Anno',
    'Unita',
    'Media Italia',
    ...cities.map((c) => `${c.nome} (${c.sigla})`),
  ];

  const rows: (string | number)[][] = [];

  rows.push([
    'Anagrafica',
    'Codice ISTAT',
    'Comunale',
    'ISTAT · 2025',
    'codice',
    '-',
    ...cities.map((c) => c.codiceIstat),
  ]);
  rows.push([
    'Anagrafica',
    'Popolazione residente',
    'Comunale',
    'ISTAT · 2025',
    'ab.',
    '-',
    ...cities.map((c) => c.popolazione),
  ]);
  rows.push([
    'Anagrafica',
    'Superficie territoriale',
    'Comunale',
    'ISTAT · 2025',
    'km2',
    '-',
    ...cities.map((c) => c.superficieKm2),
  ]);
  rows.push([
    'Sintesi Normalizzata',
    'Indice Sintetico Complessivo',
    'Comunale+Provinciale',
    'Elaborazione su dati ISTAT/MEF/QDV',
    '/100',
    benchmarks.overall.indiceComplessivo,
    ...cities.map((c) => c.indiceComplessivo),
  ]);

  for (const pillar of PILLAR_KEYS) {
    rows.push([
      'Pilastro Normalizzato',
      PILLAR_META[pillar].label,
      'Comunale+Provinciale',
      'Elaborazione su dati reali',
      '/100',
      benchmarks.overall.pillars[pillar],
      ...cities.map((c) => c.pillars[pillar]),
    ]);
  }

  for (const def of MEF_INDICATOR_DEFS) {
    const natVal =
      benchmarks.overall.mef2024[
        def.key as keyof typeof benchmarks.overall.mef2024
      ] ?? '-';
    rows.push([
      PILLAR_META[def.pillar].shortLabel,
      def.label,
      def.scope,
      `${def.source} · ${def.referenceYear}`,
      def.unit,
      natVal,
      ...cities.map(
        (c) =>
          c.mef2024?.[def.key as keyof typeof c.mef2024] ?? 'N/D'
      ),
    ]);
  }

  for (const def of Object.values(indicatorMeta)) {
    const natVal = benchmarks.overall.provMetrics[def.key] ?? '-';
    rows.push([
      PILLAR_META[def.pillar].shortLabel,
      def.label,
      def.scope,
      `${def.source} · ${def.referenceYear}`,
      def.unit,
      natVal,
      ...cities.map((c) => c.provMetrics[def.key] ?? 'N/D'),
    ]);
  }

  rows.push([
    'Ambiente Live',
    'Indice Qualita Aria Europeo (EAQI)',
    'Comunale',
    'Open-Meteo Live',
    'indice',
    '-',
    ...cities.map((c) => liveEnv[c.id]?.europeanAqi ?? 'N/D'),
  ]);
  rows.push([
    'Ambiente Live',
    'Particolato PM2.5',
    'Comunale',
    'Open-Meteo Live',
    'ug/m3',
    '-',
    ...cities.map((c) => liveEnv[c.id]?.pm25 ?? 'N/D'),
  ]);
  rows.push([
    'Ambiente Live',
    'Particolato PM10',
    'Comunale',
    'Open-Meteo Live',
    'ug/m3',
    '-',
    ...cities.map((c) => liveEnv[c.id]?.pm10 ?? 'N/D'),
  ]);

  const csvLines = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const slug = cities.map((c) => c.nome.toLowerCase().replace(/\s+/g, '-')).join('-');
  link.href = url;
  link.download = `osservatorio-civico-reale-${slug || 'confronto'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
