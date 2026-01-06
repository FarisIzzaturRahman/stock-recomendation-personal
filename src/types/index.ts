export interface StockBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResult {
  symbol: string;
  close: number;
  ma20: number;
  isAboveMA20: boolean;

  rsi: number;
  rsiStatus: 'Overbought' | 'Oversold' | 'Neutral';

  macd: number;
  signal: number;
  histogram: number;
  macdStatus: 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish' | 'Bearish';

  // New Indicators
  volume: number;
  volumeMA20: number;
  volumeRatio: number;

  atr: number;
  atrRelative: number; // ATR as percentage of price
  volatilityStatus: 'Low' | 'Normal' | 'High';

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
