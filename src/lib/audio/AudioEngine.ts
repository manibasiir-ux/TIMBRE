import { dbToGain } from "./bands";

/**
 * The single global audio graph, FR-02.
 *
 *   source -> sourceGain -> bus(bed|sfx) -> master -> limiter -> analyser
 *     -> destination
 *
 * One AudioContext for the whole site. Browsers cap how many a page may hold
 * and each carries its own hardware clock, so a second one would drift against
 * the first and make the analyser disagree with what is audible.
 *
 * Nothing here touches a browser API at module scope: the context is built on
 * first use, which must be inside the user gesture that satisfies the autoplay
 * policy (FR-01). Constructing it earlier yields a context stuck in "suspended"
 * that never recovers.
 *
 * The analyser sits after the master gain so it measures what the listener
 * actually hears, including ducking, mute and limiting. Placing it before would
 * leave the sculpture reacting to audio that is not playing.
 *
 * ## Why there is a limiter
 *
 * The desk is five channels summing into one master at unity. Each asset is
 * clean on its own -- the bed peaks at -8.1 dBFS and each stem near -4 dBFS,
 * with no sample at full scale in any file -- but they add. With every fader up
 * the peaks reach about 2.91, or +9.3 dBFS, and `destination` hard-clips
 * anything outside [-1, 1]. Hard clipping is broadband harmonic distortion,
 * which is why the reported symptom was harsh static that appeared only as the
 * mix got louder.
 *
 * Lowering the master instead would punish the common case: the default mix is
 * the room alone at -8.1 dBFS, which never clipped and should not get quieter
 * to protect a combination the visitor may never build. A limiter costs nothing
 * until it is needed, and the threshold is set above a single channel's peak so
 * that a lone stem passes through untouched.
 */

export type AudioBus = "bed" | "sfx";

export const FFT_SIZE = 2048;
export const SMOOTHING_TIME_CONSTANT = 0.82;

/** FR-12: the bed drops this far while a contextual player is active. */
export const DUCK_DB = -12;
export const DUCK_SECONDS = 0.35;

/**
 * Master limiting, so no combination of faders can clip the output.
 *
 * Every asset is clean on its own -- no file holds a single sample at full
 * scale -- but the desk is five channels summing into one master at unity and
 * `destination` hard-clips outside [-1, 1]. Summing the real samples the way the
 * desk starts them gives a peak of 2.69 (+8.61 dBFS) with every fader at 100,
 * clipping 21,089 of 512,000 samples per loop; the room and any two stems
 * already reach +3.69 dBFS. Three faders is enough, and the desk invites exactly
 * that. Hard clipping is broadband harmonic distortion, which is the harsh
 * static that gets worse as the mix gets louder.
 *
 * These numbers were measured against the shipped WAVs, and so were the
 * settings. The interesting result is that the threshold wants to be LOW. A
 * limiter doing a little continuously is far cleaner than one occasionally
 * doing a lot: measured as error energy against the same mix simply turned down,
 * a -3 dB threshold scores -6.28 dB and leaves 653 samples clipped, while -8 dB
 * scores -7.76 dB and leaves 2. Buying the last two samples by shortening the
 * attack is a bad trade -- 0.3 ms reaches zero clipping but scores -1.62 dB,
 * barely better than the clipping it replaces, because the envelope starts
 * modulating the drones themselves. So: low threshold, unhurried attack.
 *
 * -8 dB is chosen over a lower threshold because it leaves the bed's -8.14 dBFS
 * peak alone, and the bed alone is the default mix -- what a visitor hears
 * unless they open the desk and push something up. That margin is 0.14 dB, which
 * is thin enough to lose by accident, so `masterLimiter.test.ts` asserts it
 * against the actual files rather than trusting this comment.
 *
 * Ratio 20:1 with a hard knee is a limiter rather than a compressor: it holds a
 * ceiling instead of shaping dynamics. A 250 ms release keeps gain movement
 * below the threshold of audible pumping.
 */
export const LIMITER_THRESHOLD_DB = -8;
export const LIMITER_KNEE_DB = 0;
export const LIMITER_RATIO = 20;
export const LIMITER_ATTACK_SECONDS = 0.003;
export const LIMITER_RELEASE_SECONDS = 0.25;

const LOAD_ATTEMPTS = 3; // one attempt plus the two retries in edge case E6
const RETRY_BASE_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type LoadFailure = { id: string; url: string; error: unknown };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buses: Record<AudioBus, GainNode> | null = null;
  // Left uninferred on purpose. Annotating this `Uint8Array` widens its buffer
  // to ArrayBufferLike, which no longer satisfies getByteFrequencyData now that
  // the typed arrays are generic over their backing buffer.
  private frequencyData = new Uint8Array(FFT_SIZE / 2);

  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly voices = new Map<
    string,
    { source: AudioBufferSourceNode; gain: GainNode }
  >();

  /** Nested ducks must not un-duck early when only one player stops. */
  private duckDepth = 0;
  private muted = false;
  private mixEngaged = false;
  private suspendedByVisibility = false;
  private visibilityHandler: (() => void) | null = null;

  onLoadFailure: ((failure: LoadFailure) => void) | null = null;

  get isInitialised(): boolean {
    return this.ctx !== null;
  }

  /**
   * Whether the analyser is reading anything worth looking at.
   *
   * The graph is bed/sfx -> master -> limiter -> analyser -> destination, so
   * muting zeroes
   * the master and the analyser reads silence. Anything driving visuals from
   * the analyser therefore has to ask this rather than `isInitialised`: the
   * context still exists while muted, it just has nothing in it, and a sculpture
   * that freezes on mute looks broken rather than quiet.
   */
  get isAudible(): boolean {
    return this.ctx !== null && !this.muted && this.voices.size > 0;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48_000;
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Builds the graph on first call. Must run inside a user gesture.
   * Returns null during SSR or where Web Audio is unavailable.
   */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === "undefined") return null;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = 1;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER_THRESHOLD_DB;
    limiter.knee.value = LIMITER_KNEE_DB;
    limiter.ratio.value = LIMITER_RATIO;
    limiter.attack.value = LIMITER_ATTACK_SECONDS;
    limiter.release.value = LIMITER_RELEASE_SECONDS;

    const bed = ctx.createGain();
    const sfx = ctx.createGain();
    bed.connect(master);
    sfx.connect(master);
    master.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.limiter = limiter;
    this.analyser = analyser;
    this.buses = { bed, sfx };
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);

    this.attachVisibilityHandling();

    return ctx;
  }

  /**
   * Edge case E9: a backgrounded tab should not keep an audio clock running.
   * Only a context this code suspended is resumed, so a tab returning to the
   * foreground never starts audio the listener paused themselves.
   */
  private attachVisibilityHandling(): void {
    if (this.visibilityHandler || typeof document === "undefined") return;

    this.visibilityHandler = () => {
      const ctx = this.ctx;
      if (!ctx) return;

      if (document.hidden) {
        if (ctx.state === "running") {
          this.suspendedByVisibility = true;
          void ctx.suspend();
        }
      } else if (this.suspendedByVisibility) {
        this.suspendedByVisibility = false;
        void ctx.resume();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  /** Call from the consent gate's click handler. */
  async resume(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  }

  async suspend(): Promise<void> {
    if (this.ctx?.state === "running") await this.ctx.suspend();
  }

  /**
   * Fetches and decodes a stem, retrying twice with exponential backoff before
   * reporting failure (edge case E6). Resolves to null rather than throwing:
   * a missing stem degrades the transport, it does not break the page.
   */
  async load(id: string, url: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id);
    if (cached) return cached;

    const ctx = this.ensure();
    if (!ctx) return null;

    let lastError: unknown = null;

    for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const encoded = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(encoded);
        this.buffers.set(id, buffer);
        return buffer;
      } catch (error) {
        lastError = error;
        if (attempt < LOAD_ATTEMPTS - 1) {
          await delay(RETRY_BASE_MS * 2 ** attempt);
        }
      }
    }

    this.onLoadFailure?.({ id, url, error: lastError });
    return null;
  }

  has(id: string): boolean {
    return this.buffers.has(id);
  }

  isPlaying(id: string): boolean {
    return this.voices.has(id);
  }

  /**
   * `as` lets one buffer play under a second voice name.
   *
   * Voices are keyed by id and `play` stops whatever is already under that key,
   * so two features auditioning the same file fight over one slot. The work
   * rail and the mixing desk both play the case stems: the rail's audition was
   * silently destroying the desk's channel, and stopping it on the way out left
   * the visitor's mix gone and their faders driving voices that no longer
   * existed — which reads as the desk going dead rather than as the rail having
   * done anything.
   *
   * Naming the rail's voices separately lets both hold the same buffer without
   * either owning it.
   */
  play(
    id: string,
    {
      loop = false,
      bus = "bed" as AudioBus,
      fadeSeconds = 0,
      gain = 1,
      offsetSeconds = 0,
      as = id,
    } = {},
  ): boolean {
    const ctx = this.ensure();
    const buffer = this.buffers.get(id);
    if (!ctx || !buffer || !this.buses) return false;

    this.stop(as);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const voiceGain = ctx.createGain();
    // Mute is not applied here. It lives on the master gain, which is the only
    // node that has to be undone to restore sound. Baking it into a voice too
    // made it one-way: `setMuted` ramps the master back to 1 and nothing ever
    // lifts a voice that was zeroed on the way in, so anything started or
    // adjusted while muted stayed silent for the rest of the session with its
    // fader still reading full.
    const target = gain;

    if (fadeSeconds > 0) {
      voiceGain.gain.setValueAtTime(0, ctx.currentTime);
      voiceGain.gain.linearRampToValueAtTime(
        target,
        ctx.currentTime + fadeSeconds,
      );
    } else {
      voiceGain.gain.value = target;
    }

    source.connect(voiceGain);
    voiceGain.connect(this.buses[bus]);

    // FR-13's `?t=` lands here. Clamped and wrapped rather than trusted: the
    // value comes from a URL anyone can edit, and `start()` throws on a
    // negative offset and plays silence forever on one past the end.
    const duration = buffer.duration;
    const offset =
      Number.isFinite(offsetSeconds) && offsetSeconds > 0
        ? offsetSeconds % duration
        : 0;
    source.start(0, offset);

    // A non-looping voice must unregister itself, or isPlaying lies forever.
    source.onended = () => {
      if (this.voices.get(as)?.source === source) this.voices.delete(as);
    };

    this.voices.set(as, { source, gain: voiceGain });
    return true;
  }

  stop(id: string, fadeSeconds = 0): void {
    const voice = this.voices.get(id);
    const ctx = this.ctx;
    if (!voice || !ctx) return;

    this.voices.delete(id);
    voice.source.onended = null;

    if (fadeSeconds > 0) {
      const end = ctx.currentTime + fadeSeconds;
      voice.gain.gain.cancelScheduledValues(ctx.currentTime);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, ctx.currentTime);
      voice.gain.gain.linearRampToValueAtTime(0, end);
      voice.source.stop(end);
    } else {
      try {
        voice.source.stop();
      } catch {
        // Already stopped; the spec allows stop() to throw in that state.
      }
    }
  }

  stopAll(fadeSeconds = 0): void {
    for (const id of [...this.voices.keys()]) this.stop(id, fadeSeconds);
  }

  /**
   * Crossfades the bed to a different stem, per user flow A step 6.
   *
   * Refused while the desk owns the bed bus. The rail stopping every voice to
   * swap in one stem is right when the bed is a single track and destructive
   * when the visitor has built a mix of their own — losing their fader
   * positions to a scroll they did not connect to the sound.
   */
  crossfadeBed(toId: string, seconds = 1.2): boolean {
    if (this.mixEngaged) return false;
    for (const id of [...this.voices.keys()]) this.stop(id, seconds);
    return this.play(toId, { loop: true, bus: "bed", fadeSeconds: seconds });
  }

  /**
   * Hands the bed bus to the mixing desk.
   *
   * While engaged the rail stops swapping the bed, because the desk's faders
   * are the authority on what is audible.
   */
  setMixEngaged(engaged: boolean): void {
    this.mixEngaged = engaged;
  }

  get isMixEngaged(): boolean {
    return this.mixEngaged;
  }

  /**
   * Rides an already-playing voice's gain.
   *
   * Ramped rather than set, because a fader written straight to `gain.value`
   * steps the waveform and clicks. 60ms is below the threshold where a drag
   * feels laggy and above the one where it crackles.
   */
  setVoiceGain(id: string, value: number, seconds = 0.06): boolean {
    const voice = this.voices.get(id);
    const ctx = this.ctx;
    if (!voice || !ctx) return false;

    // Not gated on mute, for the reason given in `play`: the master is the one
    // place mute is applied, so a fader always writes the value it shows.
    const target = Math.max(0, Math.min(1, value));
    const now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(target, now + seconds);
    return true;
  }

  /**
   * Starts a looping voice at a given level if it is not already running.
   *
   * Every channel on the desk plays continuously from the moment the mixer is
   * engaged, most of them at zero. Starting them together is what keeps them
   * phase-locked: the generator writes whole numbers of cycles per loop, so
   * sources begun in the same call stay in step indefinitely. Starting one
   * later, when its fader is first raised, would drop it in at whatever phase
   * the others happened to be at.
   */
  ensureVoice(id: string, gain: number, bus: AudioBus = "bed"): boolean {
    // An existing voice is brought to the asked-for level rather than left
    // wherever it happened to be. The bed is the case that needs this: the
    // sound toggle starts it at full when consent is granted, so by the time
    // the desk engages, channel 01 already exists at a gain the Room fader
    // never chose. Returning early on `has` alone left the fader and the sound
    // disagreeing from the first frame.
    if (this.voices.has(id)) {
      this.setVoiceGain(id, gain);
      return true;
    }
    return this.play(id, { loop: true, bus, gain });
  }

  /** FR-12. Balanced by an equal number of releaseDuck calls. */
  duck(db = DUCK_DB, seconds = DUCK_SECONDS): void {
    this.duckDepth += 1;
    if (this.duckDepth === 1) this.rampBed(dbToGain(db), seconds);
  }

  releaseDuck(seconds = DUCK_SECONDS): void {
    this.duckDepth = Math.max(0, this.duckDepth - 1);
    if (this.duckDepth === 0) this.rampBed(1, seconds);
  }

  private rampBed(value: number, seconds: number): void {
    const ctx = this.ctx;
    const bed = this.buses?.bed;
    if (!ctx || !bed) return;

    bed.gain.cancelScheduledValues(ctx.currentTime);
    bed.gain.setValueAtTime(bed.gain.value, ctx.currentTime);
    bed.gain.linearRampToValueAtTime(value, ctx.currentTime + seconds);
  }

  setMuted(muted: boolean, seconds = 0.12): void {
    this.muted = muted;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + seconds);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Byte spectrum for the current frame. Returns the same array every call so
   * the render loop allocates nothing; treat it as read-only and transient.
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return this.frequencyData;
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /** Root-mean-square of the current output, for the transport VU meters. */
  getLevel(): number {
    const data = this.getFrequencyData();
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length) / 255;
  }

  dispose(): void {
    this.stopAll();
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    }
    this.visibilityHandler = null;
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.limiter = null;
    this.analyser = null;
    this.buses = null;
    this.buffers.clear();
    this.voices.clear();
    this.duckDepth = 0;
  }
}

export const audioEngine = new AudioEngine();
