#!/usr/bin/env python3
"""
Scarica e aggrega esclusivamente dataset ufficiali reali per tutti i comuni italiani:
1. Anagrafica ISTAT / comuni-italiani (popolazione, superficie, coordinate, provincia, regione)
2. MEF Dipartimento delle Finanze - IRPEF su base comunale (anni d'imposta 2020-2024, 8 serie storiche comunali)
3. Il Sole 24 Ore QDV 2020-2025 (23 indicatori attuali + 18 serie storiche provinciali 2020-2025)
"""

import csv
from datetime import datetime, timezone
import io
import json
import os
import urllib.request
import zipfile
from typing import Any, Dict, List, Optional, Tuple

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
OUT_FILE = os.path.join(OUT_DIR, "real-italy-dataset.json")

COMUNI_URL = "https://cdn.jsdelivr.net/gh/RP92/comuni-italiani/data/comuni.json"

MEF_URLS = {
    2020: "https://www1.finanze.gov.it/finanze/analisi_stat/public/v_4_0_0/contenuti/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2020.zip",
    2021: "https://www1.finanze.gov.it/finanze/analisi_stat/public/v_4_0_0/contenuti/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2021.zip",
    2022: "https://www1.finanze.gov.it/finanze/analisi_stat/public/v_4_0_0/contenuti/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2022.zip",
    2023: "https://www1.finanze.gov.it/finanze/analisi_stat/public/v_4_0_0/contenuti/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2023.zip",
    2024: "https://www1.finanze.gov.it/finanze/analisi_stat/public/v_4_0_0/contenuti/Redditi_e_principali_variabili_IRPEF_su_base_comunale_CSV_2024.zip",
}

QDV_URLS = {
    2025: "https://raw.githubusercontent.com/IlSole24ORE/QDV2025/main/20251201_QDV2025_001.csv",
    2024: "https://raw.githubusercontent.com/IlSole24ORE/QDV2024/main/20241216_QDV2024_001.csv",
    2023: "https://raw.githubusercontent.com/IlSole24ORE/QDV2023/main/20231204_QDV2023_001.csv",
    2022: "https://raw.githubusercontent.com/IlSole24ORE/QDV2022/main/20221213_QDV2022_001.csv",
    2021: "https://raw.githubusercontent.com/IlSole24ORE/QDV2021/main/20211213_QDV2021_001.csv",
    2020: "https://raw.githubusercontent.com/IlSole24ORE/QDV2020/main/20201214_QDV2020_001.csv",
}

# Indicatori reali QDV 2025 mappati ai 5 pilastri
QDV_SELECTED_INDICATORS = [
    # Economia
    ("Valore aggiunto per abitante", "valoreAggiuntoProCapite", "economia", True, "k€/ab.", 1),
    ("Tasso di occupazione", "tassoOccupazione", "economia", True, "%", 1),
    ("Startup innovative", "startupInnovative", "economia", True, "ogni 1.000 soc.", 1),
    ("Quota di export sul Pil", "quotaExportPil", "economia", True, "%", 1),
    ("Depositi bancari delle famiglie consumatrici", "depositiBancari", "economia", True, "k€/ab.", 1),
    # Finanza & Amministrazione
    ("Comuni: capacità di riscossione", "capacitaRiscossione", "finanza", True, "%", 1),
    ("Qualità delle amministrazioni locali", "qualitaAmministrazioni", "finanza", True, "indice", 2),
    ("Pagamenti delle fatture alla scadenza", "pagamentiPuntuali", "finanza", True, "%", 1),
    ("Spesa dei Comuni per la cultura", "spesaComuniCultura", "finanza", True, "€/ab.", 1),
    # Qualità della Vita & Servizi
    ("Comuni con servizi per le famiglie interamente online", "serviziFamiglieOnline", "qualita", True, "%", 1),
    ("Copertura della rete fissa di accesso ultra veloce a internet", "coperturaBandaUltraveloce", "qualita", True, "%", 1),
    ("Medici di medicina generale", "mediciPer10k", "qualita", True, "ogni 10k ab.", 1),
    ("Offerta culturale", "offertaCulturale", "qualita", True, "spett./1.000 ab.", 1),
    ("Indice di criminalità", "indiceCriminalita", "qualita", False, "reati/100k ab.", 0),
    # Coesione Sociale & Demografia
    ("Speranza di vita alla nascita", "speranzaVita", "sociale", True, "anni", 1),
    ("Persone con almeno il diploma", "personeConDiploma", "sociale", True, "%", 1),
    ("Disuguaglianza del reddito netto", "disuguaglianzaReddito", "sociale", False, "rapporto Q5/Q1", 2),
    ("Organizzazioni non profit", "organizzazioniNonProfit", "sociale", True, "ogni 10k ab.", 1),
    ("Partecipazione elettorale", "partecipazioneElettorale", "sociale", True, "%", 1),
    # Sostenibilità Ambientale
    ("Ecosistema urbano", "ecosistemaUrbano", "sostenibilita", True, "indice 0-100", 1),
    ("Raccolta differenziata dei rifiuti urbani", "raccoltaDifferenziata", "sostenibilita", True, "%", 1),
    ("Energia elettrica da fonti rinnovabili", "energiaRinnovabile", "sostenibilita", True, "%", 1),
    ("Illuminazione pubblica sostenibile", "illuminazioneLed", "sostenibilita", True, "% LED", 1),
    ("Aree protette", "areeProtette", "sostenibilita", True, "% sup.", 1),
]

# Alias storici esatti nei QDV 2020-2025 -> chiave canonica
QDV_HISTORY_ALIASES = {
    "Valore aggiunto per abitante": "valoreAggiuntoProCapite",
    "Tasso di occupazione": "tassoOccupazione",
    "Startup innovative": "startupInnovative",
    "Quota di export sul Pil": "quotaExportPil",
    "Depositi bancari delle famiglie consumatrici": "depositiBancari",
    "Depositi bancari": "depositiBancari",
    "Comuni: capacità di riscossione": "capacitaRiscossione",
    "Capacità di riscossione dei Comuni": "capacitaRiscossione",
    "Spesa dei Comuni per la cultura": "spesaComuniCultura",
    "Medici di medicina generale": "mediciPer10k",
    "Offerta culturale": "offertaCulturale",
    "Indice di criminalità": "indiceCriminalita",
    "Indice di criminalità - totale dei delitti denunciati": "indiceCriminalita",
    "Speranza di vita alla nascita": "speranzaVita",
    "Persone con almeno il diploma": "personeConDiploma",
    "Partecipazione elettorale": "partecipazioneElettorale",
    "Ecosistema urbano": "ecosistemaUrbano",
    "Raccolta differenziata dei rifiuti urbani": "raccoltaDifferenziata",
    "Raccolta differenziata": "raccoltaDifferenziata",
    "Energia elettrica da fonti rinnovabili": "energiaRinnovabile",
    "Illuminazione pubblica sostenibile": "illuminazioneLed",
    "Aree protette": "areeProtette",
    "Tasso di motorizzazione": "tassoMotorizzazione",
}

PROVINCE_NAME_ALIASES = {
    "Valle d'Aosta/Vallée d'Aoste": "AO",
    "Aosta": "AO",
    "Bolzano/Bozen": "BZ",
    "Bolzano": "BZ",
    "Trento": "TN",
    "Torino": "TO",
    "Vercelli": "VC",
    "Novara": "NO",
    "Cuneo": "CN",
    "Asti": "AT",
    "Alessandria": "AL",
    "Biella": "BI",
    "Verbano-Cusio-Ossola": "VB",
    "Imperia": "IM",
    "Savona": "SV",
    "Genova": "GE",
    "La Spezia": "SP",
    "Varese": "VA",
    "Como": "CO",
    "Sondrio": "SO",
    "Milano": "MI",
    "Bergamo": "BG",
    "Brescia": "BS",
    "Pavia": "PV",
    "Cremona": "CR",
    "Mantova": "MN",
    "Lecco": "LC",
    "Lodi": "LO",
    "Monza e della Brianza": "MB",
    "Monza e Brianza": "MB",
    "Verona": "VR",
    "Vicenza": "VI",
    "Belluno": "BL",
    "Treviso": "TV",
    "Venezia": "VE",
    "Padova": "PD",
    "Rovigo": "RO",
    "Udine": "UD",
    "Gorizia": "GO",
    "Trieste": "TS",
    "Pordenone": "PN",
    "Piacenza": "PC",
    "Parma": "PR",
    "Reggio nell'Emilia": "RE",
    "Reggio Emilia": "RE",
    "Modena": "MO",
    "Bologna": "BO",
    "Ferrara": "FE",
    "Ravenna": "RA",
    "Forlì-Cesena": "FC",
    "Rimini": "RN",
    "Massa-Carrara": "MS",
    "Massa Carrara": "MS",
    "Lucca": "LU",
    "Pistoia": "PT",
    "Firenze": "FI",
    "Livorno": "LI",
    "Pisa": "PI",
    "Arezzo": "AR",
    "Siena": "SI",
    "Grosseto": "GR",
    "Prato": "PO",
    "Perugia": "PG",
    "Terni": "TR",
    "Pesaro e Urbino": "PU",
    "Ancona": "AN",
    "Macerata": "MC",
    "Ascoli Piceno": "AP",
    "Fermo": "FM",
    "Viterbo": "VT",
    "Rieti": "RI",
    "Roma": "RM",
    "Latina": "LT",
    "Frosinone": "FR",
    "L'Aquila": "AQ",
    "Teramo": "TE",
    "Pescara": "PE",
    "Chieti": "CH",
    "Campobasso": "CB",
    "Isernia": "IS",
    "Caserta": "CE",
    "Benevento": "BN",
    "Napoli": "NA",
    "Avellino": "AV",
    "Salerno": "SA",
    "Foggia": "FG",
    "Bari": "BA",
    "Taranto": "TA",
    "Brindisi": "BR",
    "Lecce": "LE",
    "Barletta-Andria-Trani": "BT",
    "Potenza": "PZ",
    "Matera": "MT",
    "Cosenza": "CS",
    "Catanzaro": "CZ",
    "Reggio di Calabria": "RC",
    "Reggio Calabria": "RC",
    "Crotone": "KR",
    "Vibo Valentia": "VV",
    "Trapani": "TP",
    "Palermo": "PA",
    "Messina": "ME",
    "Agrigento": "AG",
    "Caltanissetta": "CL",
    "Enna": "EN",
    "Catania": "CT",
    "Ragusa": "RG",
    "Siracusa": "SR",
    "Sassari": "SS",
    "Nuoro": "NU",
    "Cagliari": "CA",
    "Oristano": "OR",
    "Sud Sardegna": "SU",
}


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(
        url, headers={"User-Agent": "OsservatorioCivicoItalia/1.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def safe_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip().replace(",", ".")
    if not s or s in {"-", "N/A", "nd", "n.d."}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def safe_int(val: Any) -> int:
    f = safe_float(val)
    return int(round(f)) if f is not None else 0


def parse_mef_year(year: int, url: str) -> Dict[str, Dict[str, float]]:
    print(f"Scarico MEF IRPEF {year}...")
    raw = fetch_bytes(url)
    z = zipfile.ZipFile(io.BytesIO(raw))
    csv_name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    with z.open(csv_name) as f:
        text = f.read().decode("utf-8-sig", errors="replace")

    reader = csv.reader(io.StringIO(text), delimiter=";")
    next(reader)

    by_istat: Dict[str, Dict[str, float]] = {}
    for row in reader:
        if len(row) < 25:
            continue
        istat = row[2].strip().zfill(6)
        if not istat or istat == "000000":
            continue
        contribuenti = safe_int(row[7])
        if contribuenti <= 0:
            continue

        dip_amt = safe_int(row[11])
        pens_amt = safe_int(row[13])
        imponibile_freq = safe_int(row[22]) or contribuenti
        imponibile_amt = safe_int(row[23])
        imposta_netta_amt = safe_int(row[25])
        add_com_amt = safe_int(row[33])
        tot_reddito_amt = safe_int(row[35]) or imponibile_amt

        f_le0 = safe_int(row[36])
        f_0_10 = safe_int(row[38])
        f_10_15 = safe_int(row[40])
        f_55_75 = safe_int(row[46])
        f_75_120 = safe_int(row[48])
        f_over120 = safe_int(row[50])

        avg_imponibile = round(imponibile_amt / imponibile_freq, 0) if imponibile_freq else 0
        avg_imposta = round(imposta_netta_amt / contribuenti, 0)
        dip_share = round((dip_amt / tot_reddito_amt) * 100, 1) if tot_reddito_amt > 0 else 0
        pens_share = round((pens_amt / tot_reddito_amt) * 100, 1) if tot_reddito_amt > 0 else 0
        low_bracket_pct = round(((f_le0 + f_0_10 + f_10_15) / contribuenti) * 100, 1)
        high_bracket_pct = round(((f_55_75 + f_75_120 + f_over120) / contribuenti) * 100, 1)

        by_istat[istat] = {
            "contribuenti": contribuenti,
            "redditoMedioImponibile": avg_imponibile,
            "impostaNettaMedia": avg_imposta,
            "addizionaleComunaleTotale": add_com_amt,
            "quotaLavoroDipendente": dip_share,
            "quotaPensioni": pens_share,
            "quotaFasciaBassa15k": low_bracket_pct,
            "quotaFasciaAlta55k": high_bracket_pct,
        }
    return by_istat


def resolve_sigla(row: Dict[str, str]) -> Optional[str]:
    for field in ("DENOMINAZIONE CORRENTE", "NOME PROVINCIA (ISTAT)"):
        val = (row.get(field) or "").strip()
        if val in PROVINCE_NAME_ALIASES:
            return PROVINCE_NAME_ALIASES[val]
    return None


def parse_qdv_datasets() -> Tuple[
    Dict[str, Dict[str, Any]],
    Dict[str, Dict[str, Any]],
    Dict[str, Dict[int, Dict[str, float]]],
]:
    print("Scarico Sole 24 Ore QDV 2025...")
    txt2025 = fetch_bytes(QDV_URLS[2025]).decode("utf-8-sig", errors="replace")
    reader2025 = csv.DictReader(io.StringIO(txt2025))

    target_by_name = {item[0]: item for item in QDV_SELECTED_INDICATORS}
    decimals_by_key = {item[1]: item[5] for item in QDV_SELECTED_INDICATORS}
    decimals_by_key["tassoMotorizzazione"] = 1

    provinces: Dict[str, Dict[str, Any]] = {}
    indicator_meta: Dict[str, Dict[str, Any]] = {}

    for row in reader2025:
        ind_name = (row.get("INDICATORE") or "").strip()
        if ind_name not in target_by_name:
            continue
        sigla = resolve_sigla(row)
        if not sigla:
            continue
        val = safe_float(row.get("VALORE"))
        if val is None:
            continue

        _, key, pillar, higher_is_better, unit, decimals = target_by_name[ind_name]
        if key not in indicator_meta:
            indicator_meta[key] = {
                "key": key,
                "label": ind_name,
                "pillar": pillar,
                "higherIsBetter": higher_is_better,
                "unit": unit,
                "decimals": decimals,
                "referenceYear": (row.get("ANNO DI RIFERIMENTO DEI DATI") or "").strip(),
                "source": (row.get("FONTE") or "").strip(),
                "scope": "Provinciale",
            }

        if sigla not in provinces:
            provinces[sigla] = {
                "sigla": sigla,
                "nome": (row.get("DENOMINAZIONE CORRENTE") or sigla).strip(),
                "metrics": {},
            }
        provinces[sigla]["metrics"][key] = round(val, decimals)

    # Tutte le serie storiche provinciali 2020-2025 con alias unificati
    prov_history: Dict[str, Dict[int, Dict[str, float]]] = {}
    for year, url in sorted(QDV_URLS.items()):
        print(f"Scarico QDV storico {year}...")
        txt = fetch_bytes(url).decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(txt))
        for row in reader:
            ind = (row.get("INDICATORE") or "").strip()
            if ind not in QDV_HISTORY_ALIASES:
                continue
            sigla = resolve_sigla(row)
            if not sigla:
                continue
            val = safe_float(row.get("VALORE"))
            if val is None:
                continue
            key = QDV_HISTORY_ALIASES[ind]
            dec = decimals_by_key.get(key, 1)
            prov_history.setdefault(sigla, {}).setdefault(year, {})[key] = round(val, dec)

    return provinces, indicator_meta, prov_history


def compute_normalized_scores(
    comuni: List[Dict[str, Any]],
    provinces: Dict[str, Dict[str, Any]],
) -> None:
    def percentile_bounds(vals: List[float]) -> Tuple[float, float]:
        clean = sorted(vals)
        if not clean:
            return 0.0, 1.0
        lo = clean[max(0, int(len(clean) * 0.02))]
        hi = clean[min(len(clean) - 1, int(len(clean) * 0.98))]
        if hi <= lo:
            return clean[0], clean[-1] if clean[-1] > clean[0] else clean[0] + 1.0
        return lo, hi

    def norm_val(v: Optional[float], bounds: Tuple[float, float], higher: bool) -> float:
        if v is None:
            return 50.0
        lo, hi = bounds
        clamped = max(lo, min(hi, v))
        ratio = (clamped - lo) / (hi - lo)
        if not higher:
            ratio = 1.0 - ratio
        return 15.0 + ratio * 80.0

    prov_bounds: Dict[str, Tuple[float, float]] = {}
    for _, key, _, _, _, _ in QDV_SELECTED_INDICATORS:
        vals = [
            p["metrics"][key]
            for p in provinces.values()
            if key in p["metrics"] and p["metrics"][key] is not None
        ]
        prov_bounds[key] = percentile_bounds(vals)

    mef_bounds: Dict[str, Tuple[float, float]] = {}
    for k in ("redditoMedioImponibile", "addizionaleProCapite", "quotaFasciaBassa15k"):
        vals = [c["mef2024"][k] for c in comuni if c.get("mef2024") and c["mef2024"].get(k) is not None]
        mef_bounds[k] = percentile_bounds(vals)

    for c in comuni:
        sigla = c["sigla"]
        p_metrics = provinces.get(sigla, {}).get("metrics", {})
        mef = c.get("mef2024") or {}

        eco_parts = [
            norm_val(mef.get("redditoMedioImponibile"), mef_bounds["redditoMedioImponibile"], True),
            norm_val(p_metrics.get("valoreAggiuntoProCapite"), prov_bounds["valoreAggiuntoProCapite"], True),
            norm_val(p_metrics.get("tassoOccupazione"), prov_bounds["tassoOccupazione"], True),
            norm_val(p_metrics.get("startupInnovative"), prov_bounds["startupInnovative"], True),
            norm_val(p_metrics.get("quotaExportPil"), prov_bounds["quotaExportPil"], True),
        ]
        fin_parts = [
            norm_val(p_metrics.get("capacitaRiscossione"), prov_bounds["capacitaRiscossione"], True),
            norm_val(p_metrics.get("qualitaAmministrazioni"), prov_bounds["qualitaAmministrazioni"], True),
            norm_val(p_metrics.get("pagamentiPuntuali"), prov_bounds["pagamentiPuntuali"], True),
            norm_val(p_metrics.get("spesaComuniCultura"), prov_bounds["spesaComuniCultura"], True),
        ]
        qual_parts = [
            norm_val(p_metrics.get("serviziFamiglieOnline"), prov_bounds["serviziFamiglieOnline"], True),
            norm_val(p_metrics.get("coperturaBandaUltraveloce"), prov_bounds["coperturaBandaUltraveloce"], True),
            norm_val(p_metrics.get("mediciPer10k"), prov_bounds["mediciPer10k"], True),
            norm_val(p_metrics.get("offertaCulturale"), prov_bounds["offertaCulturale"], True),
            norm_val(p_metrics.get("indiceCriminalita"), prov_bounds["indiceCriminalita"], False),
        ]
        soc_parts = [
            norm_val(mef.get("quotaFasciaBassa15k"), mef_bounds["quotaFasciaBassa15k"], False),
            norm_val(p_metrics.get("speranzaVita"), prov_bounds["speranzaVita"], True),
            norm_val(p_metrics.get("personeConDiploma"), prov_bounds["personeConDiploma"], True),
            norm_val(p_metrics.get("disuguaglianzaReddito"), prov_bounds["disuguaglianzaReddito"], False),
            norm_val(p_metrics.get("organizzazioniNonProfit"), prov_bounds["organizzazioniNonProfit"], True),
            norm_val(p_metrics.get("partecipazioneElettorale"), prov_bounds["partecipazioneElettorale"], True),
        ]
        sost_parts = [
            norm_val(p_metrics.get("ecosistemaUrbano"), prov_bounds["ecosistemaUrbano"], True),
            norm_val(p_metrics.get("raccoltaDifferenziata"), prov_bounds["raccoltaDifferenziata"], True),
            norm_val(p_metrics.get("energiaRinnovabile"), prov_bounds["energiaRinnovabile"], True),
            norm_val(p_metrics.get("illuminazioneLed"), prov_bounds["illuminazioneLed"], True),
            norm_val(p_metrics.get("areeProtette"), prov_bounds["areeProtette"], True),
        ]

        pillars = {
            "economia": round(sum(eco_parts) / len(eco_parts), 1),
            "finanza": round(sum(fin_parts) / len(fin_parts), 1),
            "qualita": round(sum(qual_parts) / len(qual_parts), 1),
            "sociale": round(sum(soc_parts) / len(soc_parts), 1),
            "sostenibilita": round(sum(sost_parts) / len(sost_parts), 1),
        }
        c["pillars"] = pillars
        c["indiceComplessivo"] = round(sum(pillars.values()) / 5.0, 1)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)

    print("Scarico anagrafica comuni italiani...")
    raw_comuni = json.loads(fetch_bytes(COMUNI_URL).decode("utf-8"))

    mef_by_year = {}
    for yr, url in sorted(MEF_URLS.items()):
        mef_by_year[yr] = parse_mef_year(yr, url)

    provinces, indicator_meta, prov_history = parse_qdv_datasets()

    comuni_out: List[Dict[str, Any]] = []
    for item in raw_comuni:
        istat = str(item["codice"]).strip().zfill(6)
        pop = int(item.get("popolazione") or 0)
        sup = float(item.get("superficie") or 0.0)
        sigla = str(item.get("sigla") or "").strip()
        if sigla not in provinces:
            sigla_map = {"OT": "SS", "OG": "NU", "VS": "SU", "CI": "SU"}
            sigla = sigla_map.get(sigla, sigla)

        if pop >= 250000:
            fascia = "Metropoli (>250k)"
        elif pop >= 50000:
            fascia = "Città Media (50k–250k)"
        else:
            fascia = "Comune (<50k)"

        mef_2024 = mef_by_year[2024].get(istat)
        mef_series = []
        for yr in (2020, 2021, 2022, 2023, 2024):
            entry = mef_by_year[yr].get(istat)
            if entry:
                add_pc = round(entry["addizionaleComunaleTotale"] / pop, 1) if pop > 0 else 0
                mef_series.append(
                    {
                        "year": yr,
                        "redditoMedioImponibile": entry["redditoMedioImponibile"],
                        "impostaNettaMedia": entry["impostaNettaMedia"],
                        "contribuenti": entry["contribuenti"],
                        "addizionaleProCapite": add_pc,
                        "quotaLavoroDipendente": entry["quotaLavoroDipendente"],
                        "quotaPensioni": entry["quotaPensioni"],
                        "quotaFasciaBassa15k": entry["quotaFasciaBassa15k"],
                        "quotaFasciaAlta55k": entry["quotaFasciaAlta55k"],
                    }
                )

        mef_2024_clean = None
        if mef_2024:
            add_pc = round(mef_2024["addizionaleComunaleTotale"] / pop, 1) if pop > 0 else 0
            mef_2024_clean = {
                "contribuenti": mef_2024["contribuenti"],
                "redditoMedioImponibile": mef_2024["redditoMedioImponibile"],
                "impostaNettaMedia": mef_2024["impostaNettaMedia"],
                "addizionaleProCapite": add_pc,
                "quotaLavoroDipendente": mef_2024["quotaLavoroDipendente"],
                "quotaPensioni": mef_2024["quotaPensioni"],
                "quotaFasciaBassa15k": mef_2024["quotaFasciaBassa15k"],
                "quotaFasciaAlta55k": mef_2024["quotaFasciaAlta55k"],
            }

        zona_raw = (item.get("zona") or {}).get("nome", "Centro")
        zona_norm = {
            "Nord-ovest": "Nord-Ovest",
            "Nord-est": "Nord-Est",
            "Centro": "Centro",
            "Sud": "Sud e Isole",
            "Isole": "Sud e Isole",
        }.get(zona_raw, "Centro")

        coords = item.get("coordinate") or {}
        lat_val = coords.get("lat")
        lon_val = coords.get("lng")

        comuni_out.append(
            {
                "id": istat,
                "codiceIstat": istat,
                "nome": item["nome"],
                "sigla": sigla,
                "provincia": (item.get("provincia") or {}).get("nome", sigla),
                "regione": (item.get("regione") or {}).get("nome", ""),
                "ripartizione": zona_norm,
                "fascia": fascia,
                "capoluogo": bool(item.get("capoluogo")),
                "popolazione": pop,
                "superficieKm2": round(sup, 2),
                "densita": round(pop / sup, 1) if sup > 0 else 0,
                "lat": round(float(lat_val), 5) if lat_val is not None else None,
                "lon": round(float(lon_val), 5) if lon_val is not None else None,
                "mef2024": mef_2024_clean,
                "mefHistory": mef_series,
            }
        )

    compute_normalized_scores(comuni_out, provinces)

    def avg_mef(key: str) -> float:
        vals = [c["mef2024"][key] for c in comuni_out if c.get("mef2024") and c["mef2024"].get(key) is not None]
        return round(sum(vals) / len(vals), 1) if vals else 0.0

    def avg_prov(key: str) -> float:
        vals = [p["metrics"][key] for p in provinces.values() if key in p["metrics"]]
        return round(sum(vals) / len(vals), 2) if vals else 0.0

    mef_hist_keys = [
        ("redditoMedioImponibile", 0),
        ("impostaNettaMedia", 0),
        ("contribuenti", 0),
        ("addizionaleProCapite", 1),
        ("quotaLavoroDipendente", 1),
        ("quotaPensioni", 1),
        ("quotaFasciaBassa15k", 1),
        ("quotaFasciaAlta55k", 1),
    ]
    national_mef_history = []
    for yr in (2020, 2021, 2022, 2023, 2024):
        row: Dict[str, Any] = {"year": yr}
        pts = [pt for c in comuni_out for pt in c["mefHistory"] if pt["year"] == yr]
        for k, dec in mef_hist_keys:
            vals = [pt[k] for pt in pts if k in pt and pt[k] is not None]
            row[k] = round(sum(vals) / len(vals), dec) if vals else 0
        national_mef_history.append(row)

    prov_hist_keys = sorted(set(QDV_HISTORY_ALIASES.values()))
    national_prov_history = []
    for yr in (2020, 2021, 2022, 2023, 2024, 2025):
        row = {"year": yr}
        for k in prov_hist_keys:
            vals = [
                prov_history[s][yr][k]
                for s in prov_history
                if yr in prov_history[s] and k in prov_history[s][yr]
            ]
            if vals:
                row[k] = round(sum(vals) / len(vals), 1)
        national_prov_history.append(row)

    national_pillars = {
        k: round(sum(c["pillars"][k] for c in comuni_out) / len(comuni_out), 1)
        for k in ("economia", "finanza", "qualita", "sociale", "sostenibilita")
    }
    national_overall = round(sum(national_pillars.values()) / 5.0, 1)

    by_tier = {}
    for tier in ("Metropoli (>250k)", "Città Media (50k–250k)", "Comune (<50k)"):
        sub = [c for c in comuni_out if c["fascia"] == tier]
        by_tier[tier] = {
            "count": len(sub),
            "indiceComplessivo": round(sum(c["indiceComplessivo"] for c in sub) / len(sub), 1) if sub else 0,
            "pillars": {
                k: round(sum(c["pillars"][k] for c in sub) / len(sub), 1) if sub else 0
                for k in ("economia", "finanza", "qualita", "sociale", "sostenibilita")
            },
        }

    payload = {
        "generatedAt": datetime.now(timezone.utc).date().isoformat(),
        "sources": [
            {
                "name": "Anagrafica ISTAT / comuni-italiani",
                "scope": "Comunale (7.896 comuni)",
                "year": "2025",
            },
            {
                "name": "MEF — Dipartimento delle Finanze (Dichiarazioni IRPEF comunali)",
                "scope": "Comunale",
                "year": "2020–2024",
            },
            {
                "name": "Il Sole 24 Ore QDV 2020–2025 (fonti ISTAT, Prometeia, Banca d'Italia, ISPRA, Legambiente, Infocamere, Terna, SIAE, Cribis, SIOPE)",
                "scope": "Provinciale (107 province)",
                "year": "2020–2025",
            },
            {
                "name": "Open-Meteo Air Quality & Forecast API",
                "scope": "Comunale Live (coordinate WGS84)",
                "year": "Tempo reale",
            },
        ],
        "indicatorMeta": indicator_meta,
        "provinces": provinces,
        "provHistory": prov_history,
        "benchmarks": {
            "overall": {
                "indiceComplessivo": national_overall,
                "pillars": national_pillars,
                "mef2024": {
                    "redditoMedioImponibile": avg_mef("redditoMedioImponibile"),
                    "impostaNettaMedia": avg_mef("impostaNettaMedia"),
                    "addizionaleProCapite": avg_mef("addizionaleProCapite"),
                    "quotaLavoroDipendente": avg_mef("quotaLavoroDipendente"),
                    "quotaPensioni": avg_mef("quotaPensioni"),
                    "quotaFasciaBassa15k": avg_mef("quotaFasciaBassa15k"),
                    "quotaFasciaAlta55k": avg_mef("quotaFasciaAlta55k"),
                },
                "provMetrics": {
                    item[1]: avg_prov(item[1]) for item in QDV_SELECTED_INDICATORS
                },
                "mefHistory": national_mef_history,
                "provHistory": national_prov_history,
            },
            "byTier": by_tier,
        },
        "municipalities": comuni_out,
    }

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = os.path.getsize(OUT_FILE) / (1024 * 1024)
    print(f"Completato! Comuni: {len(comuni_out)}, Province: {len(provinces)}, Dimensione: {size_mb:.2f} MB")


if __name__ == "__main__":
    main()
