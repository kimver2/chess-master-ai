class SoundManager {
  private enabled: boolean = true;
  private haptics: boolean = true;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    try {
      this.enabled = localStorage.getItem('chess_sound_enabled') !== 'false';
      this.haptics = localStorage.getItem('chess_haptics_enabled') !== 'false';
    } catch {
      this.enabled = true;
      this.haptics = true;
    }
  }

  public setSoundEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('chess_sound_enabled', String(val));
    } catch {}
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  public setHapticsEnabled(val: boolean) {
    this.haptics = val;
    try {
      localStorage.setItem('chess_haptics_enabled', String(val));
    } catch {}
  }

  public isHapticsEnabled(): boolean {
    return this.haptics;
  }

  private playSound(name: string) {
    if (!this.enabled) return;
    try {
      let audio = this.sounds.get(name);
      if (!audio) {
        audio = new Audio(`/sounds/${name}.mp3`);
        this.sounds.set(name, audio);
      } else {
        audio.currentTime = 0;
      }
      audio.play().catch(() => {
        // Autoplay policy or muted
      });
    } catch {}
  }

  private vibrate(pattern: number | number[]) {
    if (!this.haptics) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }

  public move() {
    this.playSound('Move');
    this.vibrate(15);
  }

  public capture() {
    this.playSound('Capture');
    this.vibrate([25, 30, 25]);
  }

  public check() {
    this.playSound('Check');
    this.vibrate([35, 50, 35]);
  }

  public victory() {
    this.playSound('Victory');
    this.vibrate([40, 60, 40, 80, 100]);
  }

  public defeat() {
    this.playSound('Defeat');
    this.vibrate([60, 80, 60]);
  }

  public draw() {
    this.playSound('Draw');
    this.vibrate([30, 30, 30]);
  }

  public lowTime() {
    this.playSound('LowTime');
    this.vibrate(12);
  }

  public gameStart() {
    this.playSound('Move');
    this.vibrate([20, 40, 20]);
  }
}

export const soundManager = new SoundManager();
