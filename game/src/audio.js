// MERIDIAN — sound, synthesised live with WebAudio. No audio files, no
// network: every cue is an oscillator. M toggles mute. Silent until the
// first user gesture creates the AudioContext.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'square', 0.05);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.12);
      tone(1318, 0.12, 'sine', 0.1, 0.08);
    },
    target() {
      tone(523, 0.12, 'triangle', 0.14);
      tone(659, 0.12, 'triangle', 0.14, 0.1);
      tone(784, 0.2, 'triangle', 0.16, 0.2);
    },
    alert() {
      tone(220, 0.35, 'sawtooth', 0.12, 0, 440);
      tone(220, 0.3, 'sawtooth', 0.1, 0.18, 440);
    },
    spotted() {
      tone(980, 0.12, 'square', 0.08);
    },
    busted() {
      tone(392, 0.25, 'sawtooth', 0.14, 0, 196);
      tone(196, 0.5, 'sawtooth', 0.14, 0.22, 98);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
    },
    emp() {
      tone(1400, 0.25, 'sawtooth', 0.07, 0, 180);
    },
    smoke() {
      tone(300, 0.3, 'sine', 0.06, 0, 120);
    },
  };
}
