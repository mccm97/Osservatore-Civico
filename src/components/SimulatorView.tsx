import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type {
  Municipality,
  NationalBenchmarks,
  PillarScores,
  PolicySimulationLevers,
} from '../types/civic';
import { formatNumberIt } from '../utils/formatters';
import { RadarChart, type RadarSeries } from './RadarChart';

interface SimulatorViewProps {
  activeCities: Municipality[];
  benchmarks: NationalBenchmarks;
}

const DEFAULT_LEVERS: PolicySimulationLevers = {
  transizioneVerde: 10,
  digitalizzazionePA: 15,
  welfareInfanzia: 10,
  attrattivitaImprese: 10,
  efficienzaFiscale: 15,
  orizzonteAnni: 3,
};

const LEVER_CONFIG: {
  key: keyof Omit<PolicySimulationLevers, 'orizzonteAnni'>;
  label: string;
  description: string;
}[] = [
  {
    key: 'transizioneVerde',
    label: 'Transizione Verde, TPL & Rinnovabili',
    description:
      'Impatto ipotetico su ecosistema urbano, raccolta differenziata e fonti rinnovabili.',
  },
  {
    key: 'digitalizzazionePA',
    label: 'Digitalizzazione PA & Servizi Online',
    description:
      'Impatto ipotetico su servizi digitali alle famiglie e tempi amministrativi.',
  },
  {
    key: 'welfareInfanzia',
    label: 'Coesione Sociale, Istruzione & Terzo Settore',
    description:
      'Impatto ipotetico su inclusione sociale, istruzione e supporto alle fasce deboli.',
  },
  {
    key: 'attrattivitaImprese',
    label: 'Attrattività Imprese, Startup & Lavoro',
    description:
      'Impatto ipotetico su occupazione, startup innovative ed export territoriale.',
  },
  {
    key: 'efficienzaFiscale',
    label: 'Efficienza Riscossione & Puntualità Pagamenti',
    description:
      'Impatto ipotetico su capacità di riscossione comunale e pagamenti ai fornitori.',
  },
];

function clampScore(v: number): number {
  return Math.round(Math.max(15, Math.min(99, v)) * 10) / 10;
}

export function SimulatorView({
  activeCities,
  benchmarks,
}: SimulatorViewProps) {
  const [targetId, setTargetId] = useState<string>(
    activeCities[0]?.id ?? ''
  );
  const [referenceCityId, setReferenceCityId] = useState<string>(
    activeCities[1]?.id ?? ''
  );
  const [levers, setLevers] = useState<PolicySimulationLevers>(DEFAULT_LEVERS);

  useEffect(() => {
    if (!activeCities.some((c) => c.id === targetId) && activeCities[0]) {
      setTargetId(activeCities[0].id);
    }
  }, [activeCities, targetId]);

  const targetCity = useMemo(
    () => activeCities.find((m) => m.id === targetId) ?? activeCities[0],
    [activeCities, targetId]
  );

  const referenceCity = useMemo(
    () => activeCities.find((m) => m.id === referenceCityId) ?? null,
    [activeCities, referenceCityId]
  );

  const simulation = useMemo(() => {
    if (!targetCity) return null;
    const horizonMultiplier =
      levers.orizzonteAnni === 1 ? 0.45 : levers.orizzonteAnni === 3 ? 0.85 : 1.18;
    const base = targetCity.pillars;

    const fiscalPressure =
      (levers.transizioneVerde + levers.welfareInfanzia + levers.attrattivitaImprese) *
      0.06;

    const projected: PillarScores = {
      economia: clampScore(
        base.economia +
          (levers.attrattivitaImprese * 0.24 +
            levers.digitalizzazionePA * 0.08 +
            levers.efficienzaFiscale * 0.06) *
            horizonMultiplier
      ),
      finanza: clampScore(
        base.finanza +
          (levers.efficienzaFiscale * 0.28 +
            levers.digitalizzazionePA * 0.09 -
            fiscalPressure) *
            horizonMultiplier
      ),
      qualita: clampScore(
        base.qualita +
          (levers.digitalizzazionePA * 0.16 +
            levers.transizioneVerde * 0.12 +
            levers.welfareInfanzia * 0.14) *
            horizonMultiplier
      ),
      sociale: clampScore(
        base.sociale +
          (levers.welfareInfanzia * 0.26 +
            levers.attrattivitaImprese * 0.07) *
            horizonMultiplier
      ),
      sostenibilita: clampScore(
        base.sostenibilita +
          (levers.transizioneVerde * 0.29 +
            levers.digitalizzazionePA * 0.05) *
            horizonMultiplier
      ),
    };

    const projectedOverall =
      Math.round(
        ((projected.economia +
          projected.finanza +
          projected.qualita +
          projected.sociale +
          projected.sostenibilita) /
          5) *
          10
      ) / 10;

    const totalEffort =
      levers.transizioneVerde +
      levers.welfareInfanzia +
      levers.attrattivitaImprese +
      levers.digitalizzazionePA;
    const netFiscalBalance = levers.efficienzaFiscale * 1.6 - totalEffort * 0.42;

    let fiscalStatus: 'Surplus Operativo' | 'Equilibrio Sostenibile' | 'Pressione di Bilancio' =
      'Equilibrio Sostenibile';
    let fiscalTone = 'text-[#D97706]';

    if (netFiscalBalance >= 8) {
      fiscalStatus = 'Surplus Operativo';
      fiscalTone = 'text-[#16A34A]';
    } else if (netFiscalBalance < -8) {
      fiscalStatus = 'Pressione di Bilancio';
      fiscalTone = 'text-[#DC2626]';
    }

    return {
      projected,
      projectedOverall,
      deltaOverall:
        Math.round((projectedOverall - targetCity.indiceComplessivo) * 10) / 10,
      fiscalStatus,
      fiscalTone,
    };
  }, [targetCity, levers]);

  if (!targetCity || !simulation) return null;

  const radarSeries: RadarSeries[] = [
    {
      id: 'baseline',
      label: `${targetCity.nome} (Dati Reali)`,
      scores: targetCity.pillars,
      colorHex: '#1E3A8A',
      fillOpacity: 0.08,
    },
    {
      id: 'simulated',
      label: `${targetCity.nome} (Scenario What-If +${levers.orizzonteAnni}a)`,
      scores: simulation.projected,
      colorHex: '#14532D',
      dashed: true,
      fillOpacity: 0.14,
    },
  ];
  if (referenceCity && referenceCity.id !== targetCity.id) {
    radarSeries.push({
      id: 'ref',
      label: `${referenceCity.nome} (Dati Reali)`,
      scores: referenceCity.pillars,
      colorHex: '#9A3412',
      fillOpacity: 0.04,
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
        <div>
          <p className="text-xs text-[#57534E]">
            Modello Parametrico What-If su Base Dati Reali · I valori di partenza sono ufficiali (MEF/QDV); le proiezioni future rappresentano scenari ipotetici
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#18181B] mt-1">
            Simulatore di Scenario su Politiche Locali
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setLevers(DEFAULT_LEVERS)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#18181B] bg-white border border-[#E5E3DC] rounded-lg hover:border-[#1E3A8A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ripristina scenario base</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#E5E3DC]">
            <div>
              <label
                htmlFor="sim-target-city"
                className="block text-xs font-medium text-[#57534E] mb-1.5"
              >
                Comune selezionato
              </label>
              <select
                id="sim-target-city"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
              >
                {activeCities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({m.sigla})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sim-ref-city"
                className="block text-xs font-medium text-[#57534E] mb-1.5"
              >
                Confronta con
              </label>
              <select
                id="sim-ref-city"
                value={referenceCityId}
                onChange={(e) => setReferenceCityId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
              >
                <option value="">Nessuna città</option>
                {activeCities
                  .filter((m) => m.id !== targetId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} ({m.sigla})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#57534E] mb-1.5">
                Orizzonte ipotetico
              </span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md">
                {([1, 3, 5] as const).map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() =>
                      setLevers((prev) => ({ ...prev, orizzonteAnni: yr }))
                    }
                    className={`py-1 text-xs font-mono font-medium rounded-sm cursor-pointer ${
                      levers.orizzonteAnni === yr
                        ? 'bg-white text-[#1E3A8A] border border-[#E5E3DC]'
                        : 'text-[#57534E] hover:text-[#18181B]'
                    }`}
                  >
                    {yr}a
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {LEVER_CONFIG.map((cfg) => {
              const val = levers[cfg.key];
              return (
                <div key={cfg.key}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor={`slider-${cfg.key}`}
                      className="text-sm font-medium text-[#18181B]"
                    >
                      {cfg.label}
                    </label>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#1E3A8A]">
                      {val > 0 ? `+${val}%` : `${val}%`}
                    </span>
                  </div>
                  <input
                    id={`slider-${cfg.key}`}
                    type="range"
                    min={-20}
                    max={40}
                    step={5}
                    value={val}
                    onChange={(e) =>
                      setLevers((prev) => ({
                        ...prev,
                        [cfg.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[#1E3A8A] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#57534E] mt-0.5">
                    {cfg.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-[#E5E3DC]">
              <div>
                <div className="text-xs text-[#57534E]">Indice Reale Attuale</div>
                <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums mt-0.5">
                  {formatNumberIt(targetCity.indiceComplessivo, 1)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#57534E]">
                  Scenario +{levers.orizzonteAnni} anni
                </div>
                <div className="font-mono text-2xl font-semibold text-[#14532D] tabular-nums mt-0.5">
                  {formatNumberIt(simulation.projectedOverall, 1)}
                  <span className="text-xs ml-1.5">
                    ({simulation.deltaOverall >= 0 ? '+' : ''}
                    {formatNumberIt(simulation.deltaOverall, 1)})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#57534E]">Sostenibilità Fiscale</div>
                <div
                  className={`text-sm font-semibold mt-1.5 ${simulation.fiscalTone}`}
                >
                  {simulation.fiscalStatus}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <RadarChart
                series={radarSeries}
                benchmarkScores={benchmarks.overall.pillars}
                benchmarkLabel="Media Italia"
                height={320}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E3DC] grid grid-cols-5 gap-2 text-center">
            {PILLAR_KEYS.map((key) => {
              const cur = targetCity.pillars[key];
              const nxt = simulation.projected[key];
              const diff = Math.round((nxt - cur) * 10) / 10;
              return (
                <div
                  key={key}
                  className="p-2.5 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md"
                >
                  <div className="text-[11px] text-[#57534E] truncate">
                    {PILLAR_META[key].shortLabel}
                  </div>
                  <div className="font-mono text-sm font-semibold text-[#18181B] tabular-nums mt-1">
                    {formatNumberIt(nxt, 1)}
                  </div>
                  <div
                    className={`font-mono text-[11px] tabular-nums ${
                      diff > 0
                        ? 'text-[#16A34A]'
                        : diff < 0
                        ? 'text-[#DC2626]'
                        : 'text-[#57534E]'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {formatNumberIt(diff, 1)}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#57534E] leading-relaxed">
            Nota metodologica: i punteggi di partenza derivano dai dataset ufficiali ISTAT, MEF e QDV; le variazioni simulate usano coefficienti parametrici esplorativi per valutare trade-off relativi tra politiche locali e non costituiscono previsioni econometriche.
          </p>
        </div>
      </div>
    </div>
  );
}
