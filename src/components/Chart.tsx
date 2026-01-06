'use client';

import { useEffect, useRef } from 'react';
import {
    createChart,
    ColorType,
    LineSeries,
    CandlestickSeries,
    HistogramSeries,
    ISeriesApi
} from 'lightweight-charts';
import { AnalysisResult } from '@/types';

interface ChartProps {
    data: AnalysisResult;
}

export default function StockChart({ data }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    const macdContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current || !data.history.length) return;

        const commonOptions = {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f3fa' },
                horzLines: { color: '#f0f3fa' },
            },
            width: chartContainerRef.current.clientWidth,
            timeScale: { borderColor: '#D1D4DC' },
        };

        // 1. Price/MA Chart
        const priceChart = createChart(chartContainerRef.current, { ...commonOptions, height: 350 });
        const candleSeries = priceChart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });
        candleSeries.setData(data.history.map(b => ({ time: b.date.split('T')[0], open: b.open, high: b.high, low: b.low, close: b.close })));

        const ma20Series = priceChart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2 });
        const ma20Data = data.history.map((_, i, arr) => {
            if (i < 19) return null;
            const sum = arr.slice(i - 19, i + 1).reduce((a, b) => a + b.close, 0);
            return { time: arr[i].date.split('T')[0], value: sum / 20 };
        }).filter((i): i is { time: string; value: number } => i !== null);
        ma20Series.setData(ma20Data);

        // 2. Volume Chart
        const volumeChart = createChart(volumeContainerRef.current!, { ...commonOptions, height: 100 });
        const volumeSeries = volumeChart.addSeries(HistogramSeries, { color: '#26a69a' });
        volumeSeries.setData(data.history.map(b => ({
            time: b.date.split('T')[0],
            value: b.volume,
            color: b.close >= b.open ? '#26a69a88' : '#ef535088'
        })));

        // 3. RSI Chart
        const rsiChart = createChart(rsiContainerRef.current!, { ...commonOptions, height: 130 });
        const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#7e57c2', lineWidth: 2 });
        // Minimal local calculation for full history plot
        const prices = data.history.map(h => h.close);
        const rsiData = calculateRSI(prices).map((v, i) => ({ time: data.history[i].date.split('T')[0], value: v })).slice(14);
        rsiSeries.setData(rsiData);

        // 4. MACD Chart
        const macdChart = createChart(macdContainerRef.current!, { ...commonOptions, height: 150 });
        const mLine = macdChart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 });
        const sLine = macdChart.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1 });
        const hSeries = macdChart.addSeries(HistogramSeries, { color: '#26a69a' });

        const macdFull = calculateMACD(prices);
        mLine.setData(macdFull.macdLine.map((v, i) => ({ time: data.history[i].date.split('T')[0], value: v })));
        sLine.setData(macdFull.signalLine.map((v, i) => ({ time: data.history[i].date.split('T')[0], value: v })));
        hSeries.setData(macdFull.histogram.map((v, i) => ({
            time: data.history[i].date.split('T')[0], value: v, color: v >= 0 ? '#26a69a' : '#ef5350'
        })));

        // Sync time scales
        const charts = [priceChart, volumeChart, rsiChart, macdChart];
        charts.forEach(c => {
            c.timeScale().subscribeVisibleTimeRangeChange(range => {
                if (range) charts.filter(other => other !== c).forEach(other => other.timeScale().setVisibleRange(range));
            });
        });

        const handleResize = () => {
            const width = chartContainerRef.current?.clientWidth || 0;
            charts.forEach(c => c.applyOptions({ width }));
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            charts.forEach(c => c.remove());
        };
    }, [data]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div ref={chartContainerRef} style={{ width: '100%' }} />
            <div ref={volumeContainerRef} style={{ width: '100%' }} />
            <div ref={rsiContainerRef} style={{ width: '100%' }} />
            <div ref={macdContainerRef} style={{ width: '100%' }} />
        </div>
    );
}

// Minimal helpers for full plot
function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    for (let i = 1; i < prices.length; i++) ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    return ema;
}
function calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = Array(period).fill(50);
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
    }
    let ag = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let al = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    rsi.push(100 - (100 / (1 + (al === 0 ? 100 : ag / al))));
    for (let i = period; i < gains.length; i++) {
        ag = (ag * (period - 1) + gains[i]) / period;
        al = (al * (period - 1) + losses[i]) / period;
        rsi.push(100 - (100 / (1 + (al === 0 ? 100 : ag / al))));
    }
    return rsi;
}
function calculateMACD(prices: number[]) {
    const f = calculateEMA(prices, 12);
    const s = calculateEMA(prices, 26);
    const m = f.map((v, i) => v - s[i]);
    const sl = calculateEMA(m, 9);
    const h = m.map((v, i) => v - sl[i]);
    return { macdLine: m, signalLine: sl, histogram: h };
}
