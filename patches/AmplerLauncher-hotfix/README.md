AmplerLauncher Hotfix + ModGUI IndexedDB PR

This patch adds a runtime fallback script to migrate large `ml::Mods` data from localStorage into IndexedDB and provides a recommended ModGUI.js code change to use IndexedDB for all large mod storage.

Files included:
- `ml-mods-indexeddb-fallback.js`: A runtime script to migrate existing localStorage data and intercept future writes.
- `0001-hotfix-inject-script.patch`: Patch to inject the fallback script into the launcher HTML early in the page lifecycle (hotfix).
- `0002-modgui-indexeddb.patch`: Patch to modify `ModGUI.js` to store binary mod data in IndexedDB rather than localStorage (proper fix).

How to use:
1. Review the patches and tests in this directory.
2. Apply `0001-hotfix-inject-script.patch` to the launcher repo to add the temporary hotfix (non-invasive). This is safe and can be rolled back later.
3. Apply `0002-modgui-indexeddb.patch` to the `ModGUI.js` source as the long-term fix.
4. Run the test plan to confirm the crash is resolved.

Test plan:
- Before applying: reproduce the QuotaExceededError by writing a large `ml::Mods` value (base64) to localStorage in the live page.
- After applying `0001`: inject script and reload — confirm migration takes place and `ml::Mods` no longer contains large strings.
- After applying `0002` and building: test that adding large mods does not write to localStorage and instead is stored in IndexedDB.

Notes:
- The fallback script is already hosted here (test link) but it's better to add the actual file into the launcher repo and reference it directly as a static asset.
- The long-term change requires updating code where `localStorage.setItem('ml::Mods')` was used, and replacing it with calls to the `saveMods` function that uses IndexedDB for binary data.
