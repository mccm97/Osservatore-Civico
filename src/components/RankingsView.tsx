import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PILLAR_KEYS, PILLAR_META } from '../data/constants';
import type {
  DemographicTier,
  MacroRegion,
  MunicipalitySummary,
  NationalBenchmarks,
  PillarKey,
} from '../types/civic';
import { formatNumberIt } from '../utils/formatters';

interface RankingsViewProps {
  totalMunicipalities: number;
  benchmarks: NationalBenchmarks;
  selectedIds: string[];
  onToggleCity: (id: string) => void;
  onGoToComparison: () => void;
  onOpenCityDetail: (id: string) => void;
}

type SortColumn = 'popolazione' | 'indiceComplessivo' | 'reddito' | PillarKey;

const REGIONS: ('Tutte' | MacroRegion)[] = [
  'Tutte',
  'Nord-Ovest',
  'Nord-Est',
  'Centro',
  'Sud e Isole',
];

const TIERS: ('Tutte' | DemographicTier)[] = [
  'Tutte',
  'Metropoli (>250k)',
  'Città Media (50k–250k)',
  'Comune (<50k)',
];

const PAGE_SIZE = 50;

export function RankingsView({
  totalMunicipalities,
  benchmarks,
  selectedIds,
  onToggleCity,
  onGoToComparison,
  onOpenCityDetail,
}: RankingsViewProps) {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'Tutte' | MacroRegion>('Tutte');
  const [tierFilter, setTierFilter] = useState<'Tutte' | DemographicTier>('Tutte');
  const [onlyCapoluoghi, setOnlyCapoluoghi] = useState(false);
  const [sortBy, setSortBy] = useState<SortColumn>('popolazione');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<MunicipalitySummary[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(0);
  }, [search, regionFilter, tierFilter, onlyCapoluoghi, sortBy, sortAsc]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: search.trim(),
          region: regionFilter,
          tier: tierFilter,
          capoluoghi: onlyCapoluoghi ? '1' : '0',
          sort: sortBy,
          dir: sortAsc ? 'asc' : 'desc',
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        });
        const res = await fetch(`/api/municipalities/search?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          total: number;
          items: MunicipalitySummary[];
        };
        if (!cancelled) {
          setItems(data.items);
          setTotalFiltered(data.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, regionFilter, tierFilter, onlyCapoluoghi, sortBy, sortAsc, page]);

  const handleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E5E3DC]">
        <div>
          <p className="text-xs text-[#57534E]">
            Repertorio Ufficiale ISTAT & MEF · {formatNumberIt(totalMunicipalities)} comuni italiani censiti · Media Italia{' '}
            <span className="font-mono tabular-nums font-semibold text-[#18181B]">
              {formatNumberIt(benchmarks.overall.indiceComplessivo, 1)}/100
            </span>
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#18181B] mt-1">
            Esplora e Confronta Tutti i Comuni Italiani
          </h1>
        </div>
        <button
          type="button"
          onClick={onGoToComparison}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg hover:bg-[#172D6E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Torna al Confronto ({selectedIds.length}/4)
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#E5E3DC] rounded-lg p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="relative w-full xl:w-72">
          <Search
            className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Comune, sigla provincia, codice ISTAT..."
            aria-label="Filtra comuni nella classifica"
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#FAF9F6] border border-[#E5E3DC] rounded-md overflow-x-auto">
            {REGIONS.map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setRegionFilter(reg)}
                className={`px-2.5 py-1 text-xs font-medium rounded-sm whitespace-nowrap shrink-0 cursor-pointer ${
                  regionFilter === reg
                    ? 'bg-white text-[#1E3A8A] shadow-2xs border border-[#E5E3DC]'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'Tutte' | DemographicTier)}
            aria-label="Filtra per fascia demografica"
            className="px-3 py-1.5 text-xs font-medium bg-[#FAF9F6] border border-[#E5E3DC] rounded-md text-[#18181B] focus:outline-none focus:border-[#1E3A8A]"
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier === 'Tutte' ? 'Tutte le fasce demografiche' : tier}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyCapoluoghi((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer ${
              onlyCapoluoghi
                ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                : 'bg-[#FAF9F6] text-[#18181B] border-[#E5E3DC]'
            }`}
          >
            Solo Capoluoghi
          </button>
        </div>
      </div>

      {/* High-density Paginated Table */}
      <div className="bg-white border border-[#E5E3DC] rounded-lg overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-8 bg-[#FAF9F6] rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#18181B]">
              Nessun comune corrisponde ai filtri selezionati.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRegionFilter('Tutte');
                setTierFilter('Tutte');
                setOnlyCapoluoghi(false);
              }}
              className="mt-3 px-4 py-2 text-xs font-semibold text-[#1E3A8A] border border-[#E5E3DC] rounded-md hover:bg-[#FAF9F6] cursor-pointer"
            >
              Ripristina filtri
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="border-b border-[#E5E3DC] bg-[#FAF9F6] text-xs font-medium text-[#57534E]">
                    <th className="py-3 pl-5 pr-3 w-14">#</th>
                    <th className="py-3 px-3">Comune</th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('popolazione')}
                        className="inline-flex items-center gap-1 hover:text-[#18181B] cursor-pointer"
                      >
                        <span>Popolazione</span>
                        <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('reddito')}
                        className="inline-flex items-center gap-1 hover:text-[#18181B] cursor-pointer"
                      >
                        <span>IRPEF 2024</span>
                        <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('indiceComplessivo')}
                        className="inline-flex items-center gap-1 font-semibold text-[#18181B] cursor-pointer"
                      >
                        <span>Indice</span>
                        <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </th>
                    {PILLAR_KEYS.map((key) => (
                      <th key={key} className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="inline-flex items-center gap-1 hover:text-[#18181B] cursor-pointer"
                        >
                          <span>{PILLAR_META[key].shortLabel}</span>
                          <ArrowDownUp className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </th>
                    ))}
                    <th className="py-3 pl-3 pr-5 text-right">Confronto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DC]/70 text-sm">
                  {items.map((city, idx) => {
                    const isSelected = selectedIds.includes(city.id);
                    const canSelect = isSelected || selectedIds.length < 4;
                    const diff =
                      city.indiceComplessivo -
                      benchmarks.overall.indiceComplessivo;
                    const rankNum = page * PAGE_SIZE + idx + 1;

                    return (
                      <tr
                        key={city.id}
                        className={`h-11 transition-colors ${
                          isSelected ? 'bg-[#1E3A8A]/[0.03]' : 'hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <td className="py-2.5 pl-5 pr-3 font-mono text-xs text-[#57534E] tabular-nums">
                          {rankNum}
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => onOpenCityDetail(city.id)}
                            className="font-semibold text-[#18181B] hover:text-[#1E3A8A] hover:underline text-left cursor-pointer"
                          >
                            {city.nome} ({city.sigla})
                          </button>
                          <div className="text-[11px] text-[#57534E]">
                            {city.regione} · {city.ripartizione} · ISTAT {city.codiceIstat}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-[#57534E] tabular-nums">
                          {formatNumberIt(city.popolazione)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-[#18181B] tabular-nums">
                          {city.redditoMedioImponibile
                            ? `€ ${formatNumberIt(city.redditoMedioImponibile, 0)}`
                            : 'N/D'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <span className="font-semibold text-[#18181B]">
                            {formatNumberIt(city.indiceComplessivo, 1)}
                          </span>
                          <span
                            className={`ml-1.5 text-[11px] ${
                              diff >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                            }`}
                          >
                            ({diff >= 0 ? '+' : ''}
                            {formatNumberIt(diff, 1)})
                          </span>
                        </td>
                        {PILLAR_KEYS.map((key) => (
                          <td
                            key={key}
                            className="py-2.5 px-3 text-right font-mono text-xs text-[#18181B] tabular-nums"
                          >
                            {formatNumberIt(city.pillars[key], 1)}
                          </td>
                        ))}
                        <td className="py-2.5 pl-3 pr-5 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenCityDetail(city.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-[#E5E3DC] bg-[#FAF9F6] text-[#1E3A8A] hover:border-[#1E3A8A] whitespace-nowrap cursor-pointer"
                            >
                              Scheda
                            </button>
                            <button
                              type="button"
                              disabled={
                                !canSelect || (isSelected && selectedIds.length === 1)
                              }
                              onClick={() => onToggleCity(city.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                                  : 'bg-white text-[#18181B] border-[#E5E3DC] hover:border-[#1E3A8A]'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Attivo</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Confronta</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 border-t border-[#E5E3DC] bg-[#FAF9F6] flex items-center justify-between text-xs text-[#57534E]">
              <span className="font-mono tabular-nums">
                {formatNumberIt(totalFiltered)} comuni trovati · Pagina {page + 1} di{' '}
                {formatNumberIt(totalPages)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E5E3DC] rounded-md text-[#18181B] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Precedente</span>
                </button>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E5E3DC] rounded-md text-[#18181B] disabled:opacity-40 cursor-pointer"
                >
                  <span>Successiva</span>
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
