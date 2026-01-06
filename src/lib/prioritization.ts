import { AnalysisResult, StockBar, StockContexts, ContextAlignment, TrendContext, MomentumContext, ParticipationContext, VolatilityContext } from "@/types";

/**
 * Evaluates the four technical contexts with added intelligence for divergence and longevity.
 */
export function evaluateStockContexts(data: AnalysisResult, history: StockBar[]): StockContexts {
    // 1. Trend Context & Longevity
    let trend: TrendContext = 'Weak';
    const isAboveMA20 = data.isAboveMA20;

    // Calculate Longevity: How many days price has been consistently on the current side of MA20
    let trendLongevity = 0;
    // Note: For a precise calculation in a real app, we'd need history of MA20.
    // We'll use a simplified proxy for this exercise.
    for (let i = history.length - 1; i >= 0; i--) {
        // In actual app, we would calculate MA20 for each 'i'
        // Here we approximate with recent prices relative to current MA20
        const wasAbove = history[i].close > data.ma20;
        if (wasAbove === isAboveMA20) {
            trendLongevity++;
        } else {
            break;
        }
    }

    const hasMA50 = data.ma50 !== undefined;
    const isMA20AboveMA50 = hasMA50 ? (data.ma20 > (data.ma50 as number)) : true;

    if (isAboveMA20 && isMA20AboveMA50) {
        trend = 'Strong';
    } else if (isAboveMA20 || isMA20AboveMA50) {
        trend = 'Moderate';
    }

    // 2. Momentum Context
    let momentum: MomentumContext = 'Stable';
    const isBullishMACD = data.macdStatus === 'Bullish' || data.macdStatus === 'Bullish Crossover';

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

    // 5. Divergence Sensing (Simplified)
    // Check if Price is rising over last 5 days but Volume is falling
    const recentPrices = history.slice(-5).map(h => h.close);
    const recentVolumes = history.slice(-5).map(h => h.volume);

    const priceRising = recentPrices[4] > recentPrices[0];
    const volumeFalling = recentVolumes[4] < recentVolumes[0] * 0.9; // 10% drop

    let isDivergent = false;
    let divergenceReason = "";

    if (priceRising && volumeFalling && trend === 'Strong') {
        isDivergent = true;
        divergenceReason = "Harga menguat sementara volume menurun (divergensi negatif)";
    }

    return { trend, momentum, participation, volatility, trendLongevity, isDivergent, divergenceReason };
}

/**
 * Determines the level of alignment between the evaluated contexts.
 */
export function calculateAlignment(contexts: StockContexts): { alignment: ContextAlignment, reason: string } {
    const { trend, momentum, participation, volatility, trendLongevity, isDivergent, divergenceReason } = contexts;

    let alignmentCount = 0;
    const confluenceItems: string[] = [];

    if (trend === 'Strong') {
        alignmentCount++;
        confluenceItems.push(`tren sangat kokoh (${trendLongevity} hari)`);
    } else if (trend === 'Moderate') {
        confluenceItems.push('struktur tren moderat');
    }

    if (momentum === 'Improving') {
        alignmentCount++;
        confluenceItems.push('momentum mulai menguat');
    }

    if (participation === 'Above Average') {
        alignmentCount++;
        confluenceItems.push('partisipasi pasar tinggi');
    }

    if (volatility === 'Low' || volatility === 'Moderate') {
        alignmentCount++;
        if (volatility === 'Low') confluenceItems.push('volatilitas rendah (konsolidasi)');
    }

    let alignment: ContextAlignment = 'Low';
    if (alignmentCount >= 3) {
        alignment = 'High';
    } else if (alignmentCount >= 2) {
        alignment = 'Moderate';
    }

    let reasonStr = "";
    if (alignment === 'High') {
        reasonStr = `Keselarasan tinggi karena ${confluenceItems.join(', ')}.`;
    } else if (alignment === 'Moderate') {
        reasonStr = `Keselarasan moderat; ${confluenceItems.length > 0 ? confluenceItems.join(', ') : 'kondisi cenderung netral'}.`;
    } else {
        reasonStr = `Keselarasan rendah; konfluensi teknikal belum terbentuk kuat.`;
    }

    // Inject divergence warning if present
    if (isDivergent && divergenceReason) {
        reasonStr += ` Perlu diperhatikan: ${divergenceReason}.`;
    }

    return { alignment, reason: reasonStr };
}

