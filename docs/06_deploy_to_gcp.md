# 06: Deploy to GCP (production setup)

How the code gets from my laptop to running tables in BigQuery:

```
VS Code (laptop)  ->  git push  ->  GitHub  ->  Dataform (GCP)  ->  BigQuery
  write SQLX                       stores code   pulls, compiles,     tables built
                                                 runs on a schedule
```

| # | Step | Where | Status |
|---|---|---|---|
| 1 | Push project to GitHub | VS Code + GitHub | ✅ done |
| 2 | Enable APIs | GCP console | ⏳ |
| 3 | Service account + roles | GCP IAM | ⏳ |
| 4 | GitHub token into Secret Manager | GitHub + GCP | ⏳ |
| 5 | Dataform repository connected to GitHub | GCP Dataform | ⏳ |
| 6 | Workspace, pull, first run | GCP Dataform | ⏳ |
| 7 | Release + workflow configuration (daily schedule) | GCP Dataform | ⏳ |

## My details

| Item | Value |
|---|---|
| GitHub repo | https://github.com/mounika-siripurapu/DataformProject |
| GCP project **name** | My First Project |
| GCP project **ID** | `project-9b7e0325-e559-4c1c-a53` |
| BigQuery location | US (must match the public GA4 sample) |

## ⚠️ Project NAME vs project ID

Every GCP project has two identifiers:
- **Name**: a friendly label, e.g. "My First Project". It can be changed, and it isn't unique.
- **ID**: a permanent, globally unique ID, e.g. `project-9b7e0325-e559-4c1c-a53`.

**Code and tools always need the ID**: `workflow_settings.yaml` (`defaultProject`), table names (`project-id.dataset.table`), service account emails, the CLI.

Where to find it: click the **project dropdown** at the top of the console. The list shows **Name** and **ID** columns. It's also on the Dashboard under "Project info".

Informatica-ish: the name is like a connection's description; the ID is the actual connect string.

## Step 1: push to GitHub ✅

```bash
git add .                         # pick changed files
git status                        # check what's picked
git commit -m "message"           # save a version on the laptop
git remote add origin <repo-url>  # link to GitHub (once)
git push -u origin main           # upload
```

Daily loop afterwards: edit → `git add .` → `git commit -m "..."` → `git push`.

## Step 2: enable APIs

Console → search bar → open each → **Enable**:
- BigQuery API
- Dataform API
- Secret Manager API

(An API is a Google service. It must be switched on in a project before that project can use it.)
