import { AnalysisResult, StockBar } from '@/types';
import { getHistoricalData } from './yahoo';
import { MA_PERIOD } from './consts';
import { calculateRSI, calculateMACD } from './indicators';

export async function analyzeStock(symbol: string): Promise<AnalysisResult> {
    try {
        // Fetch ~100 days of data to support EMA warm-up for MACD and RSI
        const historyData = await getHistoricalData(symbol, 100);

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

        // Check for crossover (simple logic: compare current hist with previous hist)
        const prevHist = histogram[histogram.length - 2];
        let macdStatus: 'Bullish Crossover' | 'Bearish Crossover' | 'Bullish' | 'Bearish' = 'Neutral' as any;

        if (prevHist <= 0 && latestHist > 0) macdStatus = 'Bullish Crossover';
        else if (prevHist >= 0 && latestHist < 0) macdStatus = 'Bearish Crossover';
        else if (latestHist > 0) macdStatus = 'Bullish';
        else macdStatus = 'Bearish';

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
            history: [],
            error: error.message || 'Analysis failed'
        } as AnalysisResult;
    }
}
