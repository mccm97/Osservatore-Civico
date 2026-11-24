import { CheckCircle2, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CITY_PALETTE, PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type {
  Municipality,
  PerceptionAggregate,
  PillarScores,
} from '../types/civic';
import { formatNumberIt, formatTimeIt } from '../utils/formatters';

interface PerceptionViewProps {
  activeCities: Municipality[];
  onPerceptionSubmitted: (
    municipalityId: string,
    updated: PerceptionAggregate
  ) => void;
}

export function PerceptionView({
  activeCities,
  onPerceptionSubmitted,
}: PerceptionViewProps) {
  const [selectedCityId, setSelectedCityId] = useState<string>(
    activeCities[0]?.id ?? ''
  );
  const [scores, setScores] = useState<PillarScores>({
    economia: 7,
    finanza: 7,
    qualita: 7,
    sociale: 7,
    sostenibilita: 7,
  });
  const [priority, setPriority] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!activeCities.some((c) => c.id === selectedCityId) && activeCities[0]) {
      setSelectedCityId(activeCities[0].id);
    }
  }, [activeCities, selectedCityId]);

  const selectedCity = useMemo(
    () => activeCities.find((m) => m.id === selectedCityId) ?? activeCities[0],
    [activeCities, selectedCityId]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCity) return;
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch('/api/perception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          municipalityId: selectedCity.id,
          scores,
          priority: priority.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invio non riuscito.');
      }
      onPerceptionSubmitted(selectedCity.id, data.perception);
      setPriority('');
      setSubmitMessage({
        type: 'success',
        text: `Valutazione reale registrata per ${selectedCity.nome} (${data.perception.votesCount} rilevazioni totali).`,
      });
    } catch (err) {
      setSubmitMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Errore di rete durante il salvataggio.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedCity) return null;

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-[#E5E3DC]">
        <p className="text-xs text-[#57534E]">
          Rilevazioni Cittadine Reali · Nessun voto simulato pre-popolato: i punteggi riflettono esclusivamente le valutazioni inviate dagli utenti
        </p>
        <h1 className="font-serif text-3xl font-semibold text-[#18181B] mt-1">
          Indice di Soddisfazione e Percezione dei Cittadini
        </h1>
      </div>

      {/* Head-to-Head Gap Analysis for Active Cities */}
      <section aria-label="Divario tra dati oggettivi e percezione reale">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${
            activeCities.length >= 3 ? 'xl:grid-cols-3' : ''
          } ${activeCities.length === 4 ? '2xl:grid-cols-4' : ''} gap-5`}
        >
          {activeCities.map((city, idx) => {
            const colorHex = CITY_PALETTE[idx % CITY_PALETTE.length].hex;
            const hasVotes =
              city.perception.votesCount > 0 &&
              city.perception.overall !== null &&
              city.perception.scores !== null;
            const objectiveOutOf10 = city.indiceComplessivo / 10;
            const gap =
              hasVotes && city.perception.overall !== null
                ? city.perception.overall - objectiveOutOf10
                : null;

            return (
              <article
                key={city.id}
                className="bg-white border border-[#E5E3DC] rounded-lg p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E5E3DC]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        <h2 className="font-serif text-xl font-semibold text-[#18181B]">
                          {city.nome}
                        </h2>
                      </div>
                      <p className="text-xs text-[#57534E] mt-0.5 font-mono tabular-nums">
                        {formatNumberIt(city.perception.votesCount)} valutazioni reali
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                        {hasVotes && city.perception.overall !== null
                          ? formatNumberIt(city.perception.overall, 1)
                          : '—'}
                        <span className="text-xs text-[#57534E]">/10</span>
                      </div>
                      {gap !== null ? (
                        <div
                          className={`text-[11px] font-mono tabular-nums ${
                            gap >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }`}
                        >
                          {gap >= 0 ? '+' : ''}
                          {formatNumberIt(gap, 1)} vs dati ufficiali
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#57534E]">
                          In attesa di voti
                        </div>
                      )}
                    </div>
                  </div>

                  {!hasVotes ? (
                    <div className="py-6 text-xs text-[#57534E]">
                      Nessuna valutazione cittadina ancora inviata per {city.nome}. Usa il modulo sottostante per registrare la prima rilevazione reale.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {PILLAR_KEYS.map((key) => {
                        const inst10 = city.pillars[key] / 10;
                        const perc10 = city.perception.scores![key];
                        return (
                          <div key={key} className="text-xs">
                            <div className="flex justify-between mb-1">
                              <span className="text-[#57534E]">
                                {PILLAR_META[key].shortLabel}
                              </span>
                              <span className="font-mono tabular-nums text-[#18181B]">
                                Civico{' '}
                                <strong>{formatNumberIt(perc10, 1)}</strong> · Ufficiale{' '}
                                {formatNumberIt(inst10, 1)}
                              </span>
                            </div>
                            <div className="h-2 bg-[#FAF9F6] border border-[#E5E3DC]/80 rounded-xs relative overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 opacity-30"
                                style={{
                                  width: `${inst10 * 10}%`,
                                  backgroundColor: '#57534E',
                                }}
                              />
                              <div
                                className="h-full"
                                style={{
                                  width: `${perc10 * 10}%`,
                                  backgroundColor: colorHex,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E3DC]">
                  <div className="text-[11px] font-medium text-[#57534E]">
                    Priorità segnalate dai cittadini:
                  </div>
                  <div className="text-xs text-[#18181B] mt-1">
                    {city.perception.recentPriorities.length > 0
                      ? city.perception.recentPriorities.join(' · ')
                      : 'Nessuna segnalazione ancora inserita'}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Citizen Survey Form */}
      <section
        aria-label="Esprimi la tua valutazione reale"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 space-y-5"
        >
          <div className="pb-4 border-b border-[#E5E3DC]">
            <h2 className="font-serif text-xl font-semibold text-[#18181B]">
              Registra una Valutazione Reale
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              Seleziona uno dei comuni nel confronto (aggiungine altri dalla barra in alto per valutare qualsiasi comune italiano).
            </p>
          </div>

          <div>
            <label
              htmlFor="perception-city"
              className="block text-xs font-medium text-[#57534E] mb-1.5"
            >
              Comune valutato
            </label>
            <select
              id="perception-city"
              value={selectedCity.id}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
            >
              {activeCities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.sigla}) — {m.regione}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {PILLAR_KEYS.map((key) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`perc-${key}`}
                    className="text-sm font-medium text-[#18181B]"
                  >
                    {PILLAR_META[key].label}
                  </label>
                  <span className="font-mono text-sm font-semibold text-[#1E3A8A] tabular-nums">
                    {scores[key]}/10
                  </span>
                </div>
                <input
                  id={`perc-${key}`}
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={scores[key]}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#1E3A8A] cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div>
            <label
              htmlFor="perception-priority"
              className="block text-xs font-medium text-[#57534E] mb-1.5"
            >
              Priorità principale per il territorio (opzionale)
            </label>
            <input
              id="perception-priority"
              type="text"
              maxLength={72}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="Es. Potenziamento linee TPL o manutenzione stradale"
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          {submitMessage && (
            <div
              className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
                submitMessage.type === 'success'
                  ? 'bg-[#FAF9F6] border-[#16A34A]/40 text-[#16A34A]'
                  : 'bg-[#FAF9F6] border-[#DC2626]/40 text-[#DC2626]'
              }`}
            >
              {submitMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>{submitMessage.text}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-[#57534E]">
              Ultimo voto registrato:{' '}
              <span className="font-mono tabular-nums">
                {selectedCity.perception.lastUpdated
                  ? formatTimeIt(selectedCity.perception.lastUpdated)
                  : 'Nessuno'}
              </span>
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172D6E] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{submitting ? 'Registrazione...' : 'Invia valutazione'}</span>
            </button>
          </div>
        </form>

        <aside className="lg:col-span-5 bg-white border border-[#E5E3DC] rounded-lg p-5 sm:p-6 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#18181B]">
            Trasparenza sul Campione Civico
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            A differenza degli indicatori ufficiali (ISTAT, MEF, Prometeia, ISPRA), l’indice di percezione è alimentato esclusivamente dai contributi volontari inviati su questa piattaforma. Nessun voto sintetico viene pre-generato.
          </p>
        </aside>
      </section>
    </div>
  );
}
