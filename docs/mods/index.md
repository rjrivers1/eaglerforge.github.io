---
title: Mods
---

# Community Mods

This page lists community-provided mods and resource packs that can be loaded into AmplerLauncher or EaglerForge web clients.

## Available Mods

- **Chat Utils (Fixed)** — a patched chat utility script with robust runtime checks and optional audio playback.
  - Raw JS: https://raw.githubusercontent.com/rjrivers1/eaglerforge.github.io/main/docs/.vitepress/public/mods/chat-utils-fixed.js
  - ZIP: https://raw.githubusercontent.com/rjrivers1/eaglerforge.github.io/main/docs/.vitepress/public/mods/chat-utils-fixed.zip
  - How to load: Use AmplerLauncher → `Add External Mod` and paste the Raw JS link, or open DevTools Console and run:

```javascript
(async () => {
  const url = 'https://raw.githubusercontent.com/rjrivers1/eaglerforge.github.io/main/docs/.vitepress/public/mods/chat-utils-fixed.js';
  const s = document.createElement('script');
  s.crossOrigin = 'anonymous';
  s.src = url;
  document.head.appendChild(s);
  console.log('Injected chat-utils-fixed.js from', url);
})();
```

## Add a mod or resource pack

To add a mod or resource pack, follow these steps:

1. Upload the file to `docs/.vitepress/public/mods/` in this repo (or host it on a public URL you control).
2. Commit and push the file to your fork if you want GitHub Pages to host it as a raw-download URL.
3. Use the Raw JS link or the ZIP link as an External Mod (for JS) or External Resource (pack) in AmplerLauncher.

### Placeholder: Prominence II

If you want me to add Prominence II (Hasturian Era v3.1.11), attach the ZIP or provide the public link and I will upload it here and provide the Raw URL:

`https://raw.githubusercontent.com/<your-username>/eaglerforge.github.io/main/docs/.vitepress/public/mods/prominence2-v3.1.11.zip`

## Prominence II — Hasturian Era v3.9.6 (modpack)

- Raw ZIP (hosted): https://raw.githubusercontent.com/rjrivers1/eaglerforge.github.io/main/docs/.vitepress/public/mods/docs/.vitepress/public/mods/prominence2-v3.9.6.zip
- Source / original download: https://www.curseforge.com/minecraft/modpacks/prominence-2-hasturian-era

Note: This is a Forge modpack (mods + overrides). The web EaglerForge client cannot run Forge modpacks; download this zip to use with the CurseForge/MultiMC launcher or to extract mods for server-side usage.

If the file is large or private, prefer hosting as a GitHub Release or an external host and paste the URL here instead.

---

If you'd like, I can add a small UI page to the site that displays all public mods with friendly names and install buttons — let me know if you want that.
