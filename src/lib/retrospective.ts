import { StockBar, SetupDefinition, RetrospectiveAnalysis, HorizonStats } from "@/types";
import { calculateMA, calculateRSI, calculateMACD, calculateATR } from "./indicators";
import { evaluateStockContexts } from "./prioritization";

/**
 * Performs a retrospective analysis to find what usually happens after a specific technical setup.
 */
export function runRetrospectiveAnalysis(
    history: StockBar[],
    currentSetup: SetupDefinition,
    lookbackDays: number = 250 // Analyze 1 year of history
): RetrospectiveAnalysis {
    const historicalData = history.slice(-lookbackDays - 60); // Padded for indicators
    if (historicalData.length < 50) {
        return { setup: currentSetup, totalOccurrences: 0, stats: [] };
    }

    const prices = historicalData.map(h => h.close);
    const volumes = historicalData.map(h => h.volume);

    // Batch calculate indicators for the whole slice
    const ma20 = calculateMA(prices, 20);
    const ma50 = calculateMA(prices, 50);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    const volMA = calculateMA(volumes, 20);
    const atr = calculateATR(historicalData, 14);

    const occurrences: number[] = [];

    // We start from index 50 to have stable indicators
    // We stop before the end to leave room for horizons (max 20 days)
    const startIndex = historicalData.length - lookbackDays;
    const endIndex = historicalData.length - 20;

    for (let i = Math.max(50, startIndex); i < endIndex; i++) {
        // Create a mock AnalysisResult for this point in time to reuse prioritization logic
        const fakeResult: any = {
            close: prices[i],
            ma20: ma20[i],
            ma50: ma50[i],
            isAboveMA20: prices[i] > ma20[i],
            rsi: rsi[i],
            macdStatus: (macd.macdLine[i] > macd.signalLine[i] ? 'Bullish' : 'Bearish'),
            histogram: macd.histogram[i],
            volumeRatio: volumes[i] / volMA[i],
            volatilityStatus: 'Normal' // Needs calculation relative to avg ATR
        };

        // Simple manual check against setup to avoid full evaluateStockContexts overhead if needed
        // but for consistency we use a slightly simplified direct check
        const meetsAboveMA = fakeResult.isAboveMA20 === currentSetup.isAboveMA20;

        // Only if it meets the core trend side, we do deeper check
        if (meetsAboveMA) {
            const contexts = evaluateStockContexts(fakeResult, historicalData.slice(0, i + 1));
            if (
                contexts.trend === currentSetup.trend &&
                contexts.momentum === currentSetup.momentum &&
                contexts.participation === currentSetup.participation
            ) {
                occurrences.push(i);
            }
        }
    }

    const horizons = [5, 10, 20];
    const stats: HorizonStats[] = horizons.map(horizon => {
        const returns: number[] = [];
        let higherCount = 0;

        occurrences.forEach(idx => {
            const entryPrice = prices[idx];
            const exitPrice = prices[idx + horizon];
            const ret = ((exitPrice - entryPrice) / entryPrice) * 100;
            returns.push(ret);
            if (exitPrice > entryPrice) higherCount++;
        });

        if (returns.length === 0) {
            return {
                horizon,
                higherCount: 0,
                totalOccurrences: 0,
                medianReturn: 0,
                minReturn: 0,
                maxReturn: 0,
                positiveRate: 0
            };
        }

        returns.sort((a, b) => a - b);
        const median = returns[Math.floor(returns.length / 2)];

        return {
            horizon,
            higherCount,
            totalOccurrences: returns.length,
            medianReturn: median,
            minReturn: returns[0],
            maxReturn: returns[returns.length - 1],
            positiveRate: (higherCount / returns.length) * 100
        };
    });

    return {
        setup: currentSetup,
        totalOccurrences: occurrences.length,
        stats
    };
}

