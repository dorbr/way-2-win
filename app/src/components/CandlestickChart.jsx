import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

const CandlestickChart = ({ data, colors = {} }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();

    const {
        backgroundColor = '#1e293b', // slate-800
        textColor = '#94a3b8', // slate-400
        upColor = '#22c55e', // green-500
        downColor = '#ef4444', // red-500
        wickUpColor = '#22c55e',
        wickDownColor = '#ef4444',
    } = colors;

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !entries[0].contentRect) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor: textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            grid: {
                vertLines: { color: '#334155' }, // slate-700
                horzLines: { color: '#334155' },
            },
            timeScale: {
                borderColor: '#475569', // slate-600
            },
            rightPriceScale: {
                borderColor: '#475569',
            },
        });

        chartRef.current = chart;

        // Candlestick Series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: upColor,
            downColor: downColor,
            borderVisible: false,
            wickUpColor: wickUpColor,
            wickDownColor: wickDownColor,
        });

        // Volume Series (Histogram)
        const volumeSeries = chart.addHistogramSeries({
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Set as an overlay
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8, // Highest volume bar will be 80% down from the top (at the bottom 20%)
                bottom: 0,
            },
        });

        // Process data
        // Expected data format: { date: string, open: number, high: number, low: number, close: number, volume: number }
        const candleData = data.map(item => ({
            time: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        const volumeData = data.map(item => ({
            time: item.date,
            value: item.volume,
            color: item.close >= item.open ? upColor : downColor, // Green if close >= open, else Red
        }));

        candlestickSeries.setData(candleData);
        volumeSeries.setData(volumeData);

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, backgroundColor, textColor, upColor, downColor, wickUpColor, wickDownColor]);

    return (
        <div ref={chartContainerRef} className="w-full h-full rounded-lg overflow-hidden border border-slate-700 shadow-lg" />
    );
};

export default CandlestickChart;
