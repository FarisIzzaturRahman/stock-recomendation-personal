import { AnalysisResult, StockBar } from '@/types';
import { getHistoricalData } from './yahoo';
import { MA_PERIOD } from './consts';
import { calculateRSI, calculateMACD, calculateATR, calculateVolumeMA } from './indicators';

export async function analyzeStock(symbol: string): Promise<AnalysisResult> {
    try {
        const historyData = await getHistoricalData(symbol, 500);

        const history: StockBar[] = historyData.map(bar => ({
            date: new Date(bar.date).toISOString().split('T')[0],
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume
        }));

        if (history.length < 35) {
            throw new Error(`Insufficient data for analysis: ${history.length} days`);
        }

        const prices = history.map(h => h.close);
        const latestClose = prices[prices.length - 1];

        // MA-20
        const maSlice = prices.slice(-MA_PERIOD);
        const ma20 = maSlice.reduce((a, b) => a + b, 0) / MA_PERIOD;

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
        let macdStatus: 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish' | 'Bearish' = 'Bullish';

        if (prevHist <= 0 && latestHist > 0) macdStatus = 'Bullish Crossover';
        else if (prevHist >= 0 && latestHist < 0) macdStatus = 'Bearish Crossover';
        else if (latestHist > 0) macdStatus = 'Bullish';
        else macdStatus = 'Bearish';

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
        const volMA20Values = calculateVolumeMA(volumes, 20);
        const volMA20 = volMA20Values[volMA20Values.length - 1];
        const volumeRatio = latestVolume / volMA20;

        return {
            symbol,
            close: latestClose,
            ma20,
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

    } catch (error: any) {
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
            error: error.message || 'Analysis failed'
        } as AnalysisResult;
    }
}
