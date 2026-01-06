import { StockBar, AnalysisResult } from "@/types";
import { calculateMA, calculateRSI, calculateMACD, calculateATR } from "./indicators";
import { getHistoricalData } from "./yahoo";
import { evaluateStockContexts, calculateAlignment } from "./prioritization";

export async function analyzeStock(symbol: string): Promise<AnalysisResult> {
    try {
        const rawHistory = await getHistoricalData(symbol, 500);

        if (rawHistory.length < 50) {
            throw new Error('Data historis tidak mencukupi untuk analisis teknikal.');
        }

        // Transform to StockBar (ensuring date is string)
        const history: StockBar[] = rawHistory.map(h => ({
            ...h,
            date: typeof h.date === 'string' ? h.date : h.date.toISOString()
        }));

        const prices = history.map(h => h.close);
        const latestClose = prices[prices.length - 1];

        // MA-20 & MA-50
        const ma20Values = calculateMA(prices, 20);
        const ma20 = ma20Values[ma20Values.length - 1];
        const ma50Values = calculateMA(prices, 50);
        const ma50 = ma50Values[ma50Values.length - 1];

        // RSI
        const rsiValues = calculateRSI(prices, 14);
        const latestRSI = rsiValues[rsiValues.length - 1];
        let rsiStatus: 'Overbought' | 'Oversold' | 'Neutral' = 'Neutral';
        if (latestRSI > 70) rsiStatus = 'Overbought';
        else if (latestRSI < 30) rsiStatus = 'Oversold';

        // MACD
        const { macdLine, signalLine, histogram } = calculateMACD(prices);
        const latestMACD = macdLine[macdLine.length - 1];
        const latestSignal = signalLine[signalLine.length - 1];
        const latestHist = histogram[histogram.length - 1];
        const prevHist = histogram[histogram.length - 2];

        let macdStatus: 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish' | 'Bearish' = latestMACD > latestSignal ? 'Bullish' : 'Bearish';
        if (latestHist > 0 && prevHist <= 0) macdStatus = 'Bullish Crossover';
        else if (latestHist < 0 && prevHist >= 0) macdStatus = 'Bearish Crossover';

        // ATR
        const atrValues = calculateATR(history, 14);
        const latestATR = atrValues[atrValues.length - 1];
        const atrRelative = (latestATR / latestClose) * 100;

        // Volatility Status (Simple comparison with previous ATR)
        const avgATR = atrValues.slice(-20).reduce((a, b) => a + b, 0) / 20;
        let volatilityStatus: 'Low' | 'Normal' | 'High' = 'Normal';
        if (latestATR > avgATR * 1.2) volatilityStatus = 'High';
        else if (latestATR < avgATR * 0.8) volatilityStatus = 'Low';

        // Volume
        const volumes = history.map(h => h.volume);
        const latestVolume = volumes[volumes.length - 1];
        const volMA20Values = calculateMA(volumes, 20);
        const volMA20 = volMA20Values[volMA20Values.length - 1];
        const volumeRatio = latestVolume / volMA20;

        const partialResult: AnalysisResult = {
            symbol,
            close: latestClose,
            ma20,
            ma50,
            isAboveMA20: latestClose > ma20,
            rsi: latestRSI,
            rsiStatus,
            macd: latestMACD,
            signal: latestSignal,
            histogram: latestHist,
            macdStatus,
            volume: latestVolume,
            volumeMA20: volMA20,
            volumeRatio,
            atr: latestATR,
            atrRelative,
            volatilityStatus,
            history
        };

        // Context Evaluation & Prioritization
        const contexts = evaluateStockContexts(partialResult, history);
        const { alignment, reason } = calculateAlignment(contexts);

        return {
            ...partialResult,
            contexts,
            alignment,
            alignmentReason: reason
        };

    } catch (error: any) {
        console.error(`Error analyzing ${symbol}:`, error);
        return {
            symbol,
            close: 0,
            ma20: 0,
            isAboveMA20: false,
            rsi: 0,
            rsiStatus: 'Neutral',
            macd: 0,
            signal: 0,
            histogram: 0,
            macdStatus: 'Bearish',
            volume: 0,
            volumeMA20: 0,
            volumeRatio: 0,
            atr: 0,
            atrRelative: 0,
            volatilityStatus: 'Normal',
            history: [],
            error: error.message
        };
    }
}
