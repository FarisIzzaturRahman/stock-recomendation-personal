export interface StockBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TrendContext = 'Weak' | 'Moderate' | 'Strong';
export type MomentumContext = 'Stable' | 'Improving' | 'Overheated';
export type ParticipationContext = 'Below Average' | 'Normal' | 'Above Average';
export type VolatilityContext = 'Low' | 'Moderate' | 'Elevated';
export type ContextAlignment = 'Low' | 'Moderate' | 'High';

export interface StockContexts {
  trend: TrendContext;
  momentum: MomentumContext;
  participation: ParticipationContext;
  volatility: VolatilityContext;
}

export interface AnalysisResult {
  symbol: string;
  close: number;
  ma20: number;
  ma50?: number; // Added for trend context
  isAboveMA20: boolean;

  rsi: number;
  rsiStatus: 'Overbought' | 'Oversold' | 'Neutral';

  macd: number;
  signal: number;
  histogram: number;
  macdStatus: 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish' | 'Bearish';

  volume: number;
  volumeMA20: number;
  volumeRatio: number;

  atr: number;
  atrRelative: number;
  volatilityStatus: 'Low' | 'Normal' | 'High';

  // Prioritization Module fields
  contexts?: StockContexts;
  alignment?: ContextAlignment;
  alignmentReason?: string;

  history: StockBar[];
  error?: string;
}

export interface HypothesisResult {
  totalSignals: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  averageReturn: number;
  successRate: number;
  details: {
    date: string;
    returnDay5: number;
    returnDay10: number;
    returnDay20: number;
  }[];
}
