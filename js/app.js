/**
 * KirimPesan - Application State & Navigation Engine
 * Mengatur daftar kontak, tab navigasi (Chat, Status, Panggilan), modal, dan setelan tema
 */

class AppEngine {
  constructor() {
    this.currentUser = this.loadCurrentUser();
    this.contacts = this.loadContacts();
    this.callHistory = this.loadCallHistory();
    this.activeTab = 'chat';
    this.currentTheme = localStorage.getItem('kirimpesan_theme') || 'dark';

    this.init();
  }

  loadCurrentUser() {
    const saved = localStorage.getItem('kirimpesan_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const defaultUser = {
      id: 'user_' + Math.random().toString(36).substring(2, 8),
      name: 'Saya',
      phone: '+62 812-3456-7890',
      bio: 'Ada dan tersedia di KirimPesan',
      avatarColor: '#00a884'
    };
    localStorage.setItem('kirimpesan_user', JSON.stringify(defaultUser));
    return defaultUser;
  }

  loadContacts() {
    const saved = localStorage.getItem('kirimpesan_contacts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Kontak bawaan awal yang ramah & siap dites
    const initialContacts = [
      {
        id: 'contact_budi',
        name: 'Budi Santoso',
        phone: '+62 813-8888-1234',
        lastMessage: 'Siap mantap, terima kasih banyak!',
        lastTime: '11.45',
        unreadCount: 2,
        isOnline: true,
        lastSeen: 'online',
        avatarColor: '#128c7e'
      },
      {
        id: 'contact_siti',
        name: 'Siti Rahma',
        phone: '+62 856-7777-5678',
        lastMessage: 'Halo! Ada kabar apa hari ini?',
        lastTime: '09.15',
        unreadCount: 0,
        isOnline: false,
        lastSeen: 'terakhir dilihat hari ini pukul 09.20',
        avatarColor: '#e0538f'
      },
      {
        id: 'contact_admin',
        name: 'Kasir & Cetak Express',
        phone: '+62 821-9999-0000',
        lastMessage: 'Pesanan cetak spanduk Anda sudah selesai.',
        lastTime: 'Kemarin',
        unreadCount: 0,
        isOnline: true,
        lastSeen: 'online',
        avatarColor: '#00a884'
      }
    ];
    localStorage.setItem('kirimpesan_contacts', JSON.stringify(initialContacts));
    return initialContacts;
  }

  loadCallHistory() {
    const saved = localStorage.getItem('kirimpesan_calls');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        contactName: 'Budi Santoso',
        avatarColor: '#128c7e',
        type: 'video',
        time: 'Hari ini pukul 11.20',
        direction: 'incoming', // incoming, outgoing, missed
        statusText: 'Masuk'
      },
      {
        contactName: 'Siti Rahma',
        avatarColor: '#e0538f',
        type: 'voice',
        time: 'Kemarin pukul 16.45',
        direction: 'outgoing',
        statusText: 'Keluar'
      }
    ];
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.renderContactsList();
    this.renderCallHistory();
    this.initEventListeners();
    this.registerServiceWorker();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kirimpesan_theme', theme);

    const themeToggleBtn = document.getElementById('btnToggleTheme');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark' ? 
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' : 
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.showToast(`Mode ${newTheme === 'dark' ? 'Gelap' : 'Terang'} aktif`);
  }

  initEventListeners() {
    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Theme toggle
    document.getElementById('btnToggleTheme')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Search filter
    const searchInput = document.getElementById('searchContactsInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        this.renderContactsList(query);
      });
    }

    // New Chat FAB
    document.getElementById('fabNewChat')?.addEventListener('click', () => {
      this.openModal('modalNewContact');
    });

    // Settings Button
    document.getElementById('btnOpenSettings')?.addEventListener('click', () => {
      this.openSettingsModal();
    });

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      });
    });

    // Form Tambah Kontak
    document.getElementById('formAddContact')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('inputContactName')?.value.trim();
      const phone = document.getElementById('inputContactPhone')?.value.trim();
      if (!name) return;

      this.addContact(name, phone);
      document.getElementById('modalNewContact')?.classList.remove('active');
      document.getElementById('inputContactName').value = '';
      document.getElementById('inputContactPhone').value = '';
    });

    // Form Simpan Pengaturan Firebase
    document.getElementById('formSaveFirebase')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('inputFirebaseUrl')?.value.trim();
      window.syncEngine?.saveConfig({ databaseURL: url });
      this.showToast('Pengaturan Firebase berhasil disimpan!');
      document.getElementById('modalSettings')?.classList.remove('active');
    });

    // Tombol Back di Chat Room
    document.getElementById('btnChatBack')?.addEventListener('click', () => {
      window.chatController?.closeChat();
    });

    // Tombol Panggilan Suara & Video di Header Chat
    document.getElementById('btnChatVoiceCall')?.addEventListener('click', () => {
      if (window.chatController?.activeContact) {
        window.callEngine?.startCall(window.chatController.activeContact, 'voice');
      }
    });

    document.getElementById('btnChatVideoCall')?.addEventListener('click', () => {
      if (window.chatController?.activeContact) {
        window.callEngine?.startCall(window.chatController.activeContact, 'video');
      }
    });

    // Tombol Kontrol Panggilan
    document.getElementById('btnEndCall')?.addEventListener('click', () => {
      window.callEngine?.endCall();
    });

    document.getElementById('btnCallMute')?.addEventListener('click', () => {
      window.callEngine?.toggleMute();
    });

    document.getElementById('btnCallToggleVideo')?.addEventListener('click', () => {
      window.callEngine?.toggleVideo();
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tabContent_${tabName}`);
    });

    // Update FAB icon sesuai tab
    const fab = document.getElementById('fabNewChat');
    if (fab) {
      if (tabName === 'chat') {
        fab.style.display = 'flex';
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
      } else if (tabName === 'status') {
        fab.style.display = 'flex';
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
      } else if (tabName === 'calls') {
        fab.style.display = 'flex';
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 0 0-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z"/></svg>';
      }
    }
  }

  renderContactsList(filterQuery = '') {
    const listEl = document.getElementById('chatContactsList');
    if (!listEl) return;

    let items = this.contacts;
    if (filterQuery) {
      items = items.filter(c => c.name.toLowerCase().includes(filterQuery) || (c.lastMessage && c.lastMessage.toLowerCase().includes(filterQuery)));
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-secondary);">
          <p style="font-size: 0.95rem; margin-bottom: 8px;">Tidak ada obrolan ditemukan</p>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Klik tombol hijau di kanan bawah untuk memulai obrolan baru</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(contact => {
      const unreadBadge = contact.unreadCount > 0 ? `<span class="chat-unread-badge">${contact.unreadCount}</span>` : '';
      const onlineDot = contact.isOnline ? '<span class="online-status-dot"></span>' : '';

      return `
        <li class="chat-item" data-contact-id="${contact.id}">
          <div class="chat-avatar-wrapper">
            <div class="chat-avatar" style="background-color: ${contact.avatarColor || '#008069'};">
              ${contact.name.charAt(0)}
            </div>
            ${onlineDot}
          </div>
          <div class="chat-info">
            <div class="chat-info-top">
              <span class="chat-contact-name">${contact.name}</span>
              <span class="chat-time">${contact.lastTime || ''}</span>
            </div>
            <div class="chat-info-bottom">
              <span class="chat-last-message">${contact.lastMessage || 'Ketuk untuk mulai obrolan'}</span>
              ${unreadBadge}
            </div>
          </div>
        </li>
      `;
    }).join('');

    // Pasang click listener pada tiap baris chat
    listEl.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const contactId = item.dataset.contactId;
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
          window.chatController?.openChat(contact);
        }
      });
    });
  }

  renderCallHistory() {
    const listEl = document.getElementById('callsHistoryList');
    if (!listEl) return;

    listEl.innerHTML = this.callHistory.map(call => {
      const isVoice = call.type === 'voice';
      const icon = isVoice ? 
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>' : 
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>';

      return `
        <li class="call-log-item">
          <div class="chat-avatar" style="background-color: ${call.avatarColor || '#008069'};">
            ${call.contactName.charAt(0)}
          </div>
          <div class="chat-info">
            <span class="chat-contact-name">${call.contactName}</span>
            <div class="call-icon-type call-${call.direction}">
              <span>↗</span>
              <span>${call.time}</span>
            </div>
          </div>
          <button type="button" class="header-action-btn" style="color: var(--wa-primary);">
            ${icon}
          </button>
        </li>
      `;
    }).join('');
  }

  addContact(name, phone) {
    const colors = ['#00a884', '#128c7e', '#e0538f', '#ac44cf', '#5157ae', '#3b4a54', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newContact = {
      id: 'contact_' + Date.now(),
      name: name,
      phone: phone || '+62 8...',
      lastMessage: 'Baru saja ditambahkan',
      lastTime: 'Baru saja',
      unreadCount: 0,
      isOnline: true,
      lastSeen: 'online',
      avatarColor: randomColor
    };

    this.contacts.unshift(newContact);
    localStorage.setItem('kirimpesan_contacts', JSON.stringify(this.contacts));
    this.renderContactsList();
    this.showToast(`Kontak "${name}" berhasil ditambahkan!`);
    window.chatController?.openChat(newContact);
  }

  updateLastMessage(contactId, messageSnippet, status) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.lastMessage = messageSnippet;
      const d = new Date();
      contact.lastTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
      localStorage.setItem('kirimpesan_contacts', JSON.stringify(this.contacts));
      this.renderContactsList();
    }
  }

  markChatAsRead(contactId) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact && contact.unreadCount > 0) {
      contact.unreadCount = 0;
      localStorage.setItem('kirimpesan_contacts', JSON.stringify(this.contacts));
      this.renderContactsList();
    }
  }

  incrementUnread(contactId, messageSnippet) {
    const contact = this.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.unreadCount = (contact.unreadCount || 0) + 1;
      contact.lastMessage = messageSnippet;
      localStorage.setItem('kirimpesan_contacts', JSON.stringify(this.contacts));
      this.renderContactsList();
    }
  }

  addCallHistory(contact, type, isConnected) {
    const newEntry = {
      contactName: contact.name,
      avatarColor: contact.avatarColor,
      type: type,
      time: 'Hari ini ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
      direction: 'outgoing',
      statusText: isConnected ? 'Tersambung' : 'Dibatalkan'
    };
    this.callHistory.unshift(newEntry);
    localStorage.setItem('kirimpesan_calls', JSON.stringify(this.callHistory));
    this.renderCallHistory();
  }

  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  }

  openSettingsModal() {
    const inputUrl = document.getElementById('inputFirebaseUrl');
    if (inputUrl && window.syncEngine) {
      inputUrl.value = window.syncEngine.config?.databaseURL || '';
    }
    this.openModal('modalSettings');
  }

  showToast(message) {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.appEngine = new AppEngine();
});
