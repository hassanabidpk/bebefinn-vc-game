"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioContextConstructor = new () => AudioContext;

interface WebAudioWindow extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  start: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  filterFrequency?: number;
  filterEndFrequency?: number;
  output?: AudioNode;
}

interface NoiseOptions {
  start: number;
  duration: number;
  gain: number;
  filterFrequency: number;
  filterType?: BiquadFilterType;
  output?: AudioNode;
}

function playTone(audioContext: AudioContext, options: ToneOptions) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.frequency.setValueAtTime(options.frequency, options.start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      options.endFrequency,
      options.start + options.duration
    );
  }
  oscillator.type = options.type ?? "sine";

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(options.filterFrequency ?? 2600, options.start);
  if (options.filterEndFrequency) {
    filter.frequency.exponentialRampToValueAtTime(
      options.filterEndFrequency,
      options.start + options.duration
    );
  }
  filter.Q.setValueAtTime(0.6, options.start);

  gainNode.gain.setValueAtTime(0.0001, options.start);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, options.start + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, options.start + options.duration);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(options.output ?? audioContext.destination);

  oscillator.start(options.start);
  oscillator.stop(options.start + options.duration + 0.02);
}

interface VibratoToneOptions extends ToneOptions {
  vibratoRate: number;
  vibratoDepth: number;
}

function playVibratoTone(audioContext: AudioContext, options: VibratoToneOptions) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();

  oscillator.frequency.setValueAtTime(options.frequency, options.start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      options.endFrequency,
      options.start + options.duration
    );
  }
  oscillator.type = options.type ?? "sine";

  lfo.frequency.setValueAtTime(options.vibratoRate, options.start);
  lfoGain.gain.setValueAtTime(options.vibratoDepth, options.start);
  lfo.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(options.filterFrequency ?? 2600, options.start);
  filter.Q.setValueAtTime(0.6, options.start);

  gainNode.gain.setValueAtTime(0.0001, options.start);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, options.start + 0.04);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, options.start + options.duration);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(options.output ?? audioContext.destination);

  oscillator.start(options.start);
  oscillator.stop(options.start + options.duration + 0.02);
  lfo.start(options.start);
  lfo.stop(options.start + options.duration + 0.02);
}

function playNoise(audioContext: AudioContext, options: NoiseOptions) {
  const buffer = audioContext.createBuffer(
    1,
    Math.ceil(audioContext.sampleRate * options.duration),
    audioContext.sampleRate
  );
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  source.buffer = buffer;
  filter.type = options.filterType ?? "bandpass";
  filter.frequency.setValueAtTime(options.filterFrequency, options.start);
  filter.Q.setValueAtTime(1.6, options.start);

  gainNode.gain.setValueAtTime(0.0001, options.start);
  gainNode.gain.exponentialRampToValueAtTime(options.gain, options.start + 0.025);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, options.start + options.duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(options.output ?? audioContext.destination);

  source.start(options.start);
  source.stop(options.start + options.duration + 0.02);
}

function playNotes(
  audioContext: AudioContext,
  notes: number[],
  duration: number,
  gap: number,
  gain: number,
  type: OscillatorType = "sine"
) {
  const now = audioContext.currentTime;

  notes.forEach((frequency, index) => {
    playTone(audioContext, {
      frequency,
      start: now + index * gap,
      duration,
      gain,
      type,
    });
  });
}

function scheduleBackgroundMusic(
  audioContext: AudioContext,
  musicGain: GainNode,
  onLoopComplete: () => void
) {
  const beat = 60 / 104;
  const now = audioContext.currentTime + 0.08;
  const melody = [
    523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440,
    523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25,
  ];
  const harmony = [261.63, 329.63, 392, 523.25];
  const bass = [130.81, 164.81, 196, 164.81, 130.81, 164.81, 196, 261.63];

  melody.forEach((frequency, index) => {
    playTone(audioContext, {
      frequency,
      start: now + index * beat * 0.5,
      duration: beat * 0.44,
      gain: index % 4 === 3 ? 0.074 : 0.058,
      type: "triangle",
      filterFrequency: 3300,
      output: musicGain,
    });
  });

  melody.forEach((frequency, index) => {
    if (index % 4 !== 0) return;

    playTone(audioContext, {
      frequency: frequency * 2,
      start: now + index * beat * 0.5 + 0.03,
      duration: beat * 0.2,
      gain: 0.028,
      type: "sine",
      filterFrequency: 4200,
      output: musicGain,
    });
  });

  harmony.forEach((frequency, index) => {
    playTone(audioContext, {
      frequency,
      start: now + index * beat * 2,
      duration: beat * 1.55,
      gain: 0.04,
      type: "sine",
      filterFrequency: 1300,
      output: musicGain,
    });
  });

  bass.forEach((frequency, index) => {
    playTone(audioContext, {
      frequency,
      start: now + index * beat,
      duration: beat * 0.34,
      gain: 0.052,
      type: "square",
      filterFrequency: 620,
      output: musicGain,
    });
  });

  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5].forEach((offset, index) => {
    playTone(audioContext, {
      frequency: index % 2 === 0 ? 1174.66 : 1318.51,
      start: now + offset * beat,
      duration: 0.16,
      gain: 0.04,
      type: "sine",
      filterFrequency: 5200,
      output: musicGain,
    });
  });

  return window.setTimeout(onLoopComplete, beat * 8 * 1000);
}

const ANIMAL_SOUND_FILES: Record<string, string> = {
  cat: "/sounds/cat.mp3",
  dog: "/sounds/dog.mp3",
  elephant: "/sounds/elephant.mp3",
  fish: "/sounds/fish.mp3",
  gorilla: "/sounds/gorilla.mp3",
  jellyfish: "/sounds/jellyfish.mp3",
  lion: "/sounds/lion.mp3",
  turtle: "/sounds/turtle.mp3",
  whale: "/sounds/whale.mp3",
  zebra: "/sounds/zebra.mp3",
};

export function useGameAudio() {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMusicPlayingRef = useRef(false);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const animalAudioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAnimalAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;

      if (!AudioContextClass) return null;

      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const clearMusicTimer = useCallback(() => {
    if (musicTimerRef.current) {
      clearTimeout(musicTimerRef.current);
      musicTimerRef.current = null;
    }
  }, []);

  const playMusicLoop = useCallback(() => {
    const audioContext = audioContextRef.current;
    const musicGain = musicGainRef.current;

    if (!audioContext || !musicGain || !isMusicPlayingRef.current) return;

    clearMusicTimer();
    musicTimerRef.current = scheduleBackgroundMusic(audioContext, musicGain, playMusicLoop);
  }, [clearMusicTimer]);

  const startBackgroundMusic = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    if (!musicGainRef.current) {
      musicGainRef.current = audioContext.createGain();
      musicGainRef.current.gain.setValueAtTime(0.0001, audioContext.currentTime);
      musicGainRef.current.connect(audioContext.destination);
    }

    isMusicPlayingRef.current = true;
    setIsMusicPlaying(true);

    const gain = musicGainRef.current.gain;
    gain.cancelScheduledValues(audioContext.currentTime);
    gain.setValueAtTime(Math.max(gain.value, 0.0001), audioContext.currentTime);
    gain.linearRampToValueAtTime(0.82, audioContext.currentTime + 0.35);

    playMusicLoop();
  }, [getAudioContext, playMusicLoop]);

  const stopBackgroundMusic = useCallback(() => {
    const audioContext = audioContextRef.current;

    isMusicPlayingRef.current = false;
    setIsMusicPlaying(false);
    clearMusicTimer();

    if (!audioContext || !musicGainRef.current) return;

    const gain = musicGainRef.current.gain;
    gain.cancelScheduledValues(audioContext.currentTime);
    gain.setValueAtTime(gain.value, audioContext.currentTime);
    gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
  }, [clearMusicTimer]);

  const toggleBackgroundMusic = useCallback(() => {
    if (isMusicPlayingRef.current) {
      stopBackgroundMusic();
      return;
    }

    startBackgroundMusic();
  }, [startBackgroundMusic, stopBackgroundMusic]);

  const playStart = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    playNotes(audioContext, [523.25, 659.25, 783.99, 1046.5], 0.13, 0.075, 0.075);
  }, [getAudioContext]);

  const playTap = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    playNotes(audioContext, [880, 1174.66], 0.08, 0.045, 0.045);
  }, [getAudioContext]);

  const playNext = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    playNotes(audioContext, [587.33, 739.99, 987.77], 0.1, 0.055, 0.055);
  }, [getAudioContext]);

  const playPrevious = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    playNotes(audioContext, [783.99, 659.25], 0.09, 0.055, 0.045);
  }, [getAudioContext]);

  const playCelebrate = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    playNotes(
      audioContext,
      [523.25, 659.25, 783.99, 1046.5, 1318.51, 1046.5],
      0.14,
      0.08,
      0.065,
      "triangle"
    );
  }, [getAudioContext]);

  const playGuessSuspense = useCallback((letterIndex: number) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const baseNotes = [392, 440, 493.88, 523.25, 587.33, 659.25];
    const base = baseNotes[letterIndex % baseNotes.length];

    playTone(audioContext, {
      frequency: base / 2,
      endFrequency: base * 0.98,
      start: now,
      duration: 0.7,
      gain: 0.055,
      type: "triangle",
      filterFrequency: 700,
      filterEndFrequency: 2400,
    });

    [0, 0.18, 0.36].forEach((offset, index) => {
      playTone(audioContext, {
        frequency: base * (1 + index * 0.13),
        start: now + offset,
        duration: 0.12,
        gain: 0.038,
        type: "sine",
        filterFrequency: 3000,
      });
    });

    playTone(audioContext, {
      frequency: base * 1.5,
      endFrequency: base * 2,
      start: now + 0.56,
      duration: 0.22,
      gain: 0.05,
      type: "sine",
      filterFrequency: 4200,
      filterEndFrequency: 5600,
    });
  }, [getAudioContext]);

  const playLetterCall = useCallback((letterIndex: number) => {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const root = scale[letterIndex % scale.length];
    const third = scale[(letterIndex + 2) % scale.length];
    const fifth = scale[(letterIndex + 3) % scale.length];

    playTone(audioContext, {
      frequency: root / 2,
      endFrequency: root,
      start: now,
      duration: 0.18,
      gain: 0.09,
      type: "triangle",
      filterFrequency: 1200,
      filterEndFrequency: 2800,
    });

    [root, third, fifth].forEach((frequency, index) => {
      playTone(audioContext, {
        frequency,
        start: now + 0.07 + index * 0.055,
        duration: 0.14,
        gain: index === 2 ? 0.085 : 0.068,
        type: "sine",
        filterFrequency: 4200,
      });
    });

    playTone(audioContext, {
      frequency: fifth * 2,
      endFrequency: root * 2,
      start: now + 0.26,
      duration: 0.16,
      gain: 0.052,
      type: "triangle",
      filterFrequency: 5200,
      filterEndFrequency: 2600,
    });
  }, [getAudioContext]);

  const playAnimalSound = useCallback((word: string) => {
    if (typeof window === "undefined") return;

    const key = word.toLowerCase();
    const file = ANIMAL_SOUND_FILES[key];

    if (file) {
      // Stop any currently playing animal sound
      if (currentAnimalAudioRef.current) {
        currentAnimalAudioRef.current.pause();
        currentAnimalAudioRef.current.currentTime = 0;
      }

      let audio = animalAudioCacheRef.current.get(key);
      if (!audio) {
        audio = new Audio(file);
        audio.preload = "auto";
        audio.volume = 0.85;
        animalAudioCacheRef.current.set(key, audio);
      }

      audio.currentTime = 0;
      currentAnimalAudioRef.current = audio;
      void audio.play().catch(() => {
        // Autoplay block — fall through silently
      });
      return;
    }

    // Fallback to synthesized sound for unmapped animals
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;

    switch (key) {
      case "_legacy_cat":
        // mrow: rises then falls, with breathy formant
        playVibratoTone(audioContext, {
          frequency: 520,
          endFrequency: 760,
          start: now,
          duration: 0.22,
          gain: 0.09,
          type: "triangle",
          filterFrequency: 3000,
          vibratoRate: 7,
          vibratoDepth: 18,
        });
        playVibratoTone(audioContext, {
          frequency: 760,
          endFrequency: 420,
          start: now + 0.22,
          duration: 0.42,
          gain: 0.085,
          type: "triangle",
          filterFrequency: 2800,
          vibratoRate: 6,
          vibratoDepth: 22,
        });
        playTone(audioContext, {
          frequency: 1140,
          endFrequency: 760,
          start: now + 0.05,
          duration: 0.45,
          gain: 0.028,
          type: "sine",
          filterFrequency: 4200,
        });
        break;
      case "dog":
        // two crisp woofs: bark transient + low body
        [0, 0.26].forEach((offset) => {
          playNoise(audioContext, {
            start: now + offset,
            duration: 0.06,
            gain: 0.09,
            filterFrequency: 1800,
            filterType: "bandpass",
          });
          playTone(audioContext, {
            frequency: 320,
            endFrequency: 140,
            start: now + offset,
            duration: 0.18,
            gain: 0.13,
            type: "sawtooth",
            filterFrequency: 1100,
            filterEndFrequency: 600,
          });
          playTone(audioContext, {
            frequency: 180,
            endFrequency: 110,
            start: now + offset + 0.02,
            duration: 0.18,
            gain: 0.08,
            type: "square",
            filterFrequency: 700,
          });
        });
        break;
      case "elephant":
        // trumpet: rising horn with strong harmonic stack
        playTone(audioContext, {
          frequency: 280,
          endFrequency: 880,
          start: now,
          duration: 0.18,
          gain: 0.06,
          type: "sawtooth",
          filterFrequency: 1400,
          filterEndFrequency: 3200,
        });
        playVibratoTone(audioContext, {
          frequency: 880,
          endFrequency: 760,
          start: now + 0.18,
          duration: 0.62,
          gain: 0.11,
          type: "sawtooth",
          filterFrequency: 3200,
          vibratoRate: 9,
          vibratoDepth: 30,
        });
        playVibratoTone(audioContext, {
          frequency: 1320,
          endFrequency: 1140,
          start: now + 0.2,
          duration: 0.6,
          gain: 0.05,
          type: "triangle",
          filterFrequency: 4200,
          vibratoRate: 9,
          vibratoDepth: 28,
        });
        playTone(audioContext, {
          frequency: 220,
          start: now + 0.18,
          duration: 0.6,
          gain: 0.045,
          type: "sine",
          filterFrequency: 800,
        });
        break;
      case "fish":
        // bubble pops rising
        [0, 0.1, 0.22, 0.36, 0.52].forEach((offset, index) => {
          playTone(audioContext, {
            frequency: 600 + index * 180,
            endFrequency: 1200 + index * 240,
            start: now + offset,
            duration: 0.08,
            gain: 0.06,
            type: "sine",
            filterFrequency: 4800,
          });
          playNoise(audioContext, {
            start: now + offset,
            duration: 0.05,
            gain: 0.025,
            filterFrequency: 3200,
            filterType: "bandpass",
          });
        });
        break;
      case "jellyfish":
        // shimmer chord
        [523.25, 659.25, 783.99, 987.77].forEach((freq, index) => {
          playVibratoTone(audioContext, {
            frequency: freq,
            start: now + index * 0.06,
            duration: 0.7 - index * 0.05,
            gain: 0.045,
            type: "sine",
            filterFrequency: 5200,
            vibratoRate: 5,
            vibratoDepth: 6,
          });
        });
        playTone(audioContext, {
          frequency: 1568,
          endFrequency: 2093,
          start: now + 0.3,
          duration: 0.5,
          gain: 0.02,
          type: "sine",
          filterFrequency: 6400,
        });
        break;
      case "gorilla":
        // hoot oo-oo
        [0, 0.34].forEach((offset) => {
          playTone(audioContext, {
            frequency: 180,
            endFrequency: 240,
            start: now + offset,
            duration: 0.06,
            gain: 0.04,
            type: "sine",
            filterFrequency: 700,
          });
          playVibratoTone(audioContext, {
            frequency: 240,
            endFrequency: 200,
            start: now + offset + 0.05,
            duration: 0.24,
            gain: 0.11,
            type: "sine",
            filterFrequency: 800,
            vibratoRate: 6,
            vibratoDepth: 8,
          });
          playTone(audioContext, {
            frequency: 480,
            endFrequency: 400,
            start: now + offset + 0.05,
            duration: 0.22,
            gain: 0.04,
            type: "sine",
            filterFrequency: 1200,
          });
        });
        break;
      case "lion":
        // friendly roar: low growl with vibrato + noise body
        playNoise(audioContext, {
          start: now,
          duration: 0.78,
          gain: 0.075,
          filterFrequency: 480,
          filterType: "lowpass",
        });
        playVibratoTone(audioContext, {
          frequency: 110,
          endFrequency: 78,
          start: now,
          duration: 0.78,
          gain: 0.13,
          type: "sawtooth",
          filterFrequency: 800,
          vibratoRate: 18,
          vibratoDepth: 14,
        });
        playVibratoTone(audioContext, {
          frequency: 220,
          endFrequency: 156,
          start: now + 0.05,
          duration: 0.7,
          gain: 0.06,
          type: "sawtooth",
          filterFrequency: 1100,
          vibratoRate: 18,
          vibratoDepth: 12,
        });
        break;
      case "turtle":
        // soft chirp + slow breath
        playTone(audioContext, {
          frequency: 380,
          endFrequency: 540,
          start: now,
          duration: 0.18,
          gain: 0.07,
          type: "sine",
          filterFrequency: 2200,
        });
        playTone(audioContext, {
          frequency: 540,
          endFrequency: 320,
          start: now + 0.2,
          duration: 0.22,
          gain: 0.06,
          type: "sine",
          filterFrequency: 1800,
        });
        playNoise(audioContext, {
          start: now + 0.42,
          duration: 0.28,
          gain: 0.03,
          filterFrequency: 700,
          filterType: "lowpass",
        });
        break;
      case "whale":
        // long song: rising glide with deep vibrato + harmonic
        playVibratoTone(audioContext, {
          frequency: 180,
          endFrequency: 520,
          start: now,
          duration: 1.1,
          gain: 0.1,
          type: "sine",
          filterFrequency: 2200,
          vibratoRate: 5,
          vibratoDepth: 14,
        });
        playVibratoTone(audioContext, {
          frequency: 360,
          endFrequency: 1040,
          start: now + 0.1,
          duration: 1.0,
          gain: 0.045,
          type: "sine",
          filterFrequency: 3000,
          vibratoRate: 5,
          vibratoDepth: 18,
        });
        playVibratoTone(audioContext, {
          frequency: 520,
          endFrequency: 220,
          start: now + 1.05,
          duration: 0.9,
          gain: 0.075,
          type: "sine",
          filterFrequency: 1800,
          vibratoRate: 4,
          vibratoDepth: 12,
        });
        break;
      case "zebra":
        // whinny: rapid pitch wobble descending
        playVibratoTone(audioContext, {
          frequency: 520,
          endFrequency: 880,
          start: now,
          duration: 0.16,
          gain: 0.08,
          type: "sawtooth",
          filterFrequency: 2400,
          vibratoRate: 22,
          vibratoDepth: 40,
        });
        playVibratoTone(audioContext, {
          frequency: 880,
          endFrequency: 360,
          start: now + 0.16,
          duration: 0.5,
          gain: 0.1,
          type: "sawtooth",
          filterFrequency: 2200,
          vibratoRate: 26,
          vibratoDepth: 60,
        });
        playNoise(audioContext, {
          start: now + 0.16,
          duration: 0.5,
          gain: 0.045,
          filterFrequency: 1400,
          filterType: "bandpass",
        });
        break;
      default:
        break;
    }
  }, [getAudioContext]);

  useEffect(() => {
    const cache = animalAudioCacheRef.current;
    return () => {
      clearMusicTimer();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      cache.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      cache.clear();
      currentAnimalAudioRef.current = null;
    };
  }, [clearMusicTimer]);

  return {
    isMusicPlaying,
    playAnimalSound,
    playCelebrate,
    playGuessSuspense,
    playLetterCall,
    playNext,
    playPrevious,
    playStart,
    playTap,
    startBackgroundMusic,
    stopBackgroundMusic,
    toggleBackgroundMusic,
  };
}
