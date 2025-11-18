// Copy of the runtime fallback script that migrates ml::Mods data from localStorage to IndexedDB
// See docs for usage and tests

(function(){
  'use strict';
  const DB_NAME = 'eagler-mods';
  const STORE_NAME = 'mods';
  const MAX_LOCAL_LENGTH = 1024 * 512;

  function openDB(){
    return new Promise((resolve, reject) => {
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
      return base64;
    }
  }

  async function migrateLocalMods(){
    try{
      const raw = localStorage.getItem('ml::Mods');
      if (!raw) return;
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      let changed = false;
      for (let i=0;i<parsed.length;i++){
        const mod = parsed[i];
        for (const k of Object.keys(mod)){
          const value = mod[k];
          if (typeof value === 'string' && value.length > MAX_LOCAL_LENGTH){
            const blob = base64ToBlob(value);
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
        localStorage.setItem('ml::Mods', JSON.stringify(parsed.map(m => ({ name: m.name, fileName: m.fileName, size: m.size, _indexedDBRef: m._indexedDBRef || [] }))));
        console.info('ml::Mods migrated to IndexedDB and metadata updated');
      }
    }catch(err){
      console.warn('migration failed', err);
    }
  }

  (function(){
    try {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = async function(key, value){
        if (key === 'ml::Mods'){
          try{
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)){
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
                const minimal = parsed.map(m => ({ name: m.name, fileName: m.fileName, size: m.size, _indexedDBRef: m._indexedDBRef || [] }));
                return originalSetItem.call(this, key, JSON.stringify(minimal));
              }
            }
          }catch(e){
            console.warn('ml::Mods intercept parse failed', e);
          }
        }
        return originalSetItem.apply(this, arguments);
      };
      console.info('Patched localStorage.setItem to intercept ml::Mods writes');
      migrateLocalMods();
    }catch(e){
      console.warn('Failed to patch localStorage', e);
    }
  })();

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

