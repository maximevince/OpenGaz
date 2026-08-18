/**
 * Balance simulation (not a real test). Run with:  SIM=1 pnpm vitest run sim
 * Prints game length / outcome stats for AI-vs-AI games so we can tune the economy.
 */
import { describe, it } from 'vitest';
import { netWorth, newGame, runAi, type GameState } from './index';

const enabled = !!process.env.SIM;

describe.skipIf(!enabled)('simulation', () => {
  it('AI vs AI statistics', { timeout: 600000 }, () => {
    const N = Number(process.env.SIM_N ?? 20);
    const lengths: number[] = [];
    let bankrupt = 0;
    let wins = 0;
    const styleWins: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      let s: GameState = newGame({ seed: `sim-${i}`, level: 'novice', humans: [], ai: 6 });
      while (s.phase !== 'gameOver' && s.week < 300) s = runAi(s);
      lengths.push(s.week);
      bankrupt += s.companies.filter((c) => c.bankrupt).length;
      if (s.winner !== null) {
        wins++;
        const st = s.companies[s.winner]!.aiStyle ?? '?';
        styleWins[st] = (styleWins[st] ?? 0) + 1;
      }
      if (i === 0) {
        console.log(
          'sample final:',
          s.companies
            .map((c) => `${c.name}(${c.aiStyle}) nw=${netWorth(s, c)} ${c.bankrupt ? 'BUST' : ''}`)
            .join(' | '),
        );
      }
    }
    lengths.sort((a, b) => a - b);
    console.log(
      `games=${N} weeks min/median/max=${lengths[0]}/${lengths[Math.floor(N / 2)]}/${lengths[N - 1]} ` +
        `winners=${wins} bankruptcies=${bankrupt} styleWins=${JSON.stringify(styleWins)}`,
    );
  });
});
