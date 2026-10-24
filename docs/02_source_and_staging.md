# 02: Source declaration and the staging table

Files: `definitions/sources/ga4_events.sqlx`, `definitions/staging/stg_ga4__events.sqlx`

## The raw GA4 export: what it looks like
- **One table per day:** `events_20210101`, `events_20210102`, ... Live sites also have `events_intraday_*` for today.
- **One row per event:** page_view, add_to_cart, purchase, ...
- **Details are packed into a list** called `event_params`. Each item is `{key, value{string_value, int_value, double_value, float_value}}`.

## Step A: declaration (the source)
`type: "declaration"` with `name: "events_*"` tells Dataform: "these tables exist, I don't build them." The `*` reads **all** the daily tables at once. `_TABLE_SUFFIX` is the `20210101` part, which we filter on.
Informatica: importing a **Source definition**.

## Step B: unpacking event_params (UNNEST)
```sql
(SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS ga_session_id
```
In plain words: "open this row's list of params, find the one called ga_session_id, take its number."
Informatica: like a **Normalizer** or parsing a packed field, but it stays on the same row.

## Step C: incremental with a 3-day lookback
`type: "incremental"` = after the first full load, only new data is processed.

Every run does this (see `pre_operations`):
1. `load_from` = latest date already loaded **minus 3 days**
2. `DELETE` the table rows from `load_from` onwards
3. `INSERT` fresh data from `load_from` onwards

**Why go back 3 days?** Google: Analytics "will update daily tables for up to 2 calendar days, plus today" (Analytics Help, *BigQuery Export*). So a day keeps changing for 3 days, and reloading the last 3 picks up every late event. The run is also **re-runnable (idempotent)**: running it twice gives the same result, never duplicates.
Informatica: incremental load using the last run date, plus deleting the target slice before reloading. It's the same pattern as Crown's slice-replace.

On a **full refresh** (first run, or forced), it starts from `vars.start_date` instead.

## Step D: partitioning and clustering (cost control)
```
partitionBy: "event_date"                     -> table split by day; a query for 1 day reads only that day
clusterBy: ["event_name", "user_pseudo_id"]   -> rows sorted inside each day; filters on these read less
```
This is the same lever as my 57% scan-cost fix at Crown (a filter that blocked partition pruning).

## GA4 gotchas built into this table
| Gotcha | How it's handled |
|---|---|
| `ga_session_id` is unique only per user | `session_key = user_pseudo_id + ga_session_id` |
| `traffic_source` is the user's **first-ever** source, not this session's | Renamed `first_user_source` so nobody misuses it |
| Late-arriving events | 3-day lookback |
| Intraday tables would double count | `_TABLE_SUFFIX NOT LIKE 'intraday%'` |
| Public sample is obfuscated | Values like `<Other>` / `(data deleted)` appear |

## Interview line
> "Staging unnests the event params I need, partitions by event date and clusters by event name. It's incremental with a 3-day lookback because GA4 events arrive late, and it deletes and reloads that window so reruns are idempotent."
