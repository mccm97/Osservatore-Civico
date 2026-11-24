export function formatNumberIt(value: number, decimals = 0): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMetricValue(
  value: number | null | undefined,
  unit: string,
  decimals: number
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/D';
  }
  const num = formatNumberIt(value, decimals);
  if (unit === '€') return `€ ${num}`;
  if (unit === '%') return `${num}%`;
  return `${num} ${unit}`;
}

export function getBenchmarkStatus(
  value: number,
  benchmark: number,
  higherIsBetter: boolean,
  decimals = 1
): {
  label: 'Sopra media' | 'In linea' | 'Sotto soglia';
  deltaText: string;
  toneClass: string;
} {
  const rawDiff = value - benchmark;
  const relPct = benchmark !== 0 ? (rawDiff / Math.abs(benchmark)) * 100 : 0;
  const effectivePct = higherIsBetter ? relPct : -relPct;

  const sign = rawDiff > 0 ? '+' : '';
  const deltaText = `${sign}${formatNumberIt(rawDiff, decimals)}`;

  if (effectivePct >= 4) {
    return {
      label: 'Sopra media',
      deltaText,
      toneClass: 'text-[#16A34A]',
    };
  }
  if (effectivePct <= -4) {
    return {
      label: 'Sotto soglia',
      deltaText,
      toneClass: 'text-[#DC2626]',
    };
  }
  return {
    label: 'In linea',
    deltaText,
    toneClass: 'text-[#D97706]',
  };
}

export function formatTimeIt(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
