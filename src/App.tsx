import { useCallback, useEffect, useState } from 'react';
import { CityDetailView } from './components/CityDetailView';
import { CitySelectorBar } from './components/CitySelectorBar';
import { ComparisonView } from './components/ComparisonView';
import { PerceptionView } from './components/PerceptionView';
import { PrintReport } from './components/PrintReport';
import { RankingsView } from './components/RankingsView';
import { SimulatorView } from './components/SimulatorView';
import { TopBar } from './components/TopBar';
import type {
  ActiveTab,
  DataSourceInfo,
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  NationalBenchmarks,
  PerceptionAggregate,
} from './types/civic';
import { exportComparisonCsv } from './utils/exportCsv';

interface BootstrapPayload {
  generatedAt?: string;
  totalMunicipalities: number;
  totalProvinces: number;
  sources: DataSourceInfo[];
  indicatorMeta: Record<string, IndicatorMeta>;
  benchmarks: NationalBenchmarks;
  defaultCities: Municipality[];
}

export default function App() {
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [totalMunicipalities, setTotalMunicipalities] = useState<number>(7896);
  const [sources, setSources] = useState<DataSourceInfo[]>([]);
  const [indicatorMeta, setIndicatorMeta] = useState<
    Record<string, IndicatorMeta>
  >({});
  const [benchmarks, setBenchmarks] = useState<NationalBenchmarks | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([
    '037006', // Bologna
    '015146', // Milano
    '072006', // Bari
  ]);
  const [selectedCities, setSelectedCities] = useState<Municipality[]>([]);
  const [bootLoading, setBootLoading] = useState<boolean>(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('confronto');
  const [benchmarkMode, setBenchmarkMode] = useState<'national' | 'tier'>(
    'national'
  );
  const [detailCityId, setDetailCityId] = useState<string>('037006');
  const [detailCity, setDetailCity] = useState<Municipality | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Live Open-Meteo Environmental Data + Real 48h Hourly History
  const [liveEnv, setLiveEnv] = useState<
    Record<string, LiveEnvironmentReading>
  >({});
  const [envLoading, setEnvLoading] = useState<boolean>(false);
  const [envError, setEnvError] = useState<string | null>(null);

  // Initial bootstrap from real datasets
  useEffect(() => {
    let cancelled = false;
    setBootLoading(true);
    fetch('/api/bootstrap')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<BootstrapPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setGeneratedAt(data.generatedAt ?? null);
        setTotalMunicipalities(data.totalMunicipalities);
        setSources(data.sources);
        setIndicatorMeta(data.indicatorMeta);
        setBenchmarks(data.benchmarks);
        setSelectedCities(data.defaultCities);
        setSelectedIds(data.defaultCities.map((c) => c.id));
        setBootError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setBootError(
            err instanceof Error
              ? err.message
              : 'Impossibile caricare i dataset ufficiali'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBootLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const idsParam = selectedIds.join(',');

  // Fetch full enriched municipality records whenever selectedIds changes
  useEffect(() => {
    if (!idsParam || bootLoading) return;
    let cancelled = false;
    fetch(`/api/municipalities/by-ids?ids=${encodeURIComponent(idsParam)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cities: Municipality[] } | null) => {
        if (!cancelled && data?.cities) {
          setSelectedCities(data.cities);
        }
      })
      .catch(() => {
        // retain current view on transient failure
      });
    return () => {
      cancelled = true;
    };
  }, [idsParam, bootLoading]);

  // Fetch real-time Open-Meteo readings + 48h hourly history
  const fetchLiveEnvironmentForIds = useCallback(
    async (idsCsv: string, force = false) => {
      if (!idsCsv) return;
      setEnvLoading(true);
      setEnvError(null);
      try {
        const res = await fetch(
          `/api/live/environment?ids=${encodeURIComponent(idsCsv)}${
            force ? '&force=1' : ''
          }`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          readings: LiveEnvironmentReading[];
        };
        setLiveEnv((prev) => {
          const next = { ...prev };
          for (const reading of data.readings) {
            next[reading.municipalityId] = reading;
          }
          return next;
        });
      } catch (err) {
        setEnvError(
          err instanceof Error
            ? err.message
            : 'Servizio Open-Meteo momentaneamente non raggiungibile'
        );
      } finally {
        setEnvLoading(false);
      }
    },
    []
  );

  const fetchLiveEnvironment = useCallback(
    (force = false) => fetchLiveEnvironmentForIds(idsParam, force),
    [fetchLiveEnvironmentForIds, idsParam]
  );

  useEffect(() => {
    fetchLiveEnvironment(false);
  }, [fetchLiveEnvironment]);

  // Keep detailCity synced with detailCityId (either from selectedCities or fetched on demand)
  useEffect(() => {
    if (!detailCityId || bootLoading) return;
    const existing = selectedCities.find((c) => c.id === detailCityId);
    if (existing) {
      setDetailCity(existing);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/municipalities/by-ids?ids=${encodeURIComponent(detailCityId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cities: Municipality[] } | null) => {
        if (!cancelled && data?.cities?.[0]) {
          setDetailCity(data.cities[0]);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailCityId, selectedCities, bootLoading]);

  // Ensure live environment data is fetched for detailCityId when viewing Scheda Città
  useEffect(() => {
    if (activeTab === 'scheda' && detailCityId && !liveEnv[detailCityId]) {
      fetchLiveEnvironmentForIds(detailCityId, false);
    }
  }, [activeTab, detailCityId, liveEnv, fetchLiveEnvironmentForIds]);

  const handleAddCity = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id) || prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleRemoveCity = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item !== id);
    });
  };

  const handleToggleCityFromRankings = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleOpenCityDetail = (id: string) => {
    setDetailCityId(id);
    setActiveTab('scheda');
  };

  const handlePerceptionSubmitted = (
    municipalityId: string,
    updated: PerceptionAggregate
  ) => {
    setSelectedCities((prev) =>
      prev.map((m) =>
        m.id === municipalityId ? { ...m, perception: updated } : m
      )
    );
    setDetailCity((prev) =>
      prev && prev.id === municipalityId
        ? { ...prev, perception: updated }
        : prev
    );
  };

  const handleExportCsv = () => {
    if (!benchmarks) return;
    exportComparisonCsv(selectedCities, benchmarks, indicatorMeta, liveEnv);
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B]">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />

      <main className="no-print flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {bootLoading || !benchmarks ? (
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-[#FAF9F6] rounded w-1/3" />
            <div className="h-4 bg-[#FAF9F6] rounded w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="h-48 bg-[#FAF9F6] rounded" />
              <div className="h-48 bg-[#FAF9F6] rounded" />
              <div className="h-48 bg-[#FAF9F6] rounded" />
            </div>
          </div>
        ) : bootError ? (
          <div className="bg-white border border-[#E5E3DC] rounded-lg p-8 text-center">
            <p className="text-sm font-medium text-[#DC2626]">{bootError}</p>
          </div>
        ) : (
          <>
            {(activeTab === 'confronto' || activeTab === 'percezione') && (
              <CitySelectorBar
                selectedCities={selectedCities}
                totalMunicipalities={totalMunicipalities}
                onAddCity={handleAddCity}
                onRemoveCity={handleRemoveCity}
                onApplyPreset={(ids) => setSelectedIds(ids)}
                benchmarkMode={benchmarkMode}
                onBenchmarkModeChange={setBenchmarkMode}
              />
            )}

            {activeTab === 'confronto' && (
              <ComparisonView
                totalMunicipalities={totalMunicipalities}
                cities={selectedCities}
                benchmarks={benchmarks}
                indicatorMeta={indicatorMeta}
                sources={sources}
                benchmarkMode={benchmarkMode}
                liveEnv={liveEnv}
                envLoading={envLoading}
                envError={envError}
                onRefreshEnv={() => fetchLiveEnvironment(true)}
                onOpenRankings={() => setActiveTab('classifica')}
                onOpenCityDetail={handleOpenCityDetail}
              />
            )}

            {activeTab === 'scheda' && (
              <CityDetailView
                city={detailCity}
                loadingCity={detailLoading}
                totalMunicipalities={totalMunicipalities}
                activeCities={selectedCities}
                selectedIds={selectedIds}
                benchmarks={benchmarks}
                indicatorMeta={indicatorMeta}
                liveReading={liveEnv[detailCityId]}
                envLoading={envLoading}
                onSelectDetailCity={setDetailCityId}
                onAddToComparison={handleAddCity}
                onRefreshEnv={(id) => fetchLiveEnvironmentForIds(id, true)}
                onBackToComparison={() => setActiveTab('confronto')}
              />
            )}

            {activeTab === 'classifica' && (
              <RankingsView
                totalMunicipalities={totalMunicipalities}
                benchmarks={benchmarks}
                selectedIds={selectedIds}
                onToggleCity={handleToggleCityFromRankings}
                onGoToComparison={() => setActiveTab('confronto')}
                onOpenCityDetail={handleOpenCityDetail}
              />
            )}

            {activeTab === 'simulatore' && (
              <SimulatorView
                activeCities={selectedCities}
                benchmarks={benchmarks}
              />
            )}

            {activeTab === 'percezione' && (
              <PerceptionView
                activeCities={selectedCities}
                onPerceptionSubmitted={handlePerceptionSubmitted}
              />
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-[#E5E3DC] bg-[#FAF9F6] mt-12">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57534E]">
          <div>
            <span className="font-serif font-semibold text-[#18181B]">
              Osservatorio Civico Italia
            </span>{' '}
            · Dati ufficiali su {totalMunicipalities.toLocaleString('it-IT')} comuni (ISTAT · MEF · Sole 24 Ore QDV · Open-Meteo Live)
            {generatedAt ? ` · Snapshot dataset: ${generatedAt}` : ''}
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleExportCsv}
              className="hover:text-[#18181B] underline-offset-4 hover:underline cursor-pointer"
            >
              Esporta CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="hover:text-[#18181B] underline-offset-4 hover:underline cursor-pointer"
            >
              Stampa Scheda PDF
            </button>
          </div>
        </div>
      </footer>

      {benchmarks && (
        <PrintReport
          cities={selectedCities}
          benchmarks={benchmarks}
          indicatorMeta={indicatorMeta}
          liveEnv={liveEnv}
        />
      )}
    </div>
  );
}
