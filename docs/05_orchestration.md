# 05: Orchestration, from zero

## What "orchestration" means
**Orchestration = deciding WHEN things run, in WHAT ORDER, and WHAT HAPPENS IF something fails.**
You already know it: in Informatica it's the **Workflow Manager** (the order of sessions plus links) and the **Scheduler** (run daily at 6am). Nothing more mysterious than that.

It answers 3 questions:
| Question | Informatica | This project |
|---|---|---|
| In what order? | Links between sessions | `${ref()}` builds the order automatically |
| When? | Scheduler | Dataform **workflow configuration** (a cron schedule) |
| Which version of the code? | Deployed folder in the repository | Dataform **release configuration** (compiles from Git `main`) |

## Order: you already did it
Because every file uses `${ref()}`, Dataform knows:
`events_*` → `stg_ga4__events` → `fct_sessions` → `rpt_channel_daily` → assertions.
You never draw these arrows. Dataform reads them from the refs.

## When: Dataform's built-in scheduler (what we'll use)
Two settings in the Dataform UI (no YAML, no extra service):

1. **Release configuration** = "take the code from Git branch `main`, compile it, daily at 05:00"
   (Informatica: deploying the tested folder to production)
2. **Workflow configuration** = "run actions tagged `daily` from that release at 06:00, Australia/Sydney"
   (Informatica: the scheduler on the workflow)

The schedule format is **cron**: `0 6 * * *` = minute 0, hour 6, every day, every month, every weekday.

**Failures:** the run shows as failed in Dataform's execution logs. Downstream tables don't run if an upstream table fails. Alerts can be added through Cloud Monitoring / log-based alerts.

## Other orchestrators (know what they are; you don't need to build them)
| Tool | When teams use it | Informatica-ish |
|---|---|---|
| **Dataform schedule** | Everything is SQL in BigQuery. Simplest. | Built-in scheduler |
| **Cloud Workflows** (a YAML file of steps) | Chain Dataform with other steps, e.g. "check source arrived, then run Dataform". This is what Crown uses (`workflows/orchestrator/*.yaml`) | A workflow with decision / command tasks |
| **Cloud Composer (Airflow)** (Python DAG files) | Many systems and APIs: pull Meta Ads API → load → run Dataform → refresh dashboard | Enterprise scheduler across many tools (like Control-M / Autosys) |
| **Cloud Functions / Cloud Run** | Small pieces of code, e.g. call an ads API and land the data | A command task running a script |

Monks' JD lists Composer, Cloud Functions and Cloud Run because client work pulls in **ad platform APIs** (Meta, Google Ads), not just GA4.

## Interview answer (the honest, strong version)
> "For pure BigQuery transforms I'd use Dataform's release and workflow configurations: compile from main, then run the daily tag on a cron. The dependency order comes from the refs. When the pipeline has to wait for or call other systems, like an ads API extract, I'd put an orchestrator in front, such as Cloud Workflows or Composer, which triggers Dataform as one step. At Crown our daily loads ran through Cloud Workflows with failure monitoring. That was on the support and fix side, and Dataform's own scheduling is what I've set up end to end."

(Adjust the last sentence to what you actually did. Only claim what you can explain.)
