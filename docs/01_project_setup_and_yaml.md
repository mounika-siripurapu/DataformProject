# 01: Project setup, YAML and folder layers

## What we built
- `workflow_settings.yaml`: project-wide settings
- Folders by layer: `definitions/sources`, `staging`, `marts`, `assertions`
- `includes/ga4.js`: reusable SQL snippets

## YAML in 5 minutes

YAML is just a **settings file written as `name: value` lines**. It's like an Informatica **parameter file**, only neater. It has three rules:

```yaml
defaultLocation: US          # 1. name: value
vars:                        # 2. a heading with nothing after the colon = a group
  start_date: "2020-11-01"   #    indented lines belong to that group (use SPACES, never tabs)
  lookback_days: "3"
# 3. anything after # is a comment
```

The only thing that breaks YAML is **wrong indentation**. Lines in the same group must start at exactly the same column.

## What each setting means

| Setting | Meaning | Informatica-ish |
|---|---|---|
| `defaultProject` | GCP project where tables are created | Target database connection |
| `defaultLocation: US` | Data region. Must match the source data's region (the public GA4 data is in US) | n/a |
| `defaultDataset` | Dataset (= schema) used if a file doesn't say one | Default target schema |
| `defaultAssertionDataset` | Where data quality check views go | n/a |
| `dataformCoreVersion` | Dataform version, pinned so builds are repeatable | PowerCenter version |
| `vars:` | Values any file can read as `dataform.projectConfig.vars.start_date` | `$$parameters` in a parameter file |

## Why layers (staging → marts)
- **sources**: tell Dataform what raw tables exist (we don't build them)
- **staging**: clean, rename and unpack. 1 row = 1 source row. No business logic.
- **marts**: business-ready facts and reports at a clear grain

This is the same idea as Crown's Access → Staging → Store, or Bronze/Silver/Gold in Fabric.

## Why `includes/ga4.js`
GA4 hides most fields inside a list called `event_params`, and unpacking each one is a long snippet. We wrote it **once** as `ga4.eventParam("page_location")` and reuse it everywhere. That's a mapplet. It also holds the shared "reload the last 3 days" logic, so every incremental table behaves the same.

## Interview line
> "I keep project settings and variables in `workflow_settings.yaml`, layer the models into staging and marts, and put repeated GA4 logic like unnesting event params into JavaScript includes, so it's written once and tested once."
