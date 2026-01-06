import { NextResponse } from 'next/server';
import { STOCK_SYMBOLS } from '@/lib/consts';
import { analyzeStock } from '@/lib/analysis';

// Prevent caching to ensure fresh data on every load as requested
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const promises = STOCK_SYMBOLS.map(symbol => analyzeStock(symbol));
        const results = await Promise.all(promises);

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            data: results
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
