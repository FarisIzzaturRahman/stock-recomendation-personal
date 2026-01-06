/**
 * Manual implementation of technical indicators.
 * Principles: 
 * - EMA (Exponential Moving Average)
 * - RSI (Relative Strength Index) using EMA smoothing (Wilder's method)
 * - MACD (Moving Average Convergence Divergence)
 */

export function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [];

    // Initial SMA for the first EMA point or just start with first price
    let currentEma = prices[0];
    ema.push(currentEma);

    for (let i = 1; i < prices.length; i++) {
        currentEma = (prices[i] * k) + (currentEma * (1 - k));
        ema.push(currentEma);
    }

    return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
    }

    // First Average Gain/Loss (SMA)
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // RSI for the first period
    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    for (let i = 0; i < period; i++) rsi.push(50); // Padding for initial period
    rsi.push(100 - (100 / (1 + firstRS)));

    // Subsequent Smoothed Averages (Wilder's smoothing)
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
}

export function calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
) {
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);

    const macdLine: number[] = [];
    for (let i = 0; i < prices.length; i++) {
        macdLine.push(fastEMA[i] - slowEMA[i]);
    }

    const signalLine = calculateEMA(macdLine, signalPeriod);

    const histogram: number[] = [];
    for (let i = 0; i < prices.length; i++) {
        histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
        macdLine,
        signalLine,
        histogram
    };
}
