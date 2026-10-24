# 04: Data quality (assertions)

**An assertion is a query that looks for BAD rows. 0 rows returned = pass. Any rows = fail.**
Informatica: a validation session after the load that fails the workflow.

## Built-in assertions (inside each table's config)
| Table | Check | Catches |
|---|---|---|
| stg_ga4__events | `nonNull` on date, timestamp, event name, user id | Broken export / schema change |
| fct_sessions | `uniqueKey: session_key` | Duplicate sessions (bad join or double load) |
| fct_sessions | `revenue_usd >= 0`, end ≥ start | Bad data / logic bugs |
| rpt_channel_daily | `uniqueKey: date + channel` | Grain broken |
| rpt_channel_daily | engaged ≤ sessions, purchase sessions ≤ sessions | Logic bugs (funnel steps are NOT strictly nested per session in GA4: checkout can be in an earlier session) |

## Custom assertion
`definitions/assertions/assert_revenue_reconciles.sqlx`: total revenue in `fct_sessions` must equal the raw purchase events in staging.
This is a **reconciliation**, the same idea as my Crown migration sign-off (row and column checks against the archive).

## How they run
Dataform runs the assertions after the tables are built. Each one becomes a view in the `ga4_assertions` dataset, so you can open it and see exactly which rows failed.

## What I'd add in a real client project
- **Freshness**: fail if the latest `event_date` is older than 2 days (the GA4 export stopped)
- **Volume**: alert if today's events are less than 50% of the 7-day average (tagging broke on the site)
- Both catch problems **before a client sees a broken dashboard**, which the JD asks for directly.

## Interview line
> "Every table has assertions: not-null, unique grain and row rules, plus a reconciliation from fact back to staging. They run in the same scheduled workflow, so a failure is caught before it reaches a dashboard."
