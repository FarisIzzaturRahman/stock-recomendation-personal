import { AnalysisResult } from '@/types';

export function generateInsights(data: AnalysisResult): string[] {
    const insights: string[] = [];
    const history = data.history;

    if (!history || history.length < 20) return ['Data historis tidak mencukupi untuk analisis mendalam.'];

    // 1. Trend Consistency (MA-20)
    let consecutiveAbove = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (i < 19) break;
        const slice = history.slice(i - 19, i + 1);
        const maAtDay = slice.reduce((a, b: any) => a + b.close, 0) / 20;
        if (history[i].close > maAtDay) {
            consecutiveAbove++;
        } else {
            break;
        }
    }

    if (consecutiveAbove >= 5) {
        insights.push(`Tren Penguatan Stabil: Harga telah bertahan secara konsisten di atas MA-20 selama ${consecutiveAbove} hari bursa terakhir.`);
    } else if (consecutiveAbove > 0) {
        insights.push(`Indikasi Tren: Harga saat ini berada di atas MA-20, namun baru berlangsung selama ${consecutiveAbove} hari bursa.`);
    } else {
        insights.push(`Tren Pelemahan: Harga saat ini berada di bawah indikator MA-20, menunjukkan tekanan jual yang mendominasi.`);
    }

    // 2. Volume Context (Participation)
    if (data.volumeRatio > 1.5) {
        insights.push(`Partisipasi Tinggi: Volume perdagangan saat ini (${data.volumeRatio.toFixed(2)}x rata-rata) menunjukkan antusiasme pasar yang signifikan pada level harga ini.`);
    } else if (data.volumeRatio < 0.7) {
        insights.push(`Partisipasi Rendah: Volume berada di bawah rata-rata (${data.volumeRatio.toFixed(2)}x), menunjukkan pergerakan harga saat ini kurang didukung oleh aktivitas transaksi yang besar.`);
    } else {
        insights.push(`Partisipasi Normal: Volume perdagangan sejalan dengan rata-rata 20 hari terakhir.`);
    }

    // 3. Volatility Context (ATR)
    if (data.volatilityStatus === 'High') {
        insights.push(`Volatilitas Meningkat: ATR relatif (${data.atrRelative.toFixed(2)}%) menunjukkan fluktuasi harga yang lebih lebar dari biasanya, menandakan risiko pergerakan yang lebih tajam.`);
    } else if (data.volatilityStatus === 'Low') {
        insights.push(`Volatilitas Rendah: Rentang pergerakan harga menyempit (ATR ${data.atr.toFixed(0)}), seringkali merupakan fase konsolidasi sebelum pergerakan besar berikutnya.`);
    } else {
        insights.push(`Volatilitas Normal: Fluktuasi harga harian stabil di kisaran ${data.atrRelative.toFixed(2)}% dari harga penutupan.`);
    }

    // 4. Momentum (RSI & MACD)
    if (data.rsi > 70) {
        insights.push(`Status Overbought: RSI (${data.rsi.toFixed(2)}) melampaui level 70, mengindikasikan kondisi jenuh beli.`);
    } else if (data.rsi < 30) {
        insights.push(`Status Oversold: RSI (${data.rsi.toFixed(2)}) berada di bawah 30, menunjukkan kondisi jenuh jual.`);
    }

    if (data.macdStatus === 'Bullish Crossover') {
        insights.push(`Sinyal Momentum: Terjadi persilangan naik (Bullish Crossover) pada MACD, sinyal awal penguatan momentum.`);
    } else if (data.macdStatus === 'Bearish Crossover') {
        insights.push(`Sinyal Momentum: Terjadi persilangan turun (Bearish Crossover) pada MACD, sinyal awal pelemahan momentum.`);
    }

    return insights;
}
