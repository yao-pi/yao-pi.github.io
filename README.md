# yao-pi.github.io

Public deploy target for the **Tap Tempo** Pi Browser app.

Served at the domain root — `https://yao-pi.github.io/` — so that Pi's
`validation-key.txt` domain verification can sit at
`https://yao-pi.github.io/validation-key.txt`. A project Pages site would
publish to a subpath, where Pi would never find the file.

## This is a mirror

Source of truth is the private `proj-newpiapp` repo. Only the four app files
live here. To resync after changing them there:

```bash
for f in index.html styles.css app.js pi.js; do
  cp ~/Claude/proj-newpiapp/"$f" ~/Claude/yao-pi.github.io/"$f"
done
cd ~/Claude/yao-pi.github.io && git add -A && git commit -m "Sync from proj-newpiapp" && git push
```

## Pi domain verification

Get the key from the Developer Portal (`develop.pi` in the Pi Browser), then:

```bash
cd ~/Claude/yao-pi.github.io
echo "PASTE_KEY_HERE" > validation-key.txt
git add validation-key.txt && git commit -m "Add Pi domain validation key" && git push
```

Wait for the Pages deploy, confirm `https://yao-pi.github.io/validation-key.txt`
returns the key, then click **Verify domain** in the portal.
