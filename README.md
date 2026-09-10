# yao-pi.github.io

Deploy mirror for the **Tap Tempo** Pi app. Served at the domain root —
`https://yao-pi.github.io/` — which is the app's **Production URL** in the Pi
Developer Portal.

The root matters: Pi verifies domain ownership by fetching
`validation-key.txt` from the domain root, so an app on a project-Pages
subpath would leave the key somewhere Pi never looks.

## This is a mirror — do not edit the app files here

Source of truth is **[yao-pi/metronome-pi](https://github.com/yao-pi/metronome-pi)**
(`docs/`). Edit there, then run its deploy script:

```bash
cd ~/Claude/proj-metronome-dp && ./scripts/deploy.sh
```

Mirrored files: `index.html`, `styles.css`, `app.js`, `config.js`, `.nojekyll`.

## validation-key.txt is NOT mirrored

It lives only in this repo and is never overwritten by a sync — the source
repo has no copy to clobber it with. To update it:

```bash
cd ~/Claude/yao-pi.github.io
echo "PASTE_NEW_KEY_HERE" > validation-key.txt
git add validation-key.txt && git commit -m "Update Pi domain validation key" && git push
```

Wait for the Pages deploy, confirm `https://yao-pi.github.io/validation-key.txt`
returns exactly the key, then click **Verify domain** in the portal.
