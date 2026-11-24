import type { IndicatorMeta, PillarKey } from '../types/civic';

export const PILLAR_META: Record<
  PillarKey,
  { label: string; shortLabel: string; description: string }
> = {
  economia: {
    label: 'Economia & Lavoro',
    shortLabel: 'Economia',
    description:
      'Reddito imponibile comunale (MEF), valore aggiunto, occupazione, startup innovative ed export provinciale.',
  },
  finanza: {
    label: 'Finanza & Amministrazione',
    shortLabel: 'Finanza',
    description:
      'Capacità di riscossione comunale, qualità amministrativa, puntualità pagamenti e spesa culturale.',
  },
  qualita: {
    label: 'Qualità della Vita & Servizi',
    shortLabel: 'Qualità',
    description:
      'Servizi digitali comunali, banda ultra veloce, medici di base, offerta culturale e sicurezza.',
  },
  sociale: {
    label: 'Coesione Sociale & Demografia',
    shortLabel: 'Sociale',
    description:
      'Distribuzione dei redditi comunali (MEF), disuguaglianza, istruzione, speranza di vita, non profit e partecipazione.',
  },
  sostenibilita: {
    label: 'Sostenibilità Ambientale',
    shortLabel: 'Sostenibilità',
    description:
      'Ecosistema urbano, raccolta differenziata, energia rinnovabile, illuminazione LED e aree protette.',
  },
};

export const PILLAR_KEYS: PillarKey[] = [
  'economia',
  'finanza',
  'qualita',
  'sociale',
  'sostenibilita',
];

export const CITY_PALETTE = [
  { hex: '#1E3A8A', name: 'Blu Lapis' },
  { hex: '#9A3412', name: 'Terracotta' },
  { hex: '#14532D', name: 'Verde Bosco' },
  { hex: '#78350F', name: 'Bronzo' },
] as const;

export const MEF_INDICATOR_DEFS: IndicatorMeta[] = [
  {
    key: 'redditoMedioImponibile',
    label: 'Reddito medio imponibile IRPEF per contribuente',
    pillar: 'economia',
    higherIsBetter: true,
    unit: '€',
    decimals: 0,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'impostaNettaMedia',
    label: 'Imposta netta IRPEF media per contribuente',
    pillar: 'finanza',
    higherIsBetter: true,
    unit: '€',
    decimals: 0,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'addizionaleProCapite',
    label: 'Gettito addizionale comunale IRPEF pro capite',
    pillar: 'finanza',
    higherIsBetter: true,
    unit: '€/ab.',
    decimals: 1,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'quotaLavoroDipendente',
    label: 'Quota redditi da lavoro dipendente e assimilati',
    pillar: 'economia',
    higherIsBetter: true,
    unit: '%',
    decimals: 1,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'quotaPensioni',
    label: 'Quota redditi da pensione sul reddito totale',
    pillar: 'sociale',
    higherIsBetter: false,
    unit: '%',
    decimals: 1,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'quotaFasciaBassa15k',
    label: 'Contribuenti con reddito ≤ 15.000 €',
    pillar: 'sociale',
    higherIsBetter: false,
    unit: '%',
    decimals: 1,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
  {
    key: 'quotaFasciaAlta55k',
    label: 'Contribuenti con reddito > 55.000 €',
    pillar: 'economia',
    higherIsBetter: true,
    unit: '%',
    decimals: 1,
    referenceYear: '2024',
    source: 'MEF · Dip. Finanze',
    scope: 'Comunale',
  },
];

export type RealTrendKey =
  | 'redditoMedioImponibile'
  | 'addizionaleProCapite'
  | 'tassoOccupazione'
  | 'quotaExportPil'
  | 'offertaCulturale'
  | 'tassoMotorizzazione';

export const REAL_TREND_OPTIONS: {
  id: RealTrendKey;
  label: string;
  unit: string;
  decimals: number;
  scope: 'Comunale (MEF 2020–2024)' | 'Provinciale (ISTAT/QDV 2020–2025)';
  source: string;
}[] = [
  {
    id: 'redditoMedioImponibile',
    label: 'Reddito imponibile (€)',
    unit: '€',
    decimals: 0,
    scope: 'Comunale (MEF 2020–2024)',
    source: 'MEF · Dip. Finanze (2020–2024)',
  },
  {
    id: 'addizionaleProCapite',
    label: 'Addizionale IRPEF (€/ab.)',
    unit: '€/ab.',
    decimals: 1,
    scope: 'Comunale (MEF 2020–2024)',
    source: 'MEF · Dip. Finanze (2020–2024)',
  },
  {
    id: 'tassoOccupazione',
    label: 'Occupazione 20–64 (%)',
    unit: '%',
    decimals: 1,
    scope: 'Provinciale (ISTAT/QDV 2020–2025)',
    source: 'ISTAT · Forze di lavoro (ed. QDV 2020–2025)',
  },
  {
    id: 'quotaExportPil',
    label: 'Export sul PIL (%)',
    unit: '%',
    decimals: 1,
    scope: 'Provinciale (ISTAT/QDV 2020–2025)',
    source: 'Prometeia · QDV 2020–2025',
  },
  {
    id: 'offertaCulturale',
    label: 'Offerta culturale',
    unit: 'spett./1.000 ab.',
    decimals: 1,
    scope: 'Provinciale (ISTAT/QDV 2020–2025)',
    source: 'SIAE · QDV 2020–2025',
  },
  {
    id: 'tassoMotorizzazione',
    label: 'Motorizzazione',
    unit: 'auto/100 ab.',
    decimals: 1,
    scope: 'Provinciale (ISTAT/QDV 2020–2025)',
    source: 'ACI / ISTAT · QDV 2020–2025',
  },
];
