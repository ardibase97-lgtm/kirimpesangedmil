/**
 * KirimPesan - Messaging & Chat Room Controller
 * Mengatur pengiriman teks, gambar, status centang dua biru, dan indikator sedang mengetik
 */

class ChatController {
  constructor() {
    this.activeContact = null;
    this.messages = [];
    this.typingTimeout = null;
    this.isTyping = false;

    this.initListeners();
  }

  initListeners() {
    const input = document.getElementById('chatTextInput');
    const sendBtn = document.getElementById('btnSendVoice');

    if (input) {
      input.addEventListener('input', () => {
        const text = input.value.trim();
        this.handleTypingStatus(text.length > 0);

        // Ubah ikon tombol mic jadi kirim jika ada teks
        if (sendBtn) {
          if (text.length > 0) {
            sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
            sendBtn.title = 'Kirim Pesan';
          } else {
            sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>';
            sendBtn.title = 'Pesan Suara';
          }
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const text = input?.value.trim() || '';
        if (text.length > 0) {
          this.sendMessage();
        } else {
          this.sendVoiceNote();
        }
      });
    }

    // Attachment Drawer toggle
    const attachBtn = document.getElementById('btnAttachDrawer');
    const drawer = document.getElementById('attachmentDrawer');
    if (attachBtn && drawer) {
      attachBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        drawer.classList.remove('show');
      });
    }

    // Photo input
    const fileInput = document.getElementById('imageFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const base64 = await window.mediaEngine.compressImage(file);
            this.sendMediaMessage(base64);
          } catch (err) {
            console.error('Gagal memproses gambar:', err);
          }
          fileInput.value = '';
          drawer?.classList.remove('show');
        }
      });
    }
  }

  openChat(contact) {
    this.activeContact = contact;

    // Set UI Header
    document.getElementById('chatHeaderName').textContent = contact.name;
    const avatar = document.getElementById('chatHeaderAvatar');
    if (avatar) {
      avatar.textContent = contact.name.charAt(0);
      avatar.style.backgroundColor = contact.avatarColor || '#008069';
    }

    const statusEl = document.getElementById('chatHeaderStatus');
    if (statusEl) {
      statusEl.textContent = contact.isOnline ? 'online' : (contact.lastSeen || 'terakhir dilihat kemarin');
      statusEl.className = 'chat-header-status';
    }

    // Tampilkan View Chat Room
    const view = document.getElementById('chatRoomView');
    if (view) view.classList.add('active');

    // Muat riwayat pesan
    this.loadMessages();

    // Dengarkan pesan masuk real-time untuk room ini
    const chatId = this.getChatId(contact.id);
    window.syncEngine.listenPath(`messages/${chatId}`, (newMsg) => {
      this.handleIncomingMessage(newMsg);
    });

    // Dengarkan status typing
    window.syncEngine.listenPath(`typing/${chatId}`, (typingData) => {
      this.handleRemoteTyping(typingData);
    });

    // Reset unread count di daftar
    window.appEngine?.markChatAsRead(contact.id);
  }

  closeChat() {
    const view = document.getElementById('chatRoomView');
    if (view) view.classList.remove('active');
    this.activeContact = null;
  }

  getChatId(contactId) {
    const myId = window.appEngine?.currentUser?.id || 'my_user';
    return [myId, contactId].sort().join('__');
  }

  formatTime(date = new Date()) {
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  }

  async sendMessage() {
    const input = document.getElementById('chatTextInput');
    const text = input?.value.trim();
    if (!text || !this.activeContact) return;

    input.value = '';
    input.style.height = 'auto';
    this.handleTypingStatus(false);

    const messageData = {
      senderId: window.appEngine?.currentUser?.id || 'my_user',
      senderName: window.appEngine?.currentUser?.name || 'Saya',
      receiverId: this.activeContact.id,
      text: text,
      type: 'text',
      status: 'sent', // 'sent' -> 'delivered' -> 'read'
      createdAt: Date.now()
    };

    // Render langsung di layar lokal
    this.appendMessageBubble(messageData, true);
    window.mediaEngine?.playSentSound();

    // Kirim ke sync engine (Firebase / Local)
    const chatId = this.getChatId(this.activeContact.id);
    await window.syncEngine.pushData(`messages/${chatId}`, messageData);

    // Update snippet di daftar kontak
    window.appEngine?.updateLastMessage(this.activeContact.id, text, 'sent');

    // Simulasi balasan cerdas dari kontak demo jika pengguna sedang mencoba
    this.triggerDemoReply(text);
  }

  async sendMediaMessage(base64Image) {
    if (!this.activeContact) return;

    const messageData = {
      senderId: window.appEngine?.currentUser?.id || 'my_user',
      senderName: window.appEngine?.currentUser?.name || 'Saya',
      receiverId: this.activeContact.id,
      mediaUrl: base64Image,
      type: 'image',
      status: 'sent',
      createdAt: Date.now()
    };

    this.appendMessageBubble(messageData, true);
    window.mediaEngine?.playSentSound();

    const chatId = this.getChatId(this.activeContact.id);
    await window.syncEngine.pushData(`messages/${chatId}`, messageData);

    window.appEngine?.updateLastMessage(this.activeContact.id, '📷 Foto', 'sent');
    this.triggerDemoReply('Foto yang bagus!');
  }

  async sendVoiceNote() {
    if (!this.activeContact) return;

    const messageData = {
      senderId: window.appEngine?.currentUser?.id || 'my_user',
      receiverId: this.activeContact.id,
      type: 'voice',
      duration: '0:05',
      status: 'sent',
      createdAt: Date.now()
    };

    this.appendMessageBubble(messageData, true);
    window.mediaEngine?.playSentSound();

    const chatId = this.getChatId(this.activeContact.id);
    await window.syncEngine.pushData(`messages/${chatId}`, messageData);

    window.appEngine?.updateLastMessage(this.activeContact.id, '🎤 Pesan Suara (0:05)', 'sent');
    this.triggerDemoReply('Siap, saya dengarkan pesan suaranya!');
  }

  appendMessageBubble(msg, isOutgoing) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

    let bodyHtml = '';
    if (msg.type === 'image') {
      bodyHtml = `
        <div class="message-image-wrapper">
          <img src="${msg.mediaUrl}" class="message-image" alt="Foto">
        </div>
      `;
    } else if (msg.type === 'voice') {
      bodyHtml = `
        <div class="voice-note-bubble">
          <button type="button" class="vn-play-btn">▶</button>
          <div class="vn-wave">
            <span class="vn-bar" style="height: 12px;"></span>
            <span class="vn-bar" style="height: 18px;"></span>
            <span class="vn-bar" style="height: 10px;"></span>
            <span class="vn-bar" style="height: 22px;"></span>
            <span class="vn-bar" style="height: 14px;"></span>
            <span class="vn-bar" style="height: 16px;"></span>
          </div>
          <span style="font-size: 0.72rem; color: var(--text-secondary);">${msg.duration || '0:05'}</span>
        </div>
      `;
    } else {
      bodyHtml = `<span class="message-text">${this.escapeHtml(msg.text || '')}</span>`;
    }

    const checkIcon = isOutgoing ? `
      <span class="message-status-check ${msg.status === 'read' ? 'read' : 'sent'}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.41 11.93l-1.41 1.41 5.66 5.66 12-12-1.42-1.41zM.41 13.41L6.07 19.07l1.41-1.41L1.82 12 .41 13.41z"/>
        </svg>
      </span>
    ` : '';

    bubble.innerHTML = `
      ${bodyHtml}
      <div class="message-meta">
        <span class="message-time">${this.formatTime(msg.createdAt)}</span>
        ${checkIcon}
      </div>
    `;

    container.appendChild(bubble);
    this.scrollToBottom();
  }

  handleIncomingMessage(msg) {
    // Abaikan jika pesan berasal dari diri sendiri
    const myId = window.appEngine?.currentUser?.id || 'my_user';
    if (msg.senderId === myId) return;

    if (this.activeContact && msg.senderId === this.activeContact.id) {
      this.appendMessageBubble(msg, false);
      window.mediaEngine?.playIncomingSound();
      this.scrollToBottom();
    } else {
      // Notifikasi di background jika obrolan belum dibuka
      window.appEngine?.incrementUnread(msg.senderId, msg.text || 'Pesan baru');
      window.mediaEngine?.playIncomingSound();
    }
  }

  scrollToBottom() {
    const container = document.getElementById('chatMessagesContainer');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  handleTypingStatus(isTyping) {
    if (!this.activeContact) return;
    const chatId = this.getChatId(this.activeContact.id);
    const myId = window.appEngine?.currentUser?.id || 'my_user';

    window.syncEngine.setData(`typing/${chatId}/${myId}`, isTyping);

    clearTimeout(this.typingTimeout);
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        window.syncEngine.setData(`typing/${chatId}/${myId}`, false);
      }, 3000);
    }
  }

  handleRemoteTyping(typingData) {
    if (!this.activeContact) return;
    const myId = window.appEngine?.currentUser?.id || 'my_user';
    let isContactTyping = false;

    if (typingData && typeof typingData === 'object') {
      for (const [userId, isTyping] of Object.entries(typingData)) {
        if (userId !== myId && isTyping) {
          isContactTyping = true;
          break;
        }
      }
    }

    const statusEl = document.getElementById('chatHeaderStatus');
    if (statusEl) {
      if (isContactTyping) {
        statusEl.textContent = 'sedang mengetik...';
        statusEl.className = 'chat-header-status typing';
      } else {
        statusEl.textContent = this.activeContact.isOnline ? 'online' : (this.activeContact.lastSeen || 'terakhir dilihat kemarin');
        statusEl.className = 'chat-header-status';
      }
    }
  }

  loadMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="date-separator">HARI INI</div>
    `;

    // Ambil pesan tersimpan
    const key = `kirimpesan_chat_${this.activeContact.id}`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');

    if (saved.length === 0) {
      // Contoh pesan sapaan bawaan awal
      const sample = [
        { senderId: this.activeContact.id, text: `Halo! Ini ${this.activeContact.name}. Ada yang bisa saya bantu?`, createdAt: Date.now() - 3600000, status: 'read' }
      ];
      sample.forEach(m => this.appendMessageBubble(m, m.senderId !== this.activeContact.id));
    } else {
      saved.forEach(m => this.appendMessageBubble(m, m.senderId !== this.activeContact.id));
    }
  }

  triggerDemoReply(triggerText) {
    if (!this.activeContact) return;
    const contact = this.activeContact;

    // Balasan simulasi pintar otomatis
    setTimeout(() => {
      if (this.activeContact && this.activeContact.id === contact.id) {
        const replies = [
          'Baik, pesan sudah saya terima dengan jelas!',
          'Oke, nanti saya kabari lagi ya secepatnya.',
          'Siap mantap, terima kasih banyak!',
          'Halo! Ada perkembangan apa hari ini?',
          'Bisa, langsung saya proses ya!'
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];

        this.appendMessageBubble({
          senderId: contact.id,
          text: randomReply,
          createdAt: Date.now()
        }, false);

        window.mediaEngine?.playIncomingSound();
        window.appEngine?.updateLastMessage(contact.id, randomReply, 'received');

        // Update centang pesan pengirim jadi biru (sudah dibaca)
        document.querySelectorAll('.message-bubble.outgoing .message-status-check').forEach(el => {
          el.className = 'message-status-check read';
        });
      }
    }, 2800);
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.chatController = new ChatController();
