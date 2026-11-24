import { Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CITY_PALETTE } from '../data/constants';
import type { Municipality, MunicipalitySummary } from '../types/civic';
import { formatNumberIt } from '../utils/formatters';

interface CitySelectorBarProps {
  selectedCities: Municipality[];
  totalMunicipalities: number;
  onAddCity: (id: string) => void;
  onRemoveCity: (id: string) => void;
  onApplyPreset: (ids: string[]) => void;
  benchmarkMode: 'national' | 'tier';
  onBenchmarkModeChange: (mode: 'national' | 'tier') => void;
}

const PRESETS: { label: string; ids: string[] }[] = [
  { label: 'Metropoli Nord–Centro–Sud', ids: ['015146', '037006', '058091', '072006'] }, // Milano, Bologna, Roma, Bari
  { label: 'Città Medie Alpine & Isole', ids: ['022205', '016024', '032006', '092009'] }, // Trento, Bergamo, Trieste, Cagliari
  { label: 'Piccoli Comuni (<50k ab.)', ids: ['001001', '004003', '022161', '077014'] }, // Agliè, Alba, Rovereto, Matera
];

export function CitySelectorBar({
  selectedCities,
  totalMunicipalities,
  onAddCity,
  onRemoveCity,
  onApplyPreset,
  benchmarkMode,
  onBenchmarkModeChange,
}: CitySelectorBarProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [results, setResults] = useState<MunicipalitySummary[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/municipalities/search?q=${encodeURIComponent(
            query.trim()
          )}&limit=12&sort=popolazione&dir=desc`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items: MunicipalitySummary[] };
        if (!cancelled) {
          const activeSet = new Set(selectedCities.map((c) => c.id));
          setResults(data.items.filter((item) => !activeSet.has(item.id)));
        }
      } catch {
        // ignore transient search cancellation
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, dropdownOpen, selectedCities]);

  const canAddMore = selectedCities.length < 4;

  return (
    <section
      aria-label="Selezione comuni per il confronto"
      className="no-print bg-white border border-[#E5E3DC] rounded-lg p-4 sm:p-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search box across all 7,896 Italian municipalities */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full sm:w-80 shrink-0" ref={containerRef}>
            <Search
              className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onFocus={() => setDropdownOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              disabled={!canAddMore}
              placeholder={
                canAddMore
                  ? `Cerca tra ${formatNumberIt(totalMunicipalities)} comuni italiani...`
                  : 'Massimo 4 comuni attivi'
              }
              aria-label="Cerca qualsiasi comune italiano da aggiungere al confronto"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] placeholder:text-[#57534E]/70 focus:outline-none focus:border-[#1E3A8A] disabled:opacity-60"
            />

            {dropdownOpen && canAddMore && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E5E3DC] rounded-lg shadow-sm max-h-80 overflow-y-auto z-30">
                {searching && results.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#57534E]">
                    Ricerca nei registri ISTAT / MEF...
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#57534E]">
                    Nessun comune trovato per "{query}".
                  </div>
                ) : (
                  results.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        onAddCity(city.id);
                        setQuery('');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-[#FAF9F6] border-b last:border-b-0 border-[#E5E3DC]/60 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#18181B] truncate">
                          {city.nome} ({city.sigla})
                        </div>
                        <div className="text-xs text-[#57534E] truncate">
                          {city.regione} · {formatNumberIt(city.popolazione)} ab. · ISTAT {city.codiceIstat}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A8A] shrink-0">
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        Aggiungi
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Active selected municipality buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedCities.map((city, idx) => {
              const color = CITY_PALETTE[idx % CITY_PALETTE.length];
              return (
                <div
                  key={city.id}
                  className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-xs font-medium text-[#18181B]"
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="whitespace-nowrap">
                    {city.nome} ({city.sigla})
                  </span>
                  {selectedCities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveCity(city.id)}
                      aria-label={`Rimuovi ${city.nome} dal confronto`}
                      className="p-0.5 text-[#57534E] hover:text-[#18181B] rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Benchmark switch */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[#57534E] whitespace-nowrap">
            Riferimento:
          </span>
          <div className="inline-flex p-0.5 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md">
            <button
              type="button"
              onClick={() => onBenchmarkModeChange('national')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                benchmarkMode === 'national'
                  ? 'bg-white text-[#18181B] shadow-2xs border border-[#E5E3DC]/70'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              Media Italia
            </button>
            <button
              type="button"
              onClick={() => onBenchmarkModeChange('tier')}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                benchmarkMode === 'tier'
                  ? 'bg-white text-[#18181B] shadow-2xs border border-[#E5E3DC]/70'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              Fascia Demografica
            </button>
          </div>
        </div>
      </div>

      {/* Quick comparison presets */}
      <div className="mt-3 pt-3 border-t border-[#E5E3DC]/70 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-[#57534E]">Confronti rapidi:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onApplyPreset(preset.ids)}
            className="text-[#1E3A8A] hover:underline font-medium whitespace-nowrap cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
