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
| 3 | Service account + roles | GCP IAM | ✅ done (3b via "Grant all") |
| 4 | GitHub token into Secret Manager | GitHub + GCP | ✅ done |
| 5 | Dataform repository connected to GitHub | GCP Dataform | ✅ done (linked over HTTPS, branch main) |
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

**Where:** the Service Accounts page, the same page as 3a.
Direct link: https://console.cloud.google.com/iam-admin/serviceaccounts?project=project-9b7e0325-e559-4c1c-a53
Or click: ☰ menu (top left) → **IAM & Admin** → **Service Accounts**.

```
Service Accounts list
 └─ click dataform-runner@...        <- the robot's own page
     └─ tab "Principals with access"  (older console: "Permissions")
         └─ Grant access -> paste agent email -> 2 roles -> Save
```

**How the agent email is built.** Google names its built-in accounts ("service agents") with a fixed rule:

```
service-<PROJECT NUMBER>@gcp-sa-<SERVICE NAME>.iam.gserviceaccount.com
```

| Part | My value | From |
|---|---|---|
| `service-` | fixed | Google's rule |
| `247830772883` | project **number** | Dashboard → Project info |
| `@gcp-sa-` | fixed ("Google Cloud service agent") | Google's rule |
| `dataform` | the service | Dataform |
| `.iam.gserviceaccount.com` | fixed | all service accounts end like this |

That's why this step needs the project **number**, not the ID. The official Dataform docs give this pattern.
To see it: **IAM & Admin → IAM** → tick **Include Google-provided role grants**. It only appears once it exists (see the error below).

**Steps:**
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
| In 3b: "Email addresses and domains must be associated with an active Google Account, Google Workspace account, or Cloud Identity account." **(I hit this on my new project.)** | The Dataform service agent doesn't exist yet. Google only creates it when Dataform is first used | Create it with Cloud Shell (see below), then repeat 3b |
| A role isn't in the list | Typo in the filter, or the API isn't enabled | Check Step 2, then type part of the name, e.g. `Job User` |

### Easiest fix (what I did): create the Dataform repository first

Creating a Dataform repository makes Google create the service agent **and** offers a **Grant all** button that does 3b in one click.

1. Console search bar → `Dataform` → click **Dataform** (BigQuery).
   Direct link: https://console.cloud.google.com/bigquery/dataform?project=project-9b7e0325-e559-4c1c-a53
2. Click **+ Create repository** and fill in:

| Field | Value | Why |
|---|---|---|
| Repository ID | `ga4-marketing-dataform` | Name of the repo inside Dataform |
| Region | `us-central1 (Iowa)` | US, same as the GA4 sample data |
| Service account | `dataform-runner` | The robot from 3a |
| Encryption settings | leave **"Use the default KMS key for encryption"** ticked ("No default key set") | Google encrypts everything anyway. This is only for companies with their own key (KMS). "No default key set" = Google-managed key, normal and free |

   Note: the form says "New repositories start empty and can be connected to a git provider after being created." There's no actAs option on the current form.
3. Click **Create**.
4. ✅ The screen shows:
   - "Repository created successfully."
   - "Dataform will execute workflows as the service account dataform-runner@project-9b7e0325-e559-4c1c-a53.iam.gserviceaccount.com."
   - A yellow box: "To execute queries in Dataform, you need the following roles: for **service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com**: roles/iam.serviceAccountTokenCreator and roles/iam.serviceAccountUser on dataform-runner@..."
   - This confirms the agent email from the naming rule.
5. Click **Grant all**. That's the same as 3b, done in one click.
6. Click **Go to repositories**.

### Alternative fix: create the Dataform service agent with Cloud Shell

**Cloud Shell** is a free Linux terminal inside the browser, already logged in as me, with `gcloud` (Google Cloud's command-line tool) installed. Nothing to install.

1. Console, top right → click the **`>_` icon** ("Activate Cloud Shell").
2. **First time only:** a screen shows "Provisioning your Cloud Shell machine → Connecting to your Cloud Shell instance → Connecting to your Cloud Shell Editor". This takes **1–3 minutes** while Google creates a small VM for me. Later opens are faster.
3. If it opens the **Cloud Shell Editor** (looks like VS Code), the terminal is the panel at the bottom. If there isn't one: menu **Terminal → New Terminal**.
4. Wait for the prompt: `...@cloudshell:~ (project-9b7e0325-e559-4c1c-a53)$`
5. Type, then press Enter:
   ```
   gcloud beta services identity create --service=dataform.googleapis.com --project=project-9b7e0325-e559-4c1c-a53
   ```
6. Popup **"Authorize Cloud Shell"** → click **Authorize**. If asked to install the beta component → type `Y`.
7. ✅ Expected: `Service identity created: service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com`
8. Repeat **3b**. If it still errors, wait 1 minute (new accounts take a moment to appear) and try again.

| Command part | Meaning |
|---|---|
| `gcloud` | Google Cloud's command-line tool |
| `beta services identity create` | "Create the built-in service account (identity) for a service" |
| `--service=dataform.googleapis.com` | which service: Dataform |
| `--project=...` | which project: the project **ID** |

**Source (Step 3):** the official Dataform quickstart (docs.cloud.google.com/dataform/docs/quickstart-create-workflow) uses this exact setup: a custom service account with the BigQuery roles, plus the Dataform service agent granted Service Account User and Token Creator.

---

## Step 4: GitHub token in Secret Manager

**What / why:** Dataform must read and write the GitHub repo. A **fine-grained token** is a password limited to one repo and one permission. It's kept in **Secret Manager** (Google's password safe), so it never appears in code. *Informatica: an encrypted password in the connection object.*
**Never paste the token into chat, a file or a screenshot.**

Fine-grained vs classic: fine-grained = chosen repos + chosen permissions (least privilege). Classic = every repo I own.

### 4a. Create the token on GitHub
1. github.com → **profile photo** (top right) → **Settings**
2. Left menu, very bottom → **Developer settings**. The breadcrumb shows *Settings / Developer Settings*.
3. **Personal access tokens → Fine-grained tokens**. First time it says "No fine-grained tokens created".
4. **Generate new token** (green). GitHub may ask for my password or 2FA code.
5. Fill in:

| Field | Value | Why |
|---|---|---|
| Token name | `dataform-gcp` | Says what uses it |
| Description | `Dataform in GCP project My First Project reads/writes DataformProject` (optional) | Future me knows what it's for |
| Resource owner | leave `mounika-siripurapu` | Repo is under my account |
| Expiration | **90 days** | Tokens should expire; renew later |
| Repository access | **Only select repositories** → **DataformProject** | Can't touch other repos |
| Permissions | **+ Add permissions** → search **`Contents`** → tick → set **Read and write** | Contents = files. Dataform reads SQLX, writes when committing from a workspace |
| (automatic) | **Metadata: Read-only** | Added by GitHub; required |
| Everything else | leave empty | Least privilege |

6. **Generate token** → copy it (`github_pat_...`) with the copy icon. It's shown **only once**.

**Issue I hit:** searching `Repo` in *Add permissions* lists "GitHub App installation repository access", "Repository creation", "Repository license policy" and "Repository security advisories". **None are needed.** Clear the box, search **`Contents`**, tick it, close the dropdown, then change it from Read-only to **Read and write**.

### 4b. Save it in Secret Manager
1. Console search bar → `Secret Manager` → **+ Create secret**
2. Name `github-dataform-token`; Secret value: paste the token; leave the rest default → **Create secret**

### 4c. Let Dataform read the secret
1. On the secret → **Permissions** tab → **Grant access**
2. New principals `service-247830772883@gcp-sa-dataform.iam.gserviceaccount.com` → role **Secret Manager Secret Accessor** → **Save**

Source: docs.cloud.google.com/dataform/docs/connect-repository. GitHub over HTTPS uses a token in Secret Manager. Fine-grained token: selected repository, "read and write access on contents". The Dataform service agent needs `roles/secretmanager.secretAccessor` on the secret.
