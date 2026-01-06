import { AnalysisResult, StockBar, StockContexts, ContextAlignment, TrendContext, MomentumContext, ParticipationContext, VolatilityContext } from "@/types";

/**
 * Evaluates the four technical contexts: Trend, Momentum, Participation, and Risk/Volatility.
 * Provides a qualitative assessment without numeric scoring.
 */
export function evaluateStockContexts(data: AnalysisResult, history: StockBar[]): StockContexts {
    // 1. Trend Context
    // Criteria: Price relative to MA20, MA20 relative to MA50, and recent historical staying power.
    let trend: TrendContext = 'Weak';
    const hasMA50 = data.ma50 !== undefined;
    const isAboveMA20 = data.isAboveMA20;
    const isMA20AboveMA50 = hasMA50 ? (data.ma20 > (data.ma50 as number)) : true;

    // Checking last 5 days for stability above MA20
    const recentAboveMA20Count = history.slice(-5).filter((h, i) => {
        // Note: This is simplified, in real app we'd need calculated MA20 for each bar
        // For now, we use the current status as a proxy for the last few days
        return data.close > data.ma20;
    }).length;

    if (isAboveMA20 && isMA20AboveMA50) {
        trend = 'Strong';
    } else if (isAboveMA20 || isMA20AboveMA50) {
        trend = 'Moderate';
    }

    // 2. Momentum Context
    // Criteria: RSI status and MACD crossover history.
    let momentum: MomentumContext = 'Stable';
    const isBullishMACD = data.macdStatus === 'Bullish' || data.macdStatus === 'Bullish Crossover';
    const isMomentumImproving = data.histogram > 0 && data.histogram > (history[history.length - 2]?.close || 0); // Very simplified proxy

    if (data.rsi > 70) {
        momentum = 'Overheated';
    } else if (isBullishMACD) {
        momentum = 'Improving';
    }

    // 3. Participation Context (Volume)
    let participation: ParticipationContext = 'Normal';
    if (data.volumeRatio > 1.3) {
        participation = 'Above Average';
    } else if (data.volumeRatio < 0.7) {
        participation = 'Below Average';
    }

    // 4. Volatility Context (ATR)
    let volatility: VolatilityContext = 'Moderate';
    if (data.volatilityStatus === 'Low') {
        volatility = 'Low';
    } else if (data.volatilityStatus === 'High') {
        volatility = 'Elevated';
    }

    return { trend, momentum, participation, volatility };
}

/**
 * Determines the level of alignment between the evaluated contexts.
 */
export function calculateAlignment(contexts: StockContexts): { alignment: ContextAlignment, reason: string } {
    const { trend, momentum, participation, volatility } = contexts;

    let alignmentCount = 0;
    const reasons: string[] = [];

    if (trend === 'Strong') {
        alignmentCount++;
        reasons.push('tren harga sangat kokoh');
    } else if (trend === 'Moderate') {
        reasons.push('tren menunjukkan struktur moderat');
    }

    if (momentum === 'Improving') {
        alignmentCount++;
        reasons.push('momentum mulai menguat');
    } else if (momentum === 'Overheated') {
        reasons.push('momentum mulai jenuh');
    }

    if (participation === 'Above Average') {
        alignmentCount++;
        reasons.push('partisipasi pasar tinggi');
    }

    if (volatility === 'Low' || volatility === 'Moderate') {
        // Low volatility is often seen as a positive for alignment (consolidation/stability)
        alignmentCount++;
        if (volatility === 'Low') reasons.push('volatilitas rendah (konsolidasi)');
    }

    let alignment: ContextAlignment = 'Low';
    if (alignmentCount >= 3) {
        alignment = 'High';
    } else if (alignmentCount >= 2) {
        alignment = 'Moderate';
    }

    // Constructing a neutral, data-driven reason
    const reasonStr = alignment === 'High'
        ? `Menunjukkan keselarasan tinggi karena ${reasons.join(', ')}.`
        : alignment === 'Moderate'
            ? `Menunjukkan keselarasan moderat; ${reasons.length > 0 ? reasons.join(', ') : 'kondisi cenderung netral'}.`
            : `Keselarasan rendah; beberapa konteks teknikal belum menunjukkan konfluensi yang kuat.`;

    return { alignment, reason: reasonStr };
}
