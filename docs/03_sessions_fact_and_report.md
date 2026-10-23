# 03: Sessions fact table and reporting table

Files: `definitions/marts/fct_sessions.sqlx`, `definitions/marts/rpt_channel_daily.sqlx`

## fct_sessions: grain = one row per session
A **session** = one visit. GA4 raw data has no session table, only events tagged with a session id. We build it with `GROUP BY session_key`.
Kimball-wise: a fact at **session grain**, like Walker's player-session fact.

| Column | How it's derived | Why |
|---|---|---|
| session_source / medium | First non-null source in the session (`ARRAY_AGG ... ORDER BY event_ts LIMIT 1`) | Session attribution. GA4's UI does this its own way, so numbers differ slightly |
| channel_group | `ga4.channelGroup()`: Direct, Organic Search, Paid Search, ... | Business-friendly grouping |
| landing_page | First page_view URL | Common marketing question |
| is_engaged | > 10s engagement OR 2+ page views OR a purchase | GA4's official "engaged session" definition |
| reached_view_item ... reached_purchase | Did the session hit each funnel step? | Funnel drop-off analysis |
| revenue_usd | Sum of purchase revenue | Channel ROI |

**Sessions that cross midnight:** we read 1 extra day of events so those sessions are complete. That's a documented trade-off, and good to mention in an interview.

## rpt_channel_daily: grain = one row per day per channel
This is the table **Looker Studio** connects to. Every metric is defined here once: sessions, engagement rate, conversion rate, funnel counts and revenue.
**Why:** if every dashboard calculates "conversion rate" itself, the numbers stop matching. One reporting table = one definition = consistent numbers. This is what the JD calls the **semantic layer**.
Power BI equivalent: the semantic model / shared dataset.

## Why GA4 UI numbers ≠ these numbers (they WILL ask)
- The GA4 UI applies **modelling** (Consent Mode fills gaps for users who declined cookies), **thresholding** (hides small numbers) and **estimated counts** (HyperLogLog for users and sessions).
- The UI uses **data-driven attribution**. Ours is rule-based (first source in the session).
- The export is **raw**. So small differences are expected, and you explain them rather than "fix" them.

Crown parallel: Cognos vs SkiData parking revenue, i.e. two systems with different rules.

## Interview line
> "From the event table I built a session-grain fact with session source, landing page, GA4's engaged-session rule and funnel flags. On top of it sits a daily channel reporting table where metrics are defined once, so Looker Studio numbers always agree."
