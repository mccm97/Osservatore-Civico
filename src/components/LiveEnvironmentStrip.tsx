import { RefreshCw, Wind } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CITY_PALETTE } from '../data/constants';
import type { LiveEnvironmentReading, Municipality } from '../types/civic';
import { formatNumberIt, formatTimeIt } from '../utils/formatters';

interface LiveEnvironmentStripProps {
  cities: Municipality[];
  liveEnv: Record<string, LiveEnvironmentReading>;
  envLoading: boolean;
  envError: string | null;
  onRefreshEnv: () => void;
}

function getAqiTone(label: LiveEnvironmentReading['aqiLabel']): string {
  switch (label) {
    case 'Ottima':
    case 'Buona':
      return 'text-[#16A34A]';
    case 'Moderata':
      return 'text-[#D97706]';
    case 'Scarsa':
    case 'Critica':
      return 'text-[#DC2626]';
    default:
      return 'text-[#57534E]';
  }
}

export function LiveEnvironmentStrip({
  cities,
  liveEnv,
  envLoading,
  envError,
  onRefreshEnv,
}: LiveEnvironmentStripProps) {
  const [hourlyMetric, setHourlyMetric] = useState<'pm25' | 'europeanAqi'>(
    'pm25'
  );

  // Build aligned 48h real Open-Meteo hourly chart across selected cities
  const hourlyPlot = useMemo(() => {
    const firstWithData = cities
      .map((c) => liveEnv[c.id])
      .find((r) => r && r.available && r.hourlySeries.length > 0);
    if (!firstWithData) return null;

    const times = firstWithData.hourlySeries.map((p) => p.time);
    const values: number[] = [];
    for (const c of cities) {
      const r = liveEnv[c.id];
      if (!r?.hourlySeries) continue;
      for (const pt of r.hourlySeries) {
        const v = pt[hourlyMetric];
        if (typeof v === 'number') values.push(v);
      }
    }
    if (values.length === 0) return null;

    const minV = 0;
    const maxV = Math.max(10, Math.ceil(Math.max(...values) * 1.15));
    return { times, minV, maxV };
  }, [cities, liveEnv, hourlyMetric]);

  const width = 920;
  const height = 180;
  const padL = 42;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  return (
    <section
      aria-label="Telemetria ambientale reale Open-Meteo"
      className="bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
        <div>
          <h2 className="font-serif text-xl font-semibold text-[#18181B]">
            Qualità dell’Aria & Meteo Reali in Tempo Reale (Open-Meteo)
          </h2>
          <p className="text-xs text-[#57534E] mt-1">
            Rilevazioni reali alle coordinate comunali esatte (EAQI, PM2.5, PM10, NO₂, temperatura, vento) e serie oraria osservata delle ultime 48 ore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRefreshEnv}
            disabled={envLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-[#1E3A8A] bg-[#FAF9F6] border border-[#E5E3DC] rounded-md hover:border-[#1E3A8A]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${envLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Aggiorna dati Open-Meteo</span>
          </button>
        </div>
      </div>

      {envError && (
        <div className="mt-4 p-3 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md flex items-center justify-between gap-4 text-xs">
          <span className="text-[#DC2626] font-medium">
            Errore nel recupero dati Open-Meteo: {envError}
          </span>
          <button
            type="button"
            onClick={onRefreshEnv}
            className="text-[#1E3A8A] font-semibold hover:underline shrink-0 cursor-pointer"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Current Live Readings per Municipality */}
      <div
        className={`mt-5 grid grid-cols-1 md:grid-cols-2 ${
          cities.length >= 3 ? 'xl:grid-cols-3' : ''
        } ${cities.length === 4 ? '2xl:grid-cols-4' : ''} gap-5`}
      >
        {cities.map((city, idx) => {
          const reading = liveEnv[city.id];
          const colorHex = CITY_PALETTE[idx % CITY_PALETTE.length].hex;

          return (
            <div
              key={city.id}
              className="border border-[#E5E3DC] rounded-md p-4 bg-[#FAF9F6]/55 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-[#E5E3DC]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="font-semibold text-sm text-[#18181B] truncate">
                      {city.nome}
                    </span>
                  </div>
                  {reading?.available ? (
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${getAqiTone(
                        reading.aqiLabel
                      )}`}
                    >
                      EAQI {reading.europeanAqi ?? '—'} · {reading.aqiLabel}
                    </span>
                  ) : reading && !reading.available ? (
                    <span className="text-xs text-[#DC2626]">Non disponibile</span>
                  ) : (
                    <span className="text-xs text-[#57534E]">Caricamento...</span>
                  )}
                </div>

                {envLoading && !reading ? (
                  <div className="py-4 space-y-2 animate-pulse">
                    <div className="h-3 bg-[#E5E3DC] rounded w-3/4" />
                    <div className="h-3 bg-[#E5E3DC] rounded w-1/2" />
                  </div>
                ) : reading?.available ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[#57534E]">PM2.5 / PM10</dt>
                      <dd className="font-mono font-medium text-[#18181B] tabular-nums mt-0.5">
                        {reading.pm25 !== null ? formatNumberIt(reading.pm25, 1) : 'N/D'} /{' '}
                        {reading.pm10 !== null ? formatNumberIt(reading.pm10, 1) : 'N/D'} µg/m³
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">NO₂ biossido</dt>
                      <dd className="font-mono font-medium text-[#18181B] tabular-nums mt-0.5">
                        {reading.no2 !== null ? `${formatNumberIt(reading.no2, 1)} µg/m³` : 'N/D'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E]">Temperatura</dt>
                      <dd className="font-mono font-medium text-[#18181B] tabular-nums mt-0.5">
                        {reading.temperatureC !== null
                          ? `${formatNumberIt(reading.temperatureC, 1)} °C`
                          : 'N/D'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#57534E] inline-flex items-center gap-1">
                        <Wind className="w-3 h-3" aria-hidden="true" />
                        <span>Vento</span>
                      </dt>
                      <dd className="font-mono font-medium text-[#18181B] tabular-nums mt-0.5">
                        {reading.windSpeedKmh !== null
                          ? `${formatNumberIt(reading.windSpeedKmh, 1)} km/h`
                          : 'N/D'}
                      </dd>
                    </div>
                  </dl>
                ) : reading ? (
                  <p className="mt-3 text-xs text-[#57534E]">
                    {reading.error ?? 'Dato non disponibile al momento.'}
                  </p>
                ) : null}
              </div>

              {reading && (
                <div className="mt-3 pt-2.5 border-t border-[#E5E3DC] text-[11px] font-mono text-[#57534E] flex items-center justify-between">
                  <span>
                    Coord. {city.lat !== null ? city.lat.toFixed(2) : '—'},{' '}
                    {city.lon !== null ? city.lon.toFixed(2) : '—'}
                  </span>
                  <span>Rilevato {formatTimeIt(reading.fetchedAt)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real 48h Hourly Air Quality Comparison Chart */}
      {hourlyPlot && (
        <div className="mt-6 pt-5 border-t border-[#E5E3DC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#18181B]">
                Andamento Orario Reale — Ultime 48 Ore (Open-Meteo)
              </h3>
              <p className="text-[11px] text-[#57534E]">
                Valori orari effettivi registrati alle coordinate dei comuni selezionati
              </p>
            </div>
            <div className="inline-flex p-0.5 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md self-start">
              <button
                type="button"
                onClick={() => setHourlyMetric('pm25')}
                className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer ${
                  hourlyMetric === 'pm25'
                    ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                PM2.5 (µg/m³)
              </button>
              <button
                type="button"
                onClick={() => setHourlyMetric('europeanAqi')}
                className={`px-3 py-1 text-xs font-medium rounded-sm cursor-pointer ${
                  hourlyMetric === 'europeanAqi'
                    ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                European AQI
              </button>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="img"
            aria-label="Grafico orario reale delle ultime 48 ore di qualità dell'aria"
          >
            {[0, 0.5, 1].map((t, i) => {
              const val = Math.round(hourlyPlot.minV + t * (hourlyPlot.maxV - hourlyPlot.minV));
              const y =
                padT +
                ((hourlyPlot.maxV - val) /
                  Math.max(1, hourlyPlot.maxV - hourlyPlot.minV)) *
                  plotH;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="#E5E3DC"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-[#57534E]"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {hourlyPlot.times.map((t, idx) => {
              if (idx % 12 !== 0 && idx !== hourlyPlot.times.length - 1) return null;
              const x =
                padL +
                (idx / Math.max(1, hourlyPlot.times.length - 1)) * plotW;
              const label = `${t.slice(8, 10)}/${t.slice(5, 7)} ${t.slice(11, 16)}`;
              return (
                <text
                  key={t}
                  x={x}
                  y={height - 6}
                  textAnchor={
                    idx === 0
                      ? 'start'
                      : idx === hourlyPlot.times.length - 1
                      ? 'end'
                      : 'middle'
                  }
                  className="text-[10px] font-mono fill-[#57534E]"
                >
                  {label}
                </text>
              );
            })}

            {cities.map((city, cIdx) => {
              const r = liveEnv[city.id];
              if (!r?.hourlySeries?.length) return null;
              const color = CITY_PALETTE[cIdx % CITY_PALETTE.length].hex;
              let d = '';
              r.hourlySeries.forEach((pt, idx) => {
                const v = pt[hourlyMetric];
                if (typeof v !== 'number') return;
                const x =
                  padL +
                  (idx / Math.max(1, r.hourlySeries.length - 1)) * plotW;
                const y =
                  padT +
                  ((hourlyPlot.maxV - v) /
                    Math.max(1, hourlyPlot.maxV - hourlyPlot.minV)) *
                    plotH;
                d += `${d === '' ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
              });
              return (
                <path
                  key={city.id}
                  d={d.trim()}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                />
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
