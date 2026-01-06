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
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    const macdContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current || !data.history.length) return;

        const chartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f3fa' },
                horzLines: { color: '#f0f3fa' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                borderColor: '#D1D4DC',
            },
        };

        const chart = createChart(chartContainerRef.current, chartOptions);
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        const candlestickData = data.history.map((bar) => ({
            time: bar.date,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
        }));

        candleSeries.setData(candlestickData);

        // MA-20 Line
        const ma20Series = chart.addSeries(LineSeries, {
            color: '#2962FF',
            lineWidth: 2,
        });

        const ma20Data = data.history.map((_, index, arr) => {
            if (index < 19) return null;
            const slice = arr.slice(index - 19, index + 1);
            const sum = slice.reduce((acc, val) => acc + val.close, 0);
            return {
                time: arr[index].date,
                value: sum / 20,
            };
        }).filter((item): item is { time: string; value: number } => item !== null);

        ma20Series.setData(ma20Data);

        // RSI Chart
        const rsiChart = createChart(rsiContainerRef.current!, {
            ...chartOptions,
            height: 150,
        });
        const rsiSeries = rsiChart.addSeries(LineSeries, {
            color: '#7e57c2',
            lineWidth: 2,
        });

        const prices = data.history.map(h => h.close);
        const rsiFull = calculateRSI(prices);
        const rsiPlotData = rsiFull.map((val, i) => ({
            time: data.history[i].date,
            value: val
        })).slice(14);
        rsiSeries.setData(rsiPlotData);

        // MACD Chart
        const macdChart = createChart(macdContainerRef.current!, {
            ...chartOptions,
            height: 200,
        });
        const macdLineSeries = macdChart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 });
        const signalLineSeries = macdChart.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 1 });
        const histSeries = macdChart.addSeries(HistogramSeries, {
            color: '#26a69a',
        });

        const macdDataRaw = calculateMACD(prices);
        const macdPlot = macdDataRaw.macdLine.map((v, i) => ({ time: data.history[i].date, value: v }));
        const signalPlot = macdDataRaw.signalLine.map((v, i) => ({ time: data.history[i].date, value: v }));
        const histPlot = macdDataRaw.histogram.map((v, i) => ({
            time: data.history[i].date,
            value: v,
            color: v >= 0 ? '#26a69a' : '#ef5350'
        }));

        macdLineSeries.setData(macdPlot);
        signalLineSeries.setData(signalPlot);
        histSeries.setData(histPlot);

        // Sync time scales
        chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (range) {
                rsiChart.timeScale().setVisibleRange(range);
                macdChart.timeScale().setVisibleRange(range);
            }
        });

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
            rsiChart.applyOptions({ width: chartContainerRef.current!.clientWidth });
            macdChart.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            rsiChart.remove();
            macdChart.remove();
        };
    }, [data]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <div ref={chartContainerRef} style={{ width: '100%' }} />
            <div ref={rsiContainerRef} style={{ width: '100%' }} />
            <div ref={macdContainerRef} style={{ width: '100%' }} />
        </div>
    );
}

// Minimalist re-implementation or import for client side
function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
        ema.push((prices[i] * k) + (ema[i - 1] * (1 - k)));
    }
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
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    rsi.push(100 - (100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss))));
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        rsi.push(100 - (100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss))));
    }
    return rsi;
}

function calculateMACD(prices: number[]) {
    const fastEMA = calculateEMA(prices, 12);
    const slowEMA = calculateEMA(prices, 26);
    const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
    const signalLine = calculateEMA(macdLine, 9);
    const histogram = macdLine.map((m, i) => m - signalLine[i]);
    return { macdLine, signalLine, histogram };
}
