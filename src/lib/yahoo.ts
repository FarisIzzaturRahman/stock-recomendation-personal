import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export interface YahooStockData {
    date: Date | string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose?: number;
    volume: number;
}

export async function getHistoricalData(symbol: string, days: number = 40): Promise<YahooStockData[]> {
    const endDate = new Date();
    const startDate = new Date();
    // Fetch more days than strictly needed to account for weekends/holidays
    startDate.setDate(endDate.getDate() - (days * 2));

    try {
        const result = await yahooFinance.historical(symbol, {
            period1: startDate,
            period2: endDate,
            interval: '1d',
        });

        // Sort by date ascending explicitly, though usually it is
        return (result as unknown as YahooStockData[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        throw error;
    }
}
