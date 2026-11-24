export type PillarKey =
  | 'economia'
  | 'finanza'
  | 'qualita'
  | 'sociale'
  | 'sostenibilita';

export type MacroRegion = 'Nord-Ovest' | 'Nord-Est' | 'Centro' | 'Sud e Isole';

export type DemographicTier =
  | 'Metropoli (>250k)'
  | 'Città Media (50k–250k)'
  | 'Comune (<50k)';

export type ActiveTab =
  | 'confronto'
  | 'scheda'
  | 'classifica'
  | 'simulatore'
  | 'percezione';

export interface PillarScores {
  economia: number;
  finanza: number;
  qualita: number;
  sociale: number;
  sostenibilita: number;
}

export interface Mef2024Metrics {
  contribuenti: number;
  redditoMedioImponibile: number;
  impostaNettaMedia: number;
  addizionaleProCapite: number;
  quotaLavoroDipendente: number;
  quotaPensioni: number;
  quotaFasciaBassa15k: number;
  quotaFasciaAlta55k: number;
}

export interface MefHistoryPoint {
  year: number;
  redditoMedioImponibile: number;
  impostaNettaMedia: number;
  contribuenti: number;
  addizionaleProCapite: number;
  quotaLavoroDipendente: number;
  quotaPensioni: number;
  quotaFasciaBassa15k: number;
  quotaFasciaAlta55k: number;
}

export interface ProvHistoryPoint {
  year: number;
  [key: string]: number | undefined;
}

export interface IndicatorMeta {
  key: string;
  label: string;
  pillar: PillarKey;
  higherIsBetter: boolean;
  unit: string;
  decimals: number;
  referenceYear: string;
  source: string;
  scope: 'Comunale' | 'Provinciale';
}

export interface PerceptionAggregate {
  votesCount: number;
  scores: PillarScores | null;
  overall: number | null;
  recentPriorities: string[];
  lastUpdated: string | null;
}

export interface Municipality {
  id: string; // codiceIstat (e.g., "037006")
  codiceIstat: string;
  nome: string;
  sigla: string;
  provincia: string;
  regione: string;
  ripartizione: MacroRegion;
  fascia: DemographicTier;
  capoluogo: boolean;
  popolazione: number;
  superficieKm2: number;
  densita: number;
  lat: number | null;
  lon: number | null;
  indiceComplessivo: number;
  pillars: PillarScores;
  mef2024: Mef2024Metrics | null;
  mefHistory: MefHistoryPoint[];
  provMetrics: Record<string, number>;
  provHistory: ProvHistoryPoint[];
  perception: PerceptionAggregate;
}

export interface MunicipalitySummary {
  id: string;
  codiceIstat: string;
  nome: string;
  sigla: string;
  provincia: string;
  regione: string;
  ripartizione: MacroRegion;
  fascia: DemographicTier;
  capoluogo: boolean;
  popolazione: number;
  indiceComplessivo: number;
  pillars: PillarScores;
  redditoMedioImponibile: number | null;
}

export interface DataSourceInfo {
  name: string;
  scope: string;
  year: string;
}

export interface NationalBenchmarks {
  overall: {
    indiceComplessivo: number;
    pillars: PillarScores;
    mef2024: Omit<Mef2024Metrics, 'contribuenti'>;
    provMetrics: Record<string, number>;
    mefHistory: MefHistoryPoint[];
    provHistory: ProvHistoryPoint[];
  };
  byTier: Record<
    DemographicTier,
    { count: number; indiceComplessivo: number; pillars: PillarScores }
  >;
}

export interface HourlyAirPoint {
  time: string;
  pm25: number | null;
  pm10: number | null;
  europeanAqi: number | null;
}

export interface LiveEnvironmentReading {
  municipalityId: string;
  nome: string;
  available: boolean;
  error?: string;
  fetchedAt: string;
  europeanAqi: number | null;
  aqiLabel: 'Ottima' | 'Buona' | 'Moderata' | 'Scarsa' | 'Critica' | 'N/D';
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  hourlySeries: HourlyAirPoint[];
}

export interface PolicySimulationLevers {
  transizioneVerde: number;
  digitalizzazionePA: number;
  welfareInfanzia: number;
  attrattivitaImprese: number;
  efficienzaFiscale: number;
  orizzonteAnni: 1 | 3 | 5;
}
