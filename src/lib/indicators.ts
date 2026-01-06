/**
 * Manual implementation of technical indicators.
 */

import { StockBar } from "@/types";

export function calculateMA(prices: number[], period: number): number[] {
    return prices.map((_, i, arr) => {
        if (i < period - 1) return 0;
        const slice = arr.slice(i - period + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / period;
    });
}

export function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [];

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

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < period; i++) rsi.push(50);
    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + firstRS)));

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

    const macdLine = prices.map((_, i) => fastEMA[i] - slowEMA[i]);
    const signalLine = calculateEMA(macdLine, signalPeriod);
    const histogram = prices.map((_, i) => macdLine[i] - signalLine[i]);

    return { macdLine, signalLine, histogram };
}

export function calculateATR(history: StockBar[], period: number = 14): number[] {
    const atr: number[] = [];
    const tr: number[] = [];

    tr.push(history[0].high - history[0].low);

    for (let i = 1; i < history.length; i++) {
        const h_l = history[i].high - history[i].low;
        const h_pc = Math.abs(history[i].high - history[i - 1].close);
        const l_pc = Math.abs(history[i].low - history[i - 1].close);
        tr.push(Math.max(h_l, h_pc, l_pc));
    }

    let currentAtr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = 0; i < period - 1; i++) atr.push(currentAtr);
    atr.push(currentAtr);

    for (let i = period; i < tr.length; i++) {
        currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
        atr.push(currentAtr);
    }

    return atr;
}

export function calculateVolumeMA(volumes: number[], period: number = 20): number[] {
    return calculateMA(volumes, period);
}
