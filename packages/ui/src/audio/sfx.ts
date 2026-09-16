/**
 * Interface sounds (ui-style-guide.md rule 10): short, quiet and few.
 *
 * The three the guide allows are synthesized with the Web Audio API rather than shipped as files:
 * a click, an alert and an event opening, each a fraction of a second of a plain waveform through
 * a falling gain envelope. Nothing is downloaded, nothing is licensed, and the result is the dry
 * beep of a console rather than a sample from a sound library.
 *
 * Like the music, they need a user gesture first; before it, every call is a no-op.
 */

export const SOUNDS = ["click", "alert", "event"] as const;
export type SoundName = (typeof SOUNDS)[number];

interface Tone {
  /** Frequency in hertz, one entry per step of the sound. */
  steps: number[];
  /** Seconds per step. */
  step: number;
  type: OscillatorType;
  /** Peak gain before the player's own volume, kept low: these sit under the music. */
  gain: number;
}

const TONES: Readonly<Record<SoundName, Tone>> = {
  // A single dry tick.
  click: { steps: [880], step: 0.03, type: "square", gain: 0.12 },
  // Two falling notes: something wants attention.
  alert: { steps: [660, 440], step: 0.09, type: "square", gain: 0.16 },
  // Two rising notes: a window opened.
  event: { steps: [520, 780], step: 0.07, type: "triangle", gain: 0.14 },
};

type ContextFactory = () => AudioContext | null;

function defaultFactory(): AudioContext | null {
  const ctor =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  return ctor === undefined ? null : new ctor();
}

/** The interface-sound channel: one audio context, created on the first gesture and reused. */
export class SoundBank {
  private context: AudioContext | null = null;
  private started = false;
  private volume = 0.6;
  private muted = false;

  constructor(private readonly factory: ContextFactory = defaultFactory) {}

  get unlocked(): boolean {
    return this.started;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /** Called from the first user gesture, with the same meaning as the music player's unlock. */
  unlock(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    try {
      this.context = this.factory();
      void this.context?.resume?.();
    } catch {
      // A browser without the Web Audio API plays no interface sounds; everything else still works.
      this.context = null;
    }
  }

  play(name: SoundName): void {
    const context = this.context;
    const tone = TONES[name];
    if (!this.started || context === null || this.muted || this.volume <= 0) {
      return;
    }
    try {
      const now = context.currentTime;
      const gain = context.createGain();
      gain.connect(context.destination);
      const peak = tone.gain * this.volume;
      gain.gain.setValueAtTime(peak, now);
      const duration = tone.step * tone.steps.length;
      // A linear fall to silence: an envelope, not a click at the end of the buffer.
      gain.gain.linearRampToValueAtTime(0.0001, now + duration);
      const oscillator = context.createOscillator();
      oscillator.type = tone.type;
      tone.steps.forEach((frequency, index) => {
        oscillator.frequency.setValueAtTime(frequency, now + index * tone.step);
      });
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch {
      // Sound is never load-bearing: a failure here must not reach the player as an error.
    }
  }

  dispose(): void {
    void this.context?.close?.();
    this.context = null;
    this.started = false;
  }
}
