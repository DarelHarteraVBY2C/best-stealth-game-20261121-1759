// Silent Shadow — the sounds, all made with the Web Audio API.
// No sound files: footsteps are a short filtered noise tap, the alarm a
// rising tone, a gem a bright two-note chime, being caught a low sting,
// and clearing a level a little arpeggio. The context is created on the
// first gesture, so a quiet page never complains.
export function createSound() {
  let ctx = null;
  let muted = false;
  let alarmOsc = null;
  let alarmGain = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    return ctx;
  }

  function unlock() {
    ensure();
  }

  function tone(freq, dur, type, vol, when = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (muted) this.alarmOff();
      return muted;
    },
    isMuted() {
      return muted;
    },
    footstep() {
      const ac = ensure();
      if (!ac || muted) return;
      const dur = 0.05;
      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      const gain = ac.createGain();
      gain.gain.value = 0.12;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      src.start();
    },
    gem() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.2, 'sine', 0.14, 0.08);
    },
    caught() {
      tone(160, 0.5, 'sawtooth', 0.2);
      tone(110, 0.6, 'sawtooth', 0.18, 0.12);
    },
    levelClear() {
      tone(523, 0.14, 'triangle', 0.16);
      tone(659, 0.14, 'triangle', 0.16, 0.12);
      tone(784, 0.22, 'triangle', 0.18, 0.24);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.13));
    },
    alarmOn() {
      const ac = ensure();
      if (!ac || muted || alarmOsc) return;
      alarmOsc = ac.createOscillator();
      alarmGain = ac.createGain();
      alarmOsc.type = 'sine';
      alarmOsc.frequency.value = 440;
      alarmGain.gain.value = 0;
      alarmGain.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.2);
      alarmOsc.connect(alarmGain);
      alarmGain.connect(ac.destination);
      alarmOsc.start();
    },
    alarmOff() {
      if (!alarmOsc) return;
      try {
        alarmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
        alarmOsc.stop(ctx.currentTime + 0.15);
      } catch { /* already stopped */ }
      alarmOsc = null;
      alarmGain = null;
    },
    alarmLevel(level) {
      if (alarmOsc) alarmOsc.frequency.value = 380 + level * 3.2;
    },
  };
}
