import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  DataSourceInfo,
  HourlyAirPoint,
  IndicatorMeta,
  LiveEnvironmentReading,
  Municipality,
  MunicipalitySummary,
  NationalBenchmarks,
  PerceptionAggregate,
  PillarKey,
  PillarScores,
  ProvHistoryPoint,
} from './src/types/civic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const REAL_DATA_FILE = path.join(DATA_DIR, 'real-italy-dataset.json');
const PERCEPTION_FILE = path.join(DATA_DIR, 'real-perception-votes.json');

const PILLAR_KEYS: PillarKey[] = [
  'economia',
  'finanza',
  'qualita',
  'sociale',
  'sostenibilita',
];

interface RawMunicipalRecord {
  id: string;
  codiceIstat: string;
  nome: string;
  sigla: string;
  provincia: string;
  regione: string;
  ripartizione: Municipality['ripartizione'];
  fascia: Municipality['fascia'];
  capoluogo: boolean;
  popolazione: number;
  superficieKm2: number;
  densita: number;
  lat: number | null;
  lon: number | null;
  indiceComplessivo: number;
  pillars: PillarScores;
  mef2024: Municipality['mef2024'];
  mefHistory: Municipality['mefHistory'];
}

interface RawDataset {
  generatedAt: string;
  sources: DataSourceInfo[];
  indicatorMeta: Record<string, IndicatorMeta>;
  provinces: Record<
    string,
    { sigla: string; nome: string; metrics: Record<string, number> }
  >;
  provHistory: Record<string, Record<string, Omit<ProvHistoryPoint, 'year'>>>;
  benchmarks: NationalBenchmarks;
  municipalities: RawMunicipalRecord[];
}

if (!fs.existsSync(REAL_DATA_FILE)) {
  console.error(
    `Dataset ufficiale non trovato in ${REAL_DATA_FILE}. Eseguire prima: npm run fetch-data`
  );
  process.exit(1);
}

const dataset: RawDataset = JSON.parse(fs.readFileSync(REAL_DATA_FILE, 'utf-8'));
const muniById = new Map<string, RawMunicipalRecord>(
  dataset.municipalities.map((m) => [m.id, m])
);

const perceptionRateLimit = new Map<string, { count: number; resetAt: number }>();

const envCache = new Map<
  string,
  { reading: LiveEnvironmentReading; expiresAt: number }
>();

function loadPerceptionStore(): Record<string, PerceptionAggregate> {
  try {
    if (fs.existsSync(PERCEPTION_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PERCEPTION_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, PerceptionAggregate>;
      }
    }
  } catch (err) {
    console.error('Errore lettura perception votes:', err);
  }
  return {};
}

function savePerceptionStore(store: Record<string, PerceptionAggregate>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PERCEPTION_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Errore salvataggio perception votes:', err);
  }
}

const EMPTY_PERCEPTION: PerceptionAggregate = {
  votesCount: 0,
  scores: null,
  overall: null,
  recentPriorities: [],
  lastUpdated: null,
};

function enrichMunicipality(
  raw: RawMunicipalRecord,
  perceptionStore: Record<string, PerceptionAggregate>
): Municipality {
  const prov = dataset.provinces[raw.sigla];
  const rawHist = dataset.provHistory[raw.sigla] ?? {};
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  const provHistory: ProvHistoryPoint[] = years
    .map((yr) => {
      const pt = rawHist[String(yr)];
      return pt ? { year: yr, ...pt } : null;
    })
    .filter((x): x is ProvHistoryPoint => x !== null);

  return {
    ...raw,
    provMetrics: prov?.metrics ?? {},
    provHistory,
    perception: perceptionStore[raw.id] ?? EMPTY_PERCEPTION,
  };
}

function toSummary(raw: RawMunicipalRecord): MunicipalitySummary {
  return {
    id: raw.id,
    codiceIstat: raw.codiceIstat,
    nome: raw.nome,
    sigla: raw.sigla,
    provincia: raw.provincia,
    regione: raw.regione,
    ripartizione: raw.ripartizione,
    fascia: raw.fascia,
    capoluogo: raw.capoluogo,
    popolazione: raw.popolazione,
    indiceComplessivo: raw.indiceComplessivo,
    pillars: raw.pillars,
    redditoMedioImponibile: raw.mef2024?.redditoMedioImponibile ?? null,
  };
}

function classifyEuropeanAqi(
  aqi: number | null
): LiveEnvironmentReading['aqiLabel'] {
  if (aqi === null) return 'N/D';
  if (aqi <= 20) return 'Ottima';
  if (aqi <= 40) return 'Buona';
  if (aqi <= 60) return 'Moderata';
  if (aqi <= 80) return 'Scarsa';
  return 'Critica';
}

async function fetchCityEnvironment(
  city: RawMunicipalRecord,
  forceRefresh = false
): Promise<LiveEnvironmentReading> {
  if (city.lat === null || city.lon === null) {
    return {
      municipalityId: city.id,
      nome: city.nome,
      available: false,
      error: 'Coordinate geografiche non disponibili per questo comune',
      fetchedAt: new Date().toISOString(),
      europeanAqi: null,
      aqiLabel: 'N/D',
      pm25: null,
      pm10: null,
      no2: null,
      temperatureC: null,
      windSpeedKmh: null,
      hourlySeries: [],
    };
  }

  const now = Date.now();
  const cached = envCache.get(city.id);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.reading;
  }

  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm2_5,pm10,european_aqi,nitrogen_dioxide&hourly=pm2_5,pm10,european_aqi&past_days=2&forecast_days=1&timezone=Europe%2FRome`;
  const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,wind_speed_10m&timezone=Europe%2FRome`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const [aqRes, meteoRes] = await Promise.all([
      fetch(aqUrl, { signal: controller.signal }),
      fetch(meteoUrl, { signal: controller.signal }),
    ]);

    if (!aqRes.ok || !meteoRes.ok) {
      throw new Error(`Open-Meteo HTTP ${aqRes.status}/${meteoRes.status}`);
    }

    const aqJson = (await aqRes.json()) as {
      current?: {
        pm2_5?: number;
        pm10?: number;
        european_aqi?: number;
        nitrogen_dioxide?: number;
      };
      hourly?: {
        time?: string[];
        pm2_5?: (number | null)[];
        pm10?: (number | null)[];
        european_aqi?: (number | null)[];
      };
    };
    const meteoJson = (await meteoRes.json()) as {
      current?: {
        temperature_2m?: number;
        wind_speed_10m?: number;
      };
    };

    const times = aqJson.hourly?.time ?? [];
    const pm25Arr = aqJson.hourly?.pm2_5 ?? [];
    const pm10Arr = aqJson.hourly?.pm10 ?? [];
    const aqiArr = aqJson.hourly?.european_aqi ?? [];

    // Keep observed past + current hours up to current time (max 48h window)
    const nowIsoPrefix = new Date().toISOString().slice(0, 13);
    const hourlySeries: HourlyAirPoint[] = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t <= nowIsoPrefix) {
        hourlySeries.push({
          time: t,
          pm25: pm25Arr[i] ?? null,
          pm10: pm10Arr[i] ?? null,
          europeanAqi: aqiArr[i] ?? null,
        });
      }
    }
    const trimmedSeries = hourlySeries.slice(-48);

    const aqi =
      typeof aqJson.current?.european_aqi === 'number'
        ? Math.round(aqJson.current.european_aqi)
        : null;

    const reading: LiveEnvironmentReading = {
      municipalityId: city.id,
      nome: city.nome,
      available: true,
      fetchedAt: new Date().toISOString(),
      europeanAqi: aqi,
      aqiLabel: classifyEuropeanAqi(aqi),
      pm25:
        typeof aqJson.current?.pm2_5 === 'number'
          ? Math.round(aqJson.current.pm2_5 * 10) / 10
          : null,
      pm10:
        typeof aqJson.current?.pm10 === 'number'
          ? Math.round(aqJson.current.pm10 * 10) / 10
          : null,
      no2:
        typeof aqJson.current?.nitrogen_dioxide === 'number'
          ? Math.round(aqJson.current.nitrogen_dioxide * 10) / 10
          : null,
      temperatureC:
        typeof meteoJson.current?.temperature_2m === 'number'
          ? Math.round(meteoJson.current.temperature_2m * 10) / 10
          : null,
      windSpeedKmh:
        typeof meteoJson.current?.wind_speed_10m === 'number'
          ? Math.round(meteoJson.current.wind_speed_10m * 10) / 10
          : null,
      hourlySeries: trimmedSeries,
    };

    envCache.set(city.id, { reading, expiresAt: now + 5 * 60 * 1000 });
    return reading;
  } catch (err) {
    if (cached) {
      return cached.reading;
    }
    return {
      municipalityId: city.id,
      nome: city.nome,
      available: false,
      error:
        err instanceof Error
          ? err.message
          : 'Errore di connessione a Open-Meteo',
      fetchedAt: new Date().toISOString(),
      europeanAqi: null,
      aqiLabel: 'N/D',
      pm25: null,
      pm10: null,
      no2: null,
      temperatureC: null,
      windSpeedKmh: null,
      hourlySeries: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  let perceptionStore = loadPerceptionStore();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      municipalitiesCount: dataset.municipalities.length,
      provincesCount: Object.keys(dataset.provinces).length,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/bootstrap', (_req, res) => {
    const defaultIds = ['037006', '015146', '072006']; // Bologna, Milano, Bari
    const defaultCities = defaultIds
      .map((id) => muniById.get(id))
      .filter((m): m is RawMunicipalRecord => Boolean(m))
      .map((m) => enrichMunicipality(m, perceptionStore));

    res.json({
      generatedAt: dataset.generatedAt,
      totalMunicipalities: dataset.municipalities.length,
      totalProvinces: Object.keys(dataset.provinces).length,
      sources: dataset.sources,
      indicatorMeta: dataset.indicatorMeta,
      benchmarks: dataset.benchmarks,
      defaultCities,
    });
  });

  app.get('/api/municipalities/by-ids', (req, res) => {
    const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);

    const cities = ids
      .map((id) => muniById.get(id))
      .filter((m): m is RawMunicipalRecord => Boolean(m))
      .map((m) => enrichMunicipality(m, perceptionStore));

    res.json({ cities });
  });

  app.get('/api/municipalities/search', (req, res) => {
    const q = (typeof req.query.q === 'string' ? req.query.q : '')
      .trim()
      .toLowerCase();
    const region =
      typeof req.query.region === 'string' ? req.query.region : 'Tutte';
    const tier = typeof req.query.tier === 'string' ? req.query.tier : 'Tutte';
    const onlyCapoluoghi = req.query.capoluoghi === '1';
    const sortBy =
      typeof req.query.sort === 'string' ? req.query.sort : 'popolazione';
    const dir = req.query.dir === 'asc' ? 1 : -1;
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 50)
    );
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const filtered = dataset.municipalities.filter((m) => {
      if (onlyCapoluoghi && !m.capoluogo) return false;
      if (region !== 'Tutte' && m.ripartizione !== region) return false;
      if (tier !== 'Tutte' && m.fascia !== tier) return false;
      if (q) {
        const match =
          m.nome.toLowerCase().includes(q) ||
          m.sigla.toLowerCase() === q ||
          m.provincia.toLowerCase().includes(q) ||
          m.regione.toLowerCase().includes(q) ||
          m.codiceIstat === q;
        if (!match) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      // Prioritize exact prefix match when user is typing a search query
      if (q) {
        const aStarts = a.nome.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.nome.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
      }

      const getVal = (m: RawMunicipalRecord): number => {
        if (sortBy === 'indiceComplessivo') return m.indiceComplessivo;
        if (sortBy === 'reddito')
          return m.mef2024?.redditoMedioImponibile ?? 0;
        if (
          sortBy === 'economia' ||
          sortBy === 'finanza' ||
          sortBy === 'qualita' ||
          sortBy === 'sociale' ||
          sortBy === 'sostenibilita'
        ) {
          return m.pillars[sortBy];
        }
        return m.popolazione;
      };
      return (getVal(a) - getVal(b)) * dir;
    });

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit).map(toSummary);

    res.json({ total, items });
  });

  app.get('/api/live/environment', async (req, res) => {
    const idsParam = typeof req.query.ids === 'string' ? req.query.ids : '';
    const force = req.query.force === '1';
    const requestedIds = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);

    const targets = (
      requestedIds.length > 0 ? requestedIds : ['037006', '015146', '072006']
    )
      .map((id) => muniById.get(id))
      .filter((m): m is RawMunicipalRecord => Boolean(m));

    if (targets.length === 0) {
      res.status(400).json({ error: 'Nessun comune valido specificato.' });
      return;
    }

    const readings = await Promise.all(
      targets.map((city) => fetchCityEnvironment(city, force))
    );
    res.json({ readings, updatedAt: new Date().toISOString() });
  });

  app.get('/api/perception', (_req, res) => {
    res.json({ perception: perceptionStore });
  });

  app.post('/api/perception', (req, res) => {
    const clientIp =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip) || 'unknown';
    const nowMs = Date.now();
    const rateEntry = perceptionRateLimit.get(clientIp);
    if (rateEntry && rateEntry.resetAt > nowMs) {
      if (rateEntry.count >= 20) {
        res.status(429).json({
          error:
            'Troppe valutazioni inviate in pochi minuti. Riprova più tardi.',
        });
        return;
      }
      rateEntry.count += 1;
    } else {
      perceptionRateLimit.set(clientIp, {
        count: 1,
        resetAt: nowMs + 10 * 60 * 1000,
      });
    }

    const { municipalityId, scores, priority } = req.body as {
      municipalityId?: string;
      scores?: Partial<PillarScores>;
      priority?: string;
    };

    const city = municipalityId ? muniById.get(municipalityId) : undefined;
    if (!city) {
      res.status(404).json({ error: 'Comune non trovato.' });
      return;
    }

    if (!scores || typeof scores !== 'object') {
      res.status(400).json({ error: 'Valutazioni per pilastro mancanti.' });
      return;
    }

    const validatedScores = {} as PillarScores;
    for (const key of PILLAR_KEYS) {
      const rawVal = Number(scores[key]);
      if (!Number.isFinite(rawVal) || rawVal < 1 || rawVal > 10) {
        res.status(400).json({
          error: `Il punteggio per ${key} deve essere compreso tra 1 e 10.`,
        });
        return;
      }
      validatedScores[key] = rawVal;
    }

    const current = perceptionStore[city.id] ?? EMPTY_PERCEPTION;
    const newCount = current.votesCount + 1;
    const updatedScores = {} as PillarScores;

    for (const key of PILLAR_KEYS) {
      const prevVal = current.scores ? current.scores[key] : 0;
      const nextVal = (prevVal * current.votesCount + validatedScores[key]) / newCount;
      updatedScores[key] = Math.round(nextVal * 10) / 10;
    }

    const overall =
      Math.round(
        ((updatedScores.economia +
          updatedScores.finanza +
          updatedScores.qualita +
          updatedScores.sociale +
          updatedScores.sostenibilita) /
          5) *
          10
      ) / 10;

    const cleanPriority =
      typeof priority === 'string'
        ? priority.trim().replace(/[<>]/g, '').slice(0, 72)
        : '';

    const updatedPriorities = cleanPriority
      ? [
          cleanPriority,
          ...current.recentPriorities.filter((p) => p !== cleanPriority),
        ].slice(0, 5)
      : current.recentPriorities;

    const nextAggregate: PerceptionAggregate = {
      votesCount: newCount,
      scores: updatedScores,
      overall,
      recentPriorities: updatedPriorities,
      lastUpdated: new Date().toISOString(),
    };

    perceptionStore = {
      ...perceptionStore,
      [city.id]: nextAggregate,
    };
    savePerceptionStore(perceptionStore);

    res.status(201).json({
      municipalityId: city.id,
      perception: nextAggregate,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(
      `Osservatorio Civico Italia attivo sulla porta ${port} (${dataset.municipalities.length} comuni reali caricati)`
    );
  });
}

startServer().catch((err) => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});
