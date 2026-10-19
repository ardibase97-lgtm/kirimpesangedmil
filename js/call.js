/**
 * KirimPesan - WebRTC Voice & Video Call Engine
 * Mendukung kamera depan/belakang, mute mic, timer panggilan, dan sintesis nada panggil
 */

class CallEngine {
  constructor() {
    this.activeCall = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.callTimerInterval = null;
    this.callSeconds = 0;
    this.ringtoneInterval = null;
    this.isMuted = false;
    this.isVideoOff = false;

    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  /**
   * Memulai panggilan keluar (Voice atau Video)
   */
  async startCall(contact, type = 'video') {
    this.activeCall = {
      contact: contact,
      type: type,
      status: 'calling', // 'calling' | 'connected' | 'ended'
      startTime: null
    };

    this.renderCallUI();
    this.startRingtoneSound('outgoing');

    // Minta izin kamera & mikrofon
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const localVideo = document.getElementById('localVideoPipElement');
      if (localVideo && type === 'video') {
        localVideo.srcObject = this.localStream;
      }
    } catch (err) {
      console.warn('Izin kamera/mic ditolak atau tidak tersedia:', err);
    }

    // Simulasi jawaban panggilan otomatis untuk kontak demo jika offline
    setTimeout(() => {
      if (this.activeCall && this.activeCall.status === 'calling') {
        this.acceptCall();
      }
    }, 3200);
  }

  /**
   * Panggilan terhubung
   */
  acceptCall() {
    if (!this.activeCall) return;
    this.stopRingtoneSound();
    this.activeCall.status = 'connected';
    this.activeCall.startTime = Date.now();

    const statusEl = document.getElementById('callStatusTimer');
    if (statusEl) statusEl.textContent = '00:00';

    this.callSeconds = 0;
    clearInterval(this.callTimerInterval);
    this.callTimerInterval = setInterval(() => {
      this.callSeconds++;
      const mins = String(Math.floor(this.callSeconds / 60)).padStart(2, '0');
      const secs = String(this.callSeconds % 60).padStart(2, '0');
      if (statusEl) statusEl.textContent = `${mins}:${secs}`;
    }, 1000);

    // Sembunyikan lingkaran animasi panggil jika video aktif
    const videoContainer = document.getElementById('callVideoContainer');
    const avatarVoice = document.getElementById('voiceCallAvatarWrapper');
    if (this.activeCall.type === 'video') {
      if (videoContainer) videoContainer.classList.add('active');
      if (avatarVoice) avatarVoice.style.display = 'none';
      
      // Simulasi remote video dengan feed lokal jika demo
      const remoteVideo = document.getElementById('remoteVideoStreamElement');
      if (remoteVideo && this.localStream) {
        remoteVideo.srcObject = this.localStream;
      }
    } else {
      if (videoContainer) videoContainer.classList.remove('active');
      if (avatarVoice) avatarVoice.style.display = 'flex';
    }
  }

  /**
   * Akhiri panggilan
   */
  endCall() {
    this.stopRingtoneSound();
    clearInterval(this.callTimerInterval);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    const screen = document.getElementById('callOverlayScreen');
    if (screen) screen.classList.remove('active');

    // Catat ke daftar riwayat panggilan
    if (this.activeCall) {
      window.appEngine?.addCallHistory(this.activeCall.contact, this.activeCall.type, this.callSeconds > 0);
    }

    this.activeCall = null;
    this.callSeconds = 0;
  }

  toggleMute() {
    if (!this.localStream) return;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    const muteBtn = document.getElementById('btnCallMute');
    if (muteBtn) {
      muteBtn.classList.toggle('active-off', this.isMuted);
    }
  }

  toggleVideo() {
    if (!this.localStream) return;
    this.isVideoOff = !this.isVideoOff;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isVideoOff;
    });

    const videoBtn = document.getElementById('btnCallToggleVideo');
    if (videoBtn) {
      videoBtn.classList.toggle('active-off', this.isVideoOff);
    }
  }

  renderCallUI() {
    const screen = document.getElementById('callOverlayScreen');
    if (!screen || !this.activeCall) return;

    document.getElementById('callContactName').textContent = this.activeCall.contact.name;
    document.getElementById('callTypeBadge').innerHTML = this.activeCall.type === 'video' ? 
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg> Video Call WhatsApp' : 
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.72 11.72 0 0 0 3.67.59 1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.72 11.72 0 0 0 .59 3.67 1 1 0 0 1-.24 1.02l-2.22 2.1z"/></svg> Panggilan Suara WhatsApp';

    document.getElementById('callStatusTimer').textContent = 'Memanggil...';

    const avatar = document.getElementById('callMainAvatar');
    if (avatar) {
      avatar.textContent = this.activeCall.contact.name.charAt(0);
      avatar.style.backgroundColor = this.activeCall.contact.avatarColor || '#008069';
    }

    screen.classList.add('active');
  }

  /**
   * Generator nada dering panggil (Web Audio API)
   */
  startRingtoneSound(type = 'outgoing') {
    this.stopRingtoneSound();
    const ctx = window.mediaEngine?.audioCtx;
    if (!ctx) return;

    this.ringtoneInterval = setInterval(() => {
      try {
        window.mediaEngine.resumeAudio();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      } catch (e) {}
    }, 3000);
  }

  stopRingtoneSound() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

window.callEngine = new CallEngine();
