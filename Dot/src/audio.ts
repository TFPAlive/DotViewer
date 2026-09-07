export class AudioPlayer {
  private activeAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private amplitudeData: Uint8Array<ArrayBuffer> | null = null;
  private smoothedLevel = 0;
  private readonly pauseAfterPlaybackMs = 1000;

  public constructor(private readonly basePath: string, private readonly filePrefix: string) {}

  public stop(): void {
    this.activeAudio?.pause();
    this.source?.disconnect();
    this.source = null;
    this.activeAudio = null;
    this.smoothedLevel = 0;
  }

  public getLevel(): number {
    if (!this.activeAudio || !this.analyser || !this.amplitudeData) {
      this.smoothedLevel *= 0.8;
      return this.smoothedLevel;
    }

    this.analyser.getByteTimeDomainData(this.amplitudeData);
    let sum = 0;
    for (const sample of this.amplitudeData) {
      const normalizedSample = (sample - 128) / 128;
      sum += normalizedSample * normalizedSample;
    }
    const rms = Math.sqrt(sum / this.amplitudeData.length);
    const targetLevel = Math.min(1, rms * 4);
    this.smoothedLevel += (targetLevel - this.smoothedLevel) * 0.35;
    return this.smoothedLevel;
  }

  public play(tag: string): Promise<void> {
    this.stop();
    const fileName = tag.endsWith('.wav') ? tag : `${tag}.wav`;
    const audio = new Audio(`${this.basePath}${this.filePrefix}${fileName}`);
    this.activeAudio = audio;
    this.connectAnalyser(audio);
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (this.activeAudio === audio) this.activeAudio = null;
        window.setTimeout(resolve, this.pauseAfterPlaybackMs);
      };
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      void audio.play().catch((reason) => {
        console.warn('[audio:failed]', { src: audio.src, reason });
        finish();
      });
    });
  }

  private connectAnalyser(audio: HTMLAudioElement): void {
    this.audioContext ??= new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.amplitudeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.source = this.audioContext.createMediaElementSource(audio);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    void this.audioContext.resume().catch((reason) => {
      console.warn('[audio:context]', reason);
    });
  }
}