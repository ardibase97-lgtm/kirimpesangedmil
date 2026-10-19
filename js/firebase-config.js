/**
 * KirimPesan - Firebase Configuration & Realtime Sync Engine
 * Mendukung Dual-Mode:
 * 1. Firebase Realtime Database Online (Koneksi instan antar HP dari internet manapun)
 * 2. BroadcastChannel & LocalStorage Fallback (Langsung jalan & bisa dites antar tab/browser seketika tanpa setup)
 */

const FIREBASE_DEFAULT_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "", // Contoh: "https://kirimpesan-chat-default-rtdb.firebaseio.com"
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

class RealtimeSyncManager {
  constructor() {
    this.config = this.loadConfig();
    this.isOnlineFirebase = false;
    this.firebaseApp = null;
    this.db = null;
    
    // Broadcast channel untuk simulasi multi-tab realtime tanpa server
    this.broadcastChannel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('kirimpesan_realtime_bus');
      } catch (e) {}
    }

    this.listeners = new Map();
    this.init();
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem('kirimpesan_firebase_config');
      return saved ? JSON.parse(saved) : FIREBASE_DEFAULT_CONFIG;
    } catch (e) {
      return FIREBASE_DEFAULT_CONFIG;
    }
  }

  saveConfig(newConfig) {
    this.config = Object.assign({}, this.config, newConfig);
    localStorage.setItem('kirimpesan_firebase_config', JSON.stringify(this.config));
    this.init();
  }

  init() {
    // Cek apakah databaseURL Firebase telah diisi
    if (this.config.databaseURL && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(this.config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.db = firebase.database();
        this.isOnlineFirebase = true;
        console.log('[KirimPesan] Terhubung ke Firebase Realtime Database Online.');
      } catch (e) {
        console.warn('[KirimPesan] Gagal inisialisasi Firebase, beralih ke mode offline/local sync:', e);
        this.isOnlineFirebase = false;
      }
    } else {
      this.isOnlineFirebase = false;
      console.log('[KirimPesan] Berjalan dalam mode Local Sync (BroadcastChannel siap).');
    }

    // Pasang listener BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        const { type, path, data } = event.data || {};
        if (type && path) {
          this.notifyLocalListeners(path, data);
        }
      };
    }
  }

  // Kirim data ke path tertentu (misal: 'messages/chat_123', 'typing/chat_123')
  async pushData(path, data) {
    const timestamp = Date.now();
    const payload = { ...data, timestamp };

    if (this.isOnlineFirebase && this.db) {
      try {
        const ref = this.db.ref(path);
        const newRef = ref.push();
        await newRef.set({ ...payload, id: newRef.key });
        return newRef.key;
      } catch (e) {
        console.error('Firebase push error:', e);
      }
    }

    // Fallback: simpan di LocalStorage & siarkan via BroadcastChannel
    const id = 'msg_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);
    const itemWithId = { ...payload, id };

    try {
      const storageKey = 'kirimpesan_path_' + path;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(itemWithId);
      localStorage.setItem(storageKey, JSON.stringify(existing));

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'NEW_DATA',
          path: path,
          data: itemWithId
        });
      }
    } catch (e) {}

    return id;
  }

  // Set data langsung pada path (misal: 'presence/user_123', 'typing/chat_123/user_123')
  async setData(path, data) {
    if (this.isOnlineFirebase && this.db) {
      try {
        await this.db.ref(path).set(data);
        return;
      } catch (e) {}
    }

    try {
      const storageKey = 'kirimpesan_exact_' + path;
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'SET_DATA',
          path: path,
          data: data
        });
      }
    } catch (e) {}
  }

  // Dengarkan perubahan data pada path tertentu
  listenPath(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    this.listeners.get(path).push(callback);

    if (this.isOnlineFirebase && this.db) {
      const ref = this.db.ref(path);
      ref.on('child_added', (snapshot) => {
        const val = snapshot.val();
        if (val) callback(val);
      });
      return;
    }

    // Mode Local: Muat data yang sudah tersimpan
    try {
      const storageKey = 'kirimpesan_path_' + path;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.forEach(item => callback(item));
    } catch (e) {}
  }

  notifyLocalListeners(path, data) {
    for (const [listenPath, callbacks] of this.listeners.entries()) {
      if (path === listenPath || path.startsWith(listenPath)) {
        callbacks.forEach(cb => cb(data));
      }
    }
  }
}

// Instance global Realtime Sync
window.syncEngine = new RealtimeSyncManager();
