export type AiStyle = 'chaotic' | 'bythebook' | 'cautious' | 'naive' | 'risky' | 'ruthless';

export interface OpponentDef {
  id: string;
  name: string;
  style: AiStyle;
  blurb: string;
}

export const OPPONENTS: readonly OpponentDef[] = [
  {
    id: 'gizzy',
    name: 'Gizzy Shipping',
    style: 'chaotic',
    blurb:
      'Freewheeling and unpredictable. Nobody knows what Gizzy will do next — least of all Gizzy.',
  },
  {
    id: 'tradingcorp',
    name: 'Trading Corp. IV',
    style: 'bythebook',
    blurb: 'Does everything by the book. Solid, boring, occasionally very rich.',
  },
  {
    id: 'vandergriff',
    name: 'Vandergriff Ltd.',
    style: 'cautious',
    blurb: 'Old money. Cautious to a fault, but never in debt.',
  },
  {
    id: 'puffer',
    name: 'Puffer Inc.',
    style: 'naive',
    blurb: 'A plucky start-up that learns from its mistakes. Eventually.',
  },
  {
    id: 'roke',
    name: 'Roke Transport',
    style: 'risky',
    blurb: 'Loves a gamble: fast ships, big bets, wild swings.',
  },
  {
    id: 'hoff',
    name: 'Hoff Meister',
    style: 'ruthless',
    blurb: 'Ruthless and efficient. The one to beat.',
  },
];
