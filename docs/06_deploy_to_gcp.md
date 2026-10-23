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
| 2 | Enable APIs | GCP console | ✅ done |
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
| GCP project **number** | `247830772883` (Dashboard → Project info; all digits) |
| Dataform service agent | `service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com` (Google's built-in Dataform account, named from the project **number**) |
| BigQuery location | US (must match the public GA4 sample) |

## ⚠️ Project NAME vs project ID

Every GCP project has two identifiers:
- **Name**: a friendly label, e.g. "My First Project". It can be changed, and it isn't unique.
- **ID**: a permanent, globally unique ID, e.g. `project-9b7e0325-e559-4c1c-a53`.

**Code and tools always need the ID**: `workflow_settings.yaml` (`defaultProject`), table names (`project-id.dataset.table`), service account emails, the CLI.

Where to find it: click the **project dropdown** at the top of the console. The list shows **Name** and **ID** columns. It's also on the Dashboard under "Project info".

Informatica-ish: the name is like a connection's description; the ID is the actual connect string.

## Step 1: push to GitHub ✅

**What / why:** GitHub stores the code and its history. Dataform will read the code from here, so GitHub is the single source of truth. *Informatica: the repository you check objects into.*

### 1a. Create an empty repo on GitHub
1. Go to **github.com** and sign in.
2. Top right, click **+** → **New repository**.
3. **Repository name:** `DataformProject`
4. Select **Public**. It holds only public sample data, so it's safe to share with employers.
5. **Leave unticked:** "Add a README file", "Add .gitignore", "Choose a license". The repo must be **empty**, otherwise the first push is rejected.
6. Click **Create repository**.
7. ✅ You should see a page saying "Quick setup" with the repo URL `https://github.com/mounika-siripurapu/DataformProject.git`.

### 1b. Open the project in VS Code
1. VS Code → **File → Open Folder** → `C:\Users\mouni\ga4-marketing-dataform` → **Select Folder**.
2. Open `workflow_settings.yaml`. Line 2 `defaultProject:` must be the **project ID** (see above), then **Ctrl+S**.

### 1c. Commit and push
Open the terminal: **Ctrl+`** (the key under Esc), or **Terminal → New Terminal**. Type each line and press Enter:

```bash
git add .
git status
git commit -m "Initial GA4 marketing Dataform project"
git remote add origin https://github.com/mounika-siripurapu/DataformProject.git
git push -u origin main
```

| Command | What it does | What you should see |
|---|---|---|
| `git add .` | Picks all changed files for the next save | Nothing, or "LF will be replaced by CRLF" warnings (harmless line-ending note) |
| `git status` | Shows what's picked | Files listed in **green** under "Changes to be committed" |
| `git commit -m "..."` | Saves a version on the laptop, with a message | A short code like `b337c8e` and the number of files changed |
| `git remote add origin <url>` | Links the folder to GitHub (only once per project) | Nothing |
| `git push -u origin main` | Uploads the saved versions | `* [new branch] main -> main` |

On the first push, a browser window **may** ask you to sign in to GitHub. Sign in and click **Authorize**. Git then remembers you on this laptop.

### 1d. Check
Refresh the GitHub page. ✅ You see `definitions/`, `docs/`, `includes/`, `workflow_settings.yaml`.

### Errors you may hit
| Error | Meaning | Fix |
|---|---|---|
| `remote origin already exists` | You ran `git remote add` twice | Ignore it, the link already exists |
| `rejected ... fetch first` | The GitHub repo isn't empty (e.g. a README was added) | `git pull origin main --allow-unrelated-histories`, then push again |
| `push declined due to email privacy restrictions` | GitHub hides your email, and your commits use it | GitHub → Settings → Emails → copy the `...@users.noreply.github.com` address → `git config --global user.email "<that address>"` → `git commit --amend --reset-author --no-edit` → push |

### Daily loop from now on
Edit in VS Code → `git add .` → `git commit -m "what I changed"` → `git push`

---

## Step 2: enable APIs ✅

**What / why:** an **API** is a Google service. Each one must be switched on in a project before the project can use it. Brand-new projects have most of them off.

1. Go to **console.cloud.google.com** and check the project dropdown at the top shows **My First Project**.
2. Click the **search bar** at the top, type `BigQuery API`, and click the result under **Marketplace / APIs**.
3. Click **Enable**. If the button says **Manage**, it's already enabled.
4. Repeat for **Dataform API** and **Secret Manager API**.
5. ✅ Check: left menu **APIs & Services → Enabled APIs & services**. All 3 should be in the list.

| API | Why we need it |
|---|---|
| BigQuery API | Run queries and create tables |
| Dataform API | Create the Dataform repository, compile and run |
| Secret Manager API | Store the GitHub token safely (Step 4) |

---

## Step 3: service account + roles

**What / why:** a **service account** is a **robot user**. Dataform runs the SQL as this robot, not as me. So:
- scheduled runs keep working when I'm logged out
- the robot gets **only** the permissions it needs (least privilege)

*Informatica: the Integration Service running sessions under a service login instead of a personal login.*

Two accounts are involved:
| Account | Who made it | Role in this setup |
|---|---|---|
| `dataform-runner@project-9b7e0325-e559-4c1c-a53.iam.gserviceaccount.com` | **Me** (custom service account) | The robot that **runs the SQL** in BigQuery |
| `service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com` | **Google** (Dataform service agent) | Dataform's own system account. It needs permission to **act as** my robot |

### 3a. Create the robot
1. Console search bar → type `Service Accounts` → click **Service Accounts** (IAM & Admin).
2. Click **+ Create service account** at the top.
3. **Step 1 "Service account details":**
   - Service account name: `dataform-runner`
   - Service account ID: fills itself in as `dataform-runner`
   - Description: `Runs Dataform workflows`
   - Click **Create and continue**
4. **Step 2 "Permissions":** click **Select a role**, type the role name in the filter box, and pick it. Then **+ Add another role** for the next one:
   - `BigQuery Data Editor`: create, replace and write tables
   - `BigQuery Data Viewer`: read tables
   - `BigQuery Job User`: run queries (every query is a "job")
   - Click **Continue**
5. **Step 3 "Principals with access":** skip it, click **Done**.
6. ✅ The list now shows `dataform-runner@project-9b7e0325-e559-4c1c-a53.iam.gserviceaccount.com`.

### 3b. Let Dataform act as the robot
1. In the Service Accounts list, click the email **dataform-runner@...**
2. Open the **Principals with access** tab → click **Grant access**.
3. **New principals:** `service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com`
4. **Select a role** → `Service Account User`
5. **+ Add another role** → `Service Account Token Creator`
6. Click **Save**.
7. ✅ The tab now lists the `gcp-sa-dataform` account with both roles.

| Role | Why |
|---|---|
| Service Account User | Lets Dataform **run things as** dataform-runner |
| Service Account Token Creator | Lets Dataform **get a login token** for dataform-runner |

### 3c. Check everything (optional)
Console → **IAM & Admin → IAM**:
- `dataform-runner` shows the 3 BigQuery roles.
- Tick **Include Google-provided role grants** (top right) to also see the `gcp-sa-dataform` service agent.

### Errors you may hit
| Error | Meaning | Fix |
|---|---|---|
| In 3b: "Email addresses and domains must be associated with an active Google Account" | The Dataform service agent doesn't exist yet. Google only creates it when Dataform is first used | Open **Cloud Shell** (the `>_` icon at the top right) and run: `gcloud beta services identity create --service=dataform.googleapis.com --project=project-9b7e0325-e559-4c1c-a53`. Then repeat 3b |
| A role isn't in the list | Typo in the filter, or the API isn't enabled | Check Step 2, then type part of the name, e.g. `Job User` |

**Source:** the official Dataform quickstart (docs.cloud.google.com/dataform/docs/quickstart-create-workflow) uses this exact setup: a custom service account with the BigQuery roles, plus the Dataform service agent granted Service Account User and Token Creator.
