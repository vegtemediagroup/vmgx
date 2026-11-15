# Publishing VMGX: step by step

Do the parts in this order. Each part says what it's for and how long it takes. You can stop after any part and continue another day.

**Before you start: privacy.** Everything you publish here is public and permanent. Use "Vegte Media Group" and the `vmgx` username, never your own name, and use a Vegte Media Group email address wherever an email is shown publicly.

---

## Part 0: Get ready (10 minutes, once)

**0.1 Put the folder in a good place.** Unzip `vmgx-repository.zip`. Move the folder it creates into your **Documents** folder and rename it to `vmgx`.

**0.2 Learn the two Terminal moves you need.**
- **Open Terminal:** press ⌘ Space, type `Terminal`, press Return.
- **Go to the vmgx folder:** type `cd` followed by a space (don't press Return yet), drag the `vmgx` folder from Finder into the Terminal window, then press Return.

Every command in this guide is typed (or pasted) into Terminal, followed by Return. When Terminal asks for a password or token, **nothing appears while you type or paste. That's normal**; just press Return.

---

## Part 1: Upload the code to Codeberg (15 minutes)

*What it's for:* a public home for the code, where people can read it and report problems.

**1.1 Make an access token.** This is a password just for uploading.
1. On codeberg.org, click your avatar (top right) → **Settings** → **Applications**.
2. Under **Manage access tokens**, give it the name `vmgx-upload`.
3. Under **Select permissions**, set **repository** to **Read and write**.
4. Click **Generate token**. Copy the token right away and keep it in a note for a moment. Codeberg shows it only once.

**1.2 Upload.** In Terminal, go to the vmgx folder (step 0.2). Then paste these lines one at a time, pressing Return after each:

```
git init -b main
git config user.name "Vegte Media Group"
git config user.email "vmgx@noreply.codeberg.org"
git add .
git commit -m "VMGX 1.0.1"
git remote add origin https://codeberg.org/vmgx/vmgx.git
git push -u origin main
```

At the last line, Terminal asks:
- **Username:** type `vmgx` and press Return.
- **Password:** paste the token from step 1.1 and press Return.

**1.3 Check it worked.** Open <https://codeberg.org/vmgx/vmgx>. You should see the folders (`js`, `python`, `spec` and others) and the README.

**If the last line says "rejected" or "fetch first":** Codeberg created a starter file when you made the repository. Your folder has everything, so replace it:

```
git push -u origin main --force
```

---

## Part 2: Publish to npm (15 minutes)

*What it's for:* JavaScript developers can install VMGX with `npm install vmgx`.

**2.1 Install Node.js** (skip if you already have it). In Terminal, type `node --version`. If you see a version number like `v22…`, skip to 2.2. If you see "command not found", go to <https://nodejs.org>, download the **LTS** version for macOS, open the downloaded file and click through the installer. Then close Terminal, open it again, and check `node --version` once more.

**2.2 Turn on two-step login on npm** (recommended). On npmjs.com, click your avatar → **Account** → **Two-Factor Authentication**, and follow the steps. Touch ID works.

**2.3 Publish.** In Terminal, go to the vmgx folder (step 0.2), then:

```
cd js
npm login
```

Press Return when asked; your browser opens. Sign in to npm, then come back to Terminal. It says "Logged in". Then:

```
npm publish
cd ..
```

If asked, confirm with your second step (Touch ID, or a code).

**2.4 Check it worked.** Open <https://www.npmjs.com/package/vmgx>.

---

## Part 3: Create a PyPI account and publish (25 minutes)

*What it's for:* Python developers can install VMGX with `pip install vmgx`.

**3.1 Create the account.**
1. Go to <https://pypi.org/account/register/>. Username: `vmgx` (or `vegtemediagroup` if taken). Use a Vegte Media Group email if you have one.
2. Open the confirmation email and click the link.

**3.2 Turn on two-step login** (PyPI requires it before you can publish).
1. On pypi.org, click your username (top right) → **Account settings**.
2. Under **Two factor authentication (2FA)**, PyPI first asks you to **generate recovery codes**. Do it, and save them somewhere safe (for example, in the Passwords app or printed). You'll need them if you lose your phone.
3. Then add a method. The easiest: **Add 2FA with security device** and use Touch ID, or **Add 2FA with authentication application** and scan the QR code with an authenticator app.

**3.3 Make an API token.** This is a password just for uploading.
1. **Account settings** → **API tokens** → **Add API token**.
2. Name: `vmgx-upload`. Scope: **Entire account (all projects)**. (This is needed only the first time, because the `vmgx` project doesn't exist yet.)
3. Click **Create token** and copy it. It starts with `pypi-`. PyPI shows it only once.

**3.4 Publish.** In Terminal, go to the vmgx folder (step 0.2), then paste one line at a time:

```
cd python
python3 -m pip install --user --upgrade build twine
python3 -m build
python3 -m twine upload dist/*
```

At the last line:
- If it asks for a **username**, type `__token__` (two underscores before and after) and press Return.
- When it asks for a **password** or **API token**, paste the token from 3.3 and press Return.

Then go back to the main folder:

```
cd ..
```

**3.5 Check it worked.** Open <https://pypi.org/project/vmgx/>.

**3.6 Swap the token for a safer one.** On PyPI: **Account settings** → **API tokens** → remove `vmgx-upload`. Then add a new token, choosing scope **Project: vmgx**, and keep it in your password manager for future releases.

---

## Part 4: Upload the new website (5 minutes)

Upload the contents of `vmgx-website.zip` to your File Manager, next to `favicon.png` and `logo.png`, replacing the old files. It now has 9 files, including `spec.html`.

Check that <https://vmgx.vegte.org/spec.html> opens. Parts 5 and 6 need this page to be online.

---

## Part 5: Register the media type with IANA (30 minutes, then a few weeks of waiting)

*What it's for:* `application/vnd.vmg.vmgx` becomes the official internet name for VMGX files, so browsers and servers recognize them.

**5.1 Make a contact email address.** The email you give becomes public in IANA's registry. In your hosting control panel (where your File Manager is), create an email address or forwarder such as `vmgx@vegte.org` that forwards to your normal inbox.

**5.2 Fill in the form.**
1. Open `registrations/iana-media-type.md` from the vmgx folder (double-click it, or right-click → Open With → TextEdit).
2. Open <https://www.iana.org/form/media-types>.
3. Copy each answer from the file into the matching field on the form. For the contact, enter "VMGX Maintainers" and the address from 5.1.
4. Submit.

**5.3 What happens next.** IANA sends you a confirmation email with a ticket number. A media types expert reviews the request, which can take a few weeks. They may email you questions. If they do, forward the question to Claude and I'll help you answer.

---

## Part 6: Submit to PRONOM (20 minutes)

*What it's for:* archives worldwide use PRONOM to recognize file formats. An entry gives VMGX an official identifier.

**Best timing:** after Parts 2 and 3, and once you use VMGX for some real records yourself. PRONOM prioritizes formats that are in use, so a submission with some real use behind it is more likely to be accepted soon. Submitting earlier is allowed; just describe current use honestly.

1. Open `registrations/pronom-submission.md` from the vmgx folder.
2. Open the PRONOM request form at <https://www.nationalarchives.gov.uk/contact-us/submit-information-for-pronom/pronom-request-form/> and choose **New entry**.
3. Copy the answers from the file into the form.
4. Attach `registrations/vmgx-pronom-samples.zip`.
5. Your contact details are only used for questions. They are not published.

---

## Part 7: Wikidata (later, not now)

Wikidata only accepts items described by serious, independent sources, and an entry made by VMGX's own creator now would likely be deleted. Wait until PRONOM or IANA has registered VMGX. Then use `registrations/wikidata-draft.md`, and ask Claude to walk you through it.

---

## Part 8: The Mac app for other people (later)

When you join the Apple Developer Program, see "Releasing for other Macs" in `mac/VMGX/README.md`.

---

## About your GitHub account

You don't need GitHub for any of these steps; the code lives on Codeberg. Later, you can add a copy ("mirror") of the Codeberg repository on GitHub, where more developers look.

---

## Releasing a new version later

1. Change `js/vmgx.js` and `python/vmgx.py` (and the spec, if the rules change).
2. In Terminal, in the vmgx folder: `bash tools/sync.sh`. It copies the files everywhere and runs every test.
3. Raise the version number in `js/package.json`, `python/pyproject.toml`, `vscode/package.json` and `CHANGELOG.md`.
4. Upload to Codeberg: `git add .`, then `git commit -m "VMGX 1.0.2"` (with the new number), then `git push`.
5. Publish again: Part 2.3 (from `cd js`) and Part 3.4 (from `cd python`). Before `python3 -m build`, delete the old `python/dist` folder.
6. `bash tools/package-site.sh`, then upload the new `dist/vmgx-website.zip`.
