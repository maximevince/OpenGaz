declare module 'zzfx' {
  /** Play a ZzFX sound; parameters as produced by the ZzFX designer. */
  export function zzfx(...params: (number | undefined)[]): AudioBufferSourceNode | undefined;
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    x?: AudioContext;
    play: (...params: (number | undefined)[]) => AudioBufferSourceNode | undefined;
    buildSamples: (...params: (number | undefined)[]) => number[];
    playSamples: (
      samples: number[][],
      volume?: number,
      rate?: number,
      pan?: number,
      loop?: boolean,
    ) => AudioBufferSourceNode;
  };
}
