# Commercial Bank Challenge — GitHub Pages + Firebase

This repository contains the PUBLIC web pages for the three-team classroom game.
**It does NOT include the instructor's private outcome JSON. Never upload the private outcome file to GitHub, even into a private repo that you may later make public.**

## Requirements

- GitHub account for GitHub Pages hosting (the public website).
- Google/Firebase project for live shared state, student anonymous sign-in, instructor email/password sign-in, and protected outcome records.
- The instructor's private `Commercial_Bank_Instructor_Secret_Outcomes.json` delivered **separately** alongside this ZIP.

A GitHub repository on its own cannot collect synchronized real-time decisions from students or keep outcomes private. Firebase handles those tasks. No command line is necessary if you deploy the Firestore rules with the Firebase Console.

## A. Set up Firebase (do this before students join)

1. Open https://console.firebase.google.com/ and create a Firebase project.
2. In **Build > Authentication > Sign-in method**, enable **Email/Password** and **Anonymous**.
3. In **Authentication > Users**, create an instructor email/password login and copy its **UID**.
4. In **Build > Firestore Database**, create a Cloud Firestore database in **production mode**.
5. Create a Firestore collection `admins`, and a document whose ID is the instructor's exact UID. Add a string field `role` with value `instructor`.
6. In **Firestore Database > Rules**, replace the current rules with the entire contents of this repo's `firestore.rules`, and press **Publish**. Keep restrictive rules; do NOT use allow-read/write-to-everyone rules.
7. In **Project settings > General**, add a **Web app**, copy its Firebase configuration object into `config.js`, replacing all `PASTE_...` values. This web app config is designed to be public; it is not your instructor password. Do not paste service-account secrets or any credentials here.
8. In **Authentication > Settings > Authorized domains**, if required, add the host `<your-github-username>.github.io` (no protocol or path). Firebase Auth needs the site's domain authorized.

## B. Publish on GitHub Pages

1. On https://github.com/new, create a new public repository named `commercial-bank-game` (any name works). Choose a public repository on GitHub Free to use Pages.
2. In the GitHub repo, choose **Add file > Upload files**. Upload the **CONTENTS** of the GitHub-ready ZIP at the repository ROOT: `index.html`, `admin.html`, all JS/CSS assets, `config.js`, `.nojekyll`, `firestore.rules`, and `README.md`. GitHub's browser uploader may hide the optional `.nojekyll` dotfile; the site typically works without it for these files.
3. Commit the upload. In **Settings > Pages > Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/(root)`, then **Save**.
4. After Pages publishes, the URLs will have the form:
   - Student URL: `https://YOUR-USERNAME.github.io/commercial-bank-game/`
   - Instructor URL: `https://YOUR-USERNAME.github.io/commercial-bank-game/admin.html`
   (Replace username and repo name with your actual values.)

## C. Run a game

1. Open the instructor URL, sign in with the Firebase instructor account.
2. Use the instructor-only file chooser to select `Commercial_Bank_Instructor_Secret_Outcomes.json` from your local computer. **Do not commit it to GitHub.**
3. Click **Initialize / reset game**. This creates random one-time join codes for G1, G2, G3 and uploads the confidential outcome data to Firestore under the deployed security rules.
4. Give each group leader the common student URL and only their own team's private code.
5. Observe the G1/G2/G3 decision matrix and wait for all three submissions. Groups approve at least three loans and cannot exceed $1,000B committed.
6. Click **Lock decisions & start reveal**, then **Reveal next corporation** for seven corporations.
7. Click **Return to banks · Calculate P&L** for a detailed side-by-side scorecard, ending cash, and the winner. Export CSV or print if desired.

## Notes / limitations

- **GitHub Pages is public.** The public repo contains the borrower names, loan offers, logic, and Firebase client config; it intentionally contains **no secret outcomes**. Students may still look up the real historical company events online, since those events are public knowledge.
- Only the instructor's Firestore-authorized login can initialize/reveal outcomes. The default/recovery outcome data is stored in Firestore and can be read by students only as the instructor reveals it. Do not share your instructor password or project administrator credentials.
- A private company outcome hidden on a local computer is protected from the GitHub repository, but cannot be kept secret if the instructor shares it or reveals it publicly.
- Game amounts, interest periods, rates, LTV, DSCR, recoveries, and resulting profit/loss are **illustrative classroom assumptions**; the basic historical property-level default/refinancing/repayment events are based on real-world cases.
- Different outcome events took place in different calendar years; this is an educational counterfactual portfolio, not a real one-year historical portfolio.
- Firebase may require additional setup, limits, or billing depending on usage. For three student groups and a small number of operations, use the Firebase console to check the current plan and quotas.
- Test the flow with three separate browsers/devices before using it for student grades. The game has not been end-to-end tested against your own Firebase backend.
- To rerun, use the instructor reset, reselect the private file, and issue fresh group codes.

## Source code / files

- `index.html`, `student.js`: student portal
- `admin.html`, `admin.js`: instructor login, decision board, reveal, and scoring
- `shared.js`: seven loan offers, formulas, decision validation
- `styles.css`: design
- `config.js`: your public Firebase app configuration (must edit)
- `firestore.rules`: rules to install in Firebase Console separately
