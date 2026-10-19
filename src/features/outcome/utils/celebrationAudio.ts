/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Premium 6-Second Soft Celebration Sound Engine (Web Audio API)
 *
 * Designed for a premium, futuristic productivity & study dashboard (X-29).
 * Style: Minimal, elegant, uplifting, satisfying, and modern.
 *
 * Sequence Breakdown (Exactly 6.0 Seconds):
 * - 0–1s: Gentle, sparkling chime that signals success with silky crystalline overtones.
 * - 1–3s: Soft, warm bell tones with a subtle shimmering texture over a warm ambient pad.
 * - 3–5s: Delicate, uplifting musical flourish with luminous crystalline glass notes.
 * - 5–6s: Smooth, soft fade-out with a final satisfying resolution chime.
 *
 * Audio Characteristics:
 * - Exactly 6.0 seconds.
 * - Soft volume, warm ambient synth (E Maj9) + delicate glass bells.
 * - Zero loud percussion, zero harsh transients, zero dramatic orchestra, zero long muddy reverb.
 * - Feels rewarding, elegant, and motivating without interrupting study concentration.
 * - Instant teardown & offline Web Audio synthesis.
 */

let activeCelebrationContext: AudioContext | null = null;
let activeTeardownTimeout: ReturnType<typeof setTimeout> | null = null;

export function stopCelebrationFanfare(): void {
  if (activeTeardownTimeout) {
    clearTimeout(activeTeardownTimeout);
    activeTeardownTimeout = null;
  }
  if (activeCelebrationContext) {
    try {
      if (activeCelebrationContext.state !== 'closed') {
        activeCelebrationContext.close();
      }
    } catch {}
    activeCelebrationContext = null;
  }
}

export function playCelebrationFanfare(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Stop any previously playing sound instance
  stopCelebrationFanfare();

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return () => {};

    const ctx = new AudioContextClass();
    activeCelebrationContext = ctx;
    const now = ctx.currentTime;
    const TOTAL_DURATION = 6.0;

    // ─────────────────────────────────────────────────────────────────────────
    // MASTER BUS & SOFT DYNAMICS LIMITER (Gentle, warm, non-intrusive)
    // ─────────────────────────────────────────────────────────────────────────
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-6, now);
    compressor.knee.setValueAtTime(10, now);
    compressor.ratio.setValueAtTime(2.5, now);
    compressor.attack.setValueAtTime(0.01, now);
    compressor.release.setValueAtTime(0.2, now);

    const masterGain = ctx.createGain();
    // Soft, pleasant listening volume (0.38)
    masterGain.gain.setValueAtTime(0.38, now);
    // Smooth, buttery fade-out between 5.2s and 6.0s
    masterGain.gain.setValueAtTime(0.38, now + 5.1);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + TOTAL_DURATION);

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Subtle Stereo Panning Helper
    const createPanner = (panValue: number): AudioNode => {
      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.6, Math.min(0.6, panValue)), now);
        panner.connect(compressor);
        return panner;
      }
      return compressor;
    };

    // Delicate, short-decay ambient space simulation (no long muddy reverb)
    const subtleDelay = ctx.createDelay();
    subtleDelay.delayTime.setValueAtTime(0.22, now);
    const delayGain = ctx.createGain();
    delayGain.gain.setValueAtTime(0.18, now);
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(1800, now);

    subtleDelay.connect(delayFilter);
    delayFilter.connect(delayGain);
    delayGain.connect(subtleDelay);
    delayFilter.connect(compressor);

    const sendToAmbience = (sourceNode: AudioNode, level: number = 0.22) => {
      const sendGain = ctx.createGain();
      sendGain.gain.setValueAtTime(level, now);
      sourceNode.connect(sendGain);
      sendGain.connect(subtleDelay);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // SOUND GENERATOR: DELICATE GLASS BELL & CRYSTAL CHIME
    // Pure sine fundamental with soft warm second harmonic & smooth rounded attack
    // ─────────────────────────────────────────────────────────────────────────
    const playGlassBell = (
      timeOffset: number,
      freq: number,
      options: {
        gain?: number;
        duration?: number;
        pan?: number;
        ambientSend?: number;
      } = {}
    ) => {
      const {
        gain = 0.16,
        duration = 1.1,
        pan = 0.0,
        ambientSend = 0.25,
      } = options;

      const st = now + timeOffset;

      // 1. Fundamental Pure Sine
      const oscFund = ctx.createOscillator();
      oscFund.type = 'sine';
      oscFund.frequency.setValueAtTime(freq, st);

      // 2. Soft Octave Harmonic (Gives bell depth without harshness)
      const oscHarm = ctx.createOscillator();
      oscHarm.type = 'sine';
      oscHarm.frequency.setValueAtTime(freq * 2, st);

      // 3. Gentle Lowpass Filter (ensures silky, rounded warmth)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 3.2, 5000), st);

      const bellGain = ctx.createGain();
      // Smooth 12ms attack prevents any audio clicking
      bellGain.gain.setValueAtTime(0.0001, st);
      bellGain.gain.linearRampToValueAtTime(gain, st + 0.015);
      // Gentle exponential decay
      bellGain.gain.exponentialRampToValueAtTime(0.0001, st + duration);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(gain * 0.22, st);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, st + duration * 0.6);

      const panner = createPanner(pan);

      oscFund.connect(filter);
      oscHarm.connect(harmGain);
      harmGain.connect(filter);
      filter.connect(bellGain);
      bellGain.connect(panner);

      sendToAmbience(bellGain, ambientSend);

      oscFund.start(st);
      oscFund.stop(st + duration + 0.05);
      oscHarm.start(st);
      oscHarm.stop(st + duration + 0.05);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // AMBIENT SYNTH PAD LAYER: WARM ANALOG E MAJ9 SWELL (1.0s – 5.5s)
    // ─────────────────────────────────────────────────────────────────────────
    const playWarmPadChord = (
      startOffset: number,
      chordDur: number,
      chordFreqs: number[],
      peakGain: number = 0.08
    ) => {
      const st = now + startOffset;

      chordFreqs.forEach((freq, idx) => {
        // Dual softly detuned warm triangle oscillators
        [-2.5, 2.5].forEach((detune) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, st);
          osc.detune.setValueAtTime(detune, st);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(750, st);
          filter.Q.setValueAtTime(0.7, st);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.0001, st);
          // Very gentle swell
          gainNode.gain.linearRampToValueAtTime(peakGain, st + 0.6);
          gainNode.gain.setValueAtTime(peakGain, st + chordDur * 0.65);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, st + chordDur);

          const panVal = idx % 2 === 0 ? -0.2 : 0.2;
          osc.connect(filter);
          filter.connect(gainNode);
          gainNode.connect(createPanner(panVal));

          osc.start(st);
          osc.stop(st + chordDur + 0.08);
        });
      });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. 0–1s: GENTLE SPARKLING CHIME (SIGNALS SUCCESS)
    // ─────────────────────────────────────────────────────────────────────────

    // Opening double-strike success chime: E5 (659.25 Hz) + B5 (987.77 Hz)
    playGlassBell(0.00, 659.25, { gain: 0.22, duration: 1.4, pan: -0.1 });
    playGlassBell(0.08, 987.77, { gain: 0.18, duration: 1.3, pan: 0.1 });

    // Crystalline high sparkle arpeggio (micro-chimes)
    playGlassBell(0.22, 1318.5, { gain: 0.12, duration: 0.8, pan: 0.25 }); // E6
    playGlassBell(0.42, 1661.2, { gain: 0.10, duration: 0.8, pan: -0.2 }); // G#6
    playGlassBell(0.68, 1975.5, { gain: 0.09, duration: 0.7, pan: 0.15 }); // B6

    // ─────────────────────────────────────────────────────────────────────────
    // 2. 1–3s: SOFT, WARM BELL TONES WITH SUBTLE SHIMMERING TEXTURE
    // ─────────────────────────────────────────────────────────────────────────

    // Warm Ambient Pad Swell #1: E Maj9 (E3: 164.81, B3: 246.94, F#4: 369.99, G#4: 415.30)
    playWarmPadChord(0.8, 3.2, [164.81, 246.94, 369.99, 415.30], 0.075);

    // Warm bell melody in E Major:
    playGlassBell(1.15, 739.99, { gain: 0.17, duration: 1.3, pan: -0.15 }); // F#5
    playGlassBell(1.65, 830.61, { gain: 0.18, duration: 1.4, pan: 0.15 });  // G#5
    playGlassBell(2.20, 987.77, { gain: 0.19, duration: 1.5, pan: -0.10 }); // B5
    playGlassBell(2.70, 1244.5, { gain: 0.15, duration: 1.2, pan: 0.20 });  // D#6

    // Subtle shimmering crystalline texture notes
    playGlassBell(2.35, 1975.5, { gain: 0.06, duration: 0.6, pan: 0.3 });   // B6
    playGlassBell(2.85, 2489.0, { gain: 0.05, duration: 0.6, pan: -0.25 }); // D#7

    // ─────────────────────────────────────────────────────────────────────────
    // 3. 3–5s: DELICATE, UPLIFTING MUSICAL FLOURISH (CRYSTALLINE NOTES)
    // ─────────────────────────────────────────────────────────────────────────

    // Pad Transition: A Maj9 / E (A3: 220.00, C#4: 277.18, E4: 329.63, G#4: 415.30)
    playWarmPadChord(3.0, 2.7, [220.00, 277.18, 329.63, 415.30], 0.065);

    // Delicate ascending crystalline flourish:
    playGlassBell(3.10, 1108.7, { gain: 0.18, duration: 1.2, pan: -0.15 }); // C#6
    playGlassBell(3.45, 1318.5, { gain: 0.20, duration: 1.3, pan: 0.10 });  // E6
    playGlassBell(3.80, 1479.9, { gain: 0.21, duration: 1.3, pan: -0.10 }); // F#6
    playGlassBell(4.15, 1661.2, { gain: 0.22, duration: 1.4, pan: 0.15 });  // G#6 (Luminous peak)
    playGlassBell(4.55, 1975.5, { gain: 0.18, duration: 1.2, pan: 0.00 });  // B6

    // ─────────────────────────────────────────────────────────────────────────
    // 4. 5–6s: SMOOTH, SOFT FADE-OUT WITH FINAL SATISFYING RESOLUTION CHIME
    // ─────────────────────────────────────────────────────────────────────────

    // Final satisfying resolution chime: Pure harmonic E6 + B5 triad
    playGlassBell(5.00, 659.25, { gain: 0.14, duration: 0.95, pan: -0.05 }); // E5
    playGlassBell(5.00, 987.77, { gain: 0.16, duration: 0.95, pan: 0.05 });  // B5
    playGlassBell(5.00, 1318.5, { gain: 0.18, duration: 0.95, pan: 0.00 });  // E6

    // Delicate celestial high sparkle note (gentle shimmer)
    playGlassBell(5.08, 2637.0, { gain: 0.07, duration: 0.85, pan: 0.15 }); // E7

    // Gracefully clean up AudioContext after exactly 6.0 seconds
    activeTeardownTimeout = setTimeout(() => {
      stopCelebrationFanfare();
    }, (TOTAL_DURATION + 0.1) * 1000);

    return stopCelebrationFanfare;
  } catch (err) {
    console.warn('[CelebrationAudio] Audio playback error or autoplay policy prevented audio:', err);
    return () => {};
  }
}

// Alias for convenience
export const playSoftCelebrationSound = playCelebrationFanfare;
