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

  history: StockBar[];
  error?: string;
}
