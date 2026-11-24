# Osservatorio Civico Italia

Piattaforma web di analisi e confronto civico su tutti i **7.896 comuni italiani** e le **107 province**, costruita esclusivamente su dataset pubblici ufficiali (ISTAT, MEF Dipartimento delle Finanze, Il Sole 24 Ore QDV) e telemetria ambientale in tempo reale (Open-Meteo).

## Funzionalità principali

- **Confronto testa a testa (1–4 comuni)**: radar normalizzato sui 5 pilastri (*Economia*, *Finanza & Amministrazione*, *Qualità della Vita & Servizi*, *Coesione Sociale*, *Sostenibilità Ambientale*), serie storiche ufficiali 2020–2025 e matrice di oltre 30 indicatori reali con distinzione esplicita di livello geografico (`Comunale` vs `Provinciale`).
- **Scheda Città monografica**: analisi approfondita di qualunque comune italiano con profilo vs Media Italia e media della stessa fascia demografica, distribuzione degli scaglioni di reddito IRPEF 2024 e griglia completa dei grafici storici reali 2020–2025 filtrabili per pilastro e livello.
- **Classifica su tutti i 7.896 comuni**: ricerca istantanea per nome, provincia, sigla o codice ISTAT; filtri per macro-ripartizione geografica, fascia demografica e capoluoghi; ordinamento per popolazione, reddito IRPEF e pilastri.
- **Dati ambientali live (Open-Meteo)**: rilevazione in tempo reale di EAQI, PM2.5, PM10, NO₂, temperatura, vento e serie storica oraria osservata nelle ultime 48 ore sulle coordinate reali di ciascun comune.
- **Simulatore What-If sulle politiche locali**: esplorazione parametrica di scenari ipotetici su orizzonte 1, 3 o 5 anni a partire dai punteggi ufficiali reali del comune.
- **Percezione civica**: confronto tra performance statistiche ufficiali e valutazioni raccolte dai cittadini (nessun voto pre-caricato o simulato).
- **Esportazione**: download della scheda di confronto in **CSV** o stampa/salvataggio in **PDF** impaginato.

---

## Fonti dati, granularità e licenze

Ogni indicatore mostrato nell'interfaccia dichiara la fonte primaria, l'anno di riferimento e il livello geografico esatto:

| Fonte | Livello geografico | Copertura temporale | Aggiornamento | Note e attribuzione |
| --- | --- | --- | --- | --- |
| **Anagrafica ISTAT / comuni-italiani** | Comunale (7.896 comuni) | Corrente | Annuale | Codice ISTAT, popolazione, superficie, coordinate WGS84, provincia, regione. |
| **MEF — Dipartimento delle Finanze** | Comunale | 2020–2024 | Annuale (in base alle pubblicazioni MEF) | 8 serie comunali reali da dichiarazioni IRPEF (reddito imponibile medio, imposta netta, addizionale comunale, contribuenti, lavoro dipendente, pensioni, fasce ≤15k e >55k). |
| **Il Sole 24 Ore — Qualità della Vita (QDV)** | Provinciale (107 province) | 2020–2025 | Annuale | 24 indicatori correnti + 18 serie longitudinali 2020–2025 provenienti da ISTAT, Prometeia, Banca d'Italia, ISPRA, Legambiente, Infocamere, Terna, SIAE, ACI, Ministero dell'Interno. |
| **Open-Meteo Air Quality & Forecast** | Comunale (coordinate WGS84) | Tempo reale + 48h | Live (cache 5 min) | EAQI, PM2.5, PM10, NO₂, temperatura, vento. Gratuito per uso non commerciale con attribuzione ([Open-Meteo](https://open-meteo.com/)). |

> **Nota sulle licenze:** Il codice sorgente di questa applicazione è rilasciato sotto licenza **MIT** (`LICENSE`). I dati statistici pubblici e le rilevazioni ambientali restano soggetti ai rispettivi termini e attribuzioni delle fonti originali. In caso di riutilizzo commerciale del dataset aggregato, verificare le condizioni d'uso delle singole fonti di terze parti.

---

## Nota metodologica

1. **Normalizzazione sui 5 pilastri (0–100)**: gli indicatori eterogenei sono normalizzati tra il 2° e il 98° percentile nazionale (su scala 15–95) per ridurre la distorsione dovuta a valori anomali estremi. Gli indicatori negativi (es. *indice di criminalità*, *disuguaglianza Q5/Q1*, *quota fascia ≤15.000 €*) sono invertiti automaticamente.
2. **Distinzione Comunale vs Provinciale**: mentre i dati anagrafici ISTAT, i redditi MEF e la telemetria Open-Meteo sono specifici di ciascun comune, i restanti indicatori socio-economici e ambientali derivano dal livello provinciale (pertanto comuni della stessa provincia condividono quei valori provinciali).
3. **Simulatore What-If**: i valori di partenza sono i dati ufficiali reali; le proiezioni future applicano coefficienti parametrici esplorativi per visualizzare trade-off tra leve amministrative e non costituiscono previsioni econometriche.
4. **Persistenza dei voti di percezione**: nell'impostazione predefinita i voti vengono salvati in `data/real-perception-votes.json` (ignorato da Git). Per un deploy pubblico su infrastruttura stateless/effimera è consigliabile sostituire lo storage su file con un database persistente (es. PostgreSQL o Firestore).

---

## Avvio locale

### Requisiti
- **Node.js >= 20** (consigliato 22 LTS)
- **Python 3.10+** (solo se si desidera rigenerare il dataset dai sorgenti ufficiali)

### Installazione e avvio
```bash
npm install
npm run dev
```
L'applicazione sarà disponibile su `http://localhost:3000`.

### Build di produzione
```bash
npm run lint
npm run build
npm start
```

### Rigenerazione manuale del dataset ufficiale
Il repository include già uno snapshot pre-aggregato (`data/real-italy-dataset.json`) per consentire l'avvio immediato. Per scaricare nuovamente e rielaborare tutti i CSV/JSON ufficiali:
```bash
npm run fetch-data
```

---

## Automazione GitHub Actions

- **`.github/workflows/ci.yml`**: verifica automaticamente `npm run lint` e `npm run build` ad ogni push e Pull Request su `main`.
- **`.github/workflows/update-data.yml`**: workflow pianificato mensilmente (e avviabile manualmente tramite *Run workflow*) che riesegue `scripts/fetch_real_data.py`, verifica build e TypeScript e apre una Pull Request solo se rileva nuovi dati ufficiali.

---

## Stack tecnico

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, grafici SVG nativi ad alta precisione (`tabular-nums`).
- **Backend**: Express + Vite middleware (dev) / static serving (prod), cache in-memory per chiamate Open-Meteo e rate-limiting leggero sulle valutazioni civiche.
- **Pipeline dati**: Python standard library (`urllib`, `csv`, `zipfile`, `json`) senza dipendenze esterne.
