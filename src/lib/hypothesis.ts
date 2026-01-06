import { StockBar, HypothesisResult } from '@/types';
import { calculateRSI, calculateMACD, calculateATR, calculateVolumeMA } from './indicators';

export type HypothesisCondition =
    | 'Price > MA-20'
    | 'MACD Bullish Crossover'
    | 'RSI < 30'
    | 'Price > MA-20 + High Vol'
    | 'Volatility Low (ATR)';

export function runHypothesisTest(
    history: StockBar[],
    condition: HypothesisCondition,
    daysLimit: number = 250
): HypothesisResult {
    const filteredHistory = history.slice(-daysLimit - 30);
    const prices = filteredHistory.map(h => h.close);
    const volumes = filteredHistory.map(h => h.volume);
    const results: HypothesisResult['details'] = [];

    const lookback = 30;
    const rsi = calculateRSI(prices);
    const { histogram } = calculateMACD(prices);
    const atr = calculateATR(filteredHistory, 14);
    const volMA = calculateVolumeMA(volumes, 20);

    const ma20 = prices.map((_, i, arr) => {
        if (i < 19) return 0;
        return arr.slice(i - 19, i + 1).reduce((a, b: any) => a + b.close, 0) / 20;
    });

    for (let i = lookback; i < filteredHistory.length - 20; i++) {
        let signalTriggered = false;

        if (condition === 'Price > MA-20') {
            if (prices[i] > ma20[i] && prices[i - 1] <= ma20[i - 1]) signalTriggered = true;
        } else if (condition === 'MACD Bullish Crossover') {
            if (histogram[i] > 0 && histogram[i - 1] <= 0) signalTriggered = true;
        } else if (condition === 'RSI < 30') {
            if (rsi[i] < 30 && rsi[i - 1] >= 30) signalTriggered = true;
        } else if (condition === 'Price > MA-20 + High Vol') {
            const isPriceCross = prices[i] > ma20[i] && prices[i - 1] <= ma20[i - 1];
            const isHighVol = volumes[i] > volMA[i];
            if (isPriceCross && isHighVol) signalTriggered = true;
        } else if (condition === 'Volatility Low (ATR)') {
            // Trigger when ATR crosses below its 20D average (consolidation)
            const atrMA = atr.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20;
            if (atr[i] < atrMA && atr[i - 1] >= atrMA) signalTriggered = true;
        }

        if (signalTriggered) {
            const entryPrice = prices[i];
            results.push({
                date: filteredHistory[i].date,
                returnDay5: ((prices[i + 5] - entryPrice) / entryPrice) * 100,
                returnDay10: ((prices[i + 10] - entryPrice) / entryPrice) * 100,
                returnDay20: ((prices[i + 20] - entryPrice) / entryPrice) * 100
            });
        }
    }

    const total = results.length;
    const positive = results.filter(r => r.returnDay20 > 0).length;
    const avg = total > 0 ? results.reduce((a, b) => a + b.returnDay20, 0) / total : 0;

    return {
        totalSignals: total,
        positiveOutcomes: positive,
        negativeOutcomes: total - positive,
        averageReturn: avg,
        successRate: total > 0 ? (positive / total) * 100 : 0,
        details: results.slice(-10)
    };
}
