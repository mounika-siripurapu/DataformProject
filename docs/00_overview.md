# GA4 Marketing Data Mart: Overview

**What this is:** a production-style Dataform project that turns the raw Google Analytics 4 (GA4) BigQuery export into trusted, documented tables for marketing reporting. It runs on Google's free public GA4 sample (the Google Merchandise Store online shop, Nov 2020 to Jan 2021).

**Why I built it:** to learn the GA4 export schema hands-on and to show the full analytics-engineering lifecycle: source, model, test, schedule, report.

## The flow (one picture)

```
bigquery-public-data.ga4_obfuscated_sample_ecommerce.events_*      <- raw GA4 export (1 table per day)
        │  declaration (sources/ga4_events.sqlx)
        ▼
ga4_staging.stg_ga4__events      incremental, 1 row per EVENT, event_params unpacked
        ▼
ga4_marts.fct_sessions           incremental, 1 row per SESSION, channel + funnel + revenue
        ▼
ga4_marts.rpt_channel_daily      table, 1 row per DAY per CHANNEL -> Looker Studio
        +
ga4_assertions.*                 data quality checks after every run
```

## Informatica translation

| This project | Informatica |
|---|---|
| `definitions/*.sqlx` file | One mapping + its target |
| `${ref("...")}` | The link between sessions in a workflow (sets the run order) |
| `workflow_settings.yaml` | Parameter file + default connections |
| `includes/ga4.js` | Reusable mapplet |
| assertions | Validation session after the load |
| Release + workflow configuration | Workflow Manager scheduler (see doc 05) |

## Steps and docs

| # | Doc | Status |
|---|---|---|
| 01 | Project setup, YAML and folder layers | ✅ built + compiled |
| 02 | Source declaration + staging (UNNEST, incremental, partitioning) | ✅ built + compiled |
| 03 | Sessions fact + reporting table | ✅ built + compiled |
| 04 | Data quality (assertions) | ✅ built + compiled |
| 05 | Orchestration: how it runs every day | 📖 concept written; set up in GCP next |
| 06 | Deploy to GCP (service account, repository, first run) | ⏳ next |
| 07 | Looker Studio dashboard | ⏳ |
| 08 | AI: anomaly detection + Gemini summary | ⏳ optional |

## How to compile locally (no GCP needed)

```bash
cd C:\Users\mouni\ga4-marketing-dataform
npx @dataform/cli@3.0.0 compile
```
If it prints the list of actions with no errors, every file, `ref()` and config is valid.
