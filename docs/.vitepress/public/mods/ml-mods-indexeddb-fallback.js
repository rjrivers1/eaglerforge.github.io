// ml-mods-indexeddb-fallback.js
// Runtime patch to redirect large 'ml::Mods' data from localStorage to IndexedDB
// Inject this script on the page before the launcher initializes (or run in console to migrate existing data).

(function(){
  'use strict';
  const DB_NAME = 'eagler-mods';
  const STORE_NAME = 'mods';
  const MAX_LOCAL_LENGTH = 1024 * 512; // 512KB threshold to move to IndexedDB

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function storeItem(meta, blobOrString){
    const db = await openDB();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add({ meta, data: blobOrString });
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function getItem(id){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  // Convert base64 string to a Blob (attempt to detect mime if present)
  function base64ToBlob(base64){
    try{
      let match = base64.match(/^data:([^;]+);base64,(.*)$/);
      let mime = 'application/octet-stream';
      let data = base64;
      if (match){ mime = match[1]; data = match[2]; }
      const byteCharacters = atob(data);
      const byteArrays = [];
      const sliceSize = 1024;
      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      return new Blob(byteArrays, { type: mime });
    }catch(e){
      console.warn('base64ToBlob conversion failed:', e);
      return base64; // fallback to storing original string
    }
  }

  async function migrateLocalMods(){
    try{
      const raw = localStorage.getItem('ml::Mods');
      if (!raw) return; // nothing to migrate
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      let changed = false;
      for (let i=0;i<parsed.length;i++){
        const mod = parsed[i];
        // detect large blob strings (likely base64) — property might be 'blob' or 'data'
        const keys = Object.keys(mod);
        for (const k of keys){
          const value = mod[k];
          if (typeof value === 'string' && value.length > MAX_LOCAL_LENGTH){
            // Migrate this string to IndexedDB
            console.log('Migrating mod meta to IndexedDB', mod.fileName || mod.name || 'unknown');
            const blob = base64ToBlob(value);
            const meta = { fromKey: k, originFileName: mod.fileName || mod.name || '' };
            const id = await storeItem(meta, blob);
            // Replace property with reference
            delete mod[k];
            mod['_indexedDBRef'] = mod['_indexedDBRef'] || [];
            mod['_indexedDBRef'].push({ key:k, id });
            changed = true;
          }
        }
      }
      if (changed){
        // Save minimal metadata to localStorage
        localStorage.setItem('ml::Mods', JSON.stringify(parsed.map(m => ({ name: m.name, fileName: m.fileName, size: m.size, _indexedDBRef: m._indexedDBRef || [] }))));
        console.info('ml::Mods migrated to IndexedDB and metadata updated');
      }
    }catch(err){
      console.warn('migration failed', err);
    }
  }

  // Monkey-patch localStorage.setItem to intercept ml::Mods writes
  (function(){
    try {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = async function(key, value){
        if (key === 'ml::Mods'){
          try{
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)){
              // Migrate any large fields to IndexedDB before storing
              let changed = false;
              for (let i=0;i<parsed.length;i++){
                const mod = parsed[i];
                for (const k of Object.keys(mod)){
                  const v = mod[k];
                  if (typeof v === 'string' && v.length > MAX_LOCAL_LENGTH){
                    const blob = base64ToBlob(v);
                    const meta = { fromKey: k, originFileName: mod.fileName || mod.name || '' };
                    const id = await storeItem(meta, blob);
                    delete mod[k];
                    mod['_indexedDBRef'] = mod['_indexedDBRef'] || [];
                    mod['_indexedDBRef'].push({ key:k, id });
                    changed = true;
                  }
                }
              }
              if (changed){
                // save only minimal metadata
                const minimal = parsed.map(m => ({ name: m.name, fileName: m.fileName, size: m.size, _indexedDBRef: m._indexedDBRef || [] }));
                return originalSetItem.call(this, key, JSON.stringify(minimal));
              }
            }
          }catch(e){
            // Not JSON or parse failed: fall back to original
            console.warn('ml::Mods intercept parse failed', e);
          }
        }
        return originalSetItem.apply(this, arguments);
      };
      console.info('Patched localStorage.setItem to intercept ml::Mods writes');
      // Immediately attempt to migrate existing ml::Mods
      migrateLocalMods();
    }catch(e){
      console.warn('Failed to patch localStorage', e);
    }
  })();

  // Expose helper to get mod blobs by id in console: window.mlModsGetBlob(id)
  window.mlModsGetBlob = async function(id){
    const rec = await getItem(id);
    if (!rec) return null;
    return rec.data;
  };

  window.mlModsList = async function(){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
      const list = [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const r = tx.objectStore(STORE_NAME).openCursor();
      r.onsuccess = e => { var cur = e.target.result; if (cur) { list.push({ id: cur.key, meta: cur.value.meta, size: cur.value.data?.size || (typeof cur.value.data === 'string' ? cur.value.data.length : 0) }); cur.continue(); } else resolve(list); };
      r.onerror = e => reject(e.target.error);
    });
  };

})();

/*
Usage:
1. Inject this as a script in the console before loading the page (or paste in DevTools Console):
   (function(){ const s = document.createElement('script'); s.src = 'https://raw.githubusercontent.com/rjrivers1/eaglerforge.github.io/main/docs/.vitepress/public/mods/ml-mods-indexeddb-fallback.js'; document.head.appendChild(s);})();
2. If the site already crashed, refresh after injection.
3. To retrieve a blob by id, run in console: await window.mlModsGetBlob(1) — returns a Blob or string.
4. To see the list of stored blobs: await window.mlModsList();
5. To clear local ml::Mods and avoid crash: localStorage.removeItem('ml::Mods'); location.reload();

Notes:
- This script tries to be non-destructive: it migrates large base64 fields into IndexedDB and replaces them with references in the saved metadata.
- If a mod stores binary as base64 without the data: prefix, the script still tries to decode it.
*/

