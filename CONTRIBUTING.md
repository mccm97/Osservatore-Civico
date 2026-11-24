# Contribuire a Osservatorio Civico Italia

Grazie per l'interesse nel migliorare questo progetto di civic tech basato esclusivamente su open data ufficiali italiani.

## Linee guida sui dati

- **Solo fonti reali e verificabili**: non introdurre dati sintetici, simulati o placeholder. Ogni nuovo indicatore deve includere fonte primaria, anno di riferimento e granularità esatta (`Comunale` o `Provinciale`).
- **Priorità alle fonti 100% comunali**: eventuali contributi ad alto impatto riguardano l'integrazione di dataset comunali pubblici come:
  - **OpenBDAP / OpenBilanci** (spesa corrente, investimenti, capacità di riscossione e debito del singolo comune)
  - **ISPRA Catasto Rifiuti** (percentuale di raccolta differenziata e produzione rifiuti pro capite per singolo comune)
  - **Agenzia delle Entrate — OMI** (valori immobiliari medi per comune)
  - **ISTAT Demografia** (indice di vecchiaia, saldo migratorio e popolazione per fascia d'età a livello comunale)

## Flusso di sviluppo

1. Crea un branch a partire da `main`.
2. Se modifichi la pipeline dati in `scripts/fetch_real_data.py`, verifica l'esecuzione completa con:
   ```bash
   npm run fetch-data
   ```
3. Verifica sempre tipizzazione e build prima di aprire una Pull Request:
   ```bash
   npm run lint
   npm run build
   ```
