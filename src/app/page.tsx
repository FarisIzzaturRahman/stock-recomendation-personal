'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnalysisResult, HypothesisResult } from '@/types';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import { generateInsights } from '@/lib/insights';
import { runHypothesisTest, HypothesisCondition } from '@/lib/hypothesis';
import { getIDXMarketStatus, formatWIBTime, MarketStatus } from '@/lib/market';

const StockChart = dynamic(() => import('@/components/Chart'), { ssr: false });

type TimeWindow = '125' | '250' | '500';

export default function Home() {
  const [data, setData] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Market & Refresh State
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [marketInfo, setMarketInfo] = useState<MarketStatus>({ isOpen: false, message: 'Checking Market...', nextCheckMinutes: 1 });

  // Hypothesis State
  const [selectedCondition, setSelectedCondition] = useState<HypothesisCondition>('Price > MA-20');
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('250');
  const [hypothesisResult, setHypothesisResult] = useState<HypothesisResult | null>(null);

  const fetchData = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json.data);
      setLastUpdated(new Date());
      if (json.data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(json.data[0].symbol);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  // Initial fetch and Market Status Ticker
  useEffect(() => {
    fetchData();

    // Update market status every minute
    const statusInterval = setInterval(() => {
      setMarketInfo(getIDXMarketStatus());
    }, 60000);

    setMarketInfo(getIDXMarketStatus());
    return () => clearInterval(statusInterval);
  }, [fetchData]);

  // Smart Auto-Refresh Logic (5 minutes)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      const status = getIDXMarketStatus();
      const isTabActive = document.visibilityState === 'visible';

      if (status.isOpen && isTabActive) {
        console.log('IDX Market is open and tab is active. Re-fetching data...');
        fetchData(true);
      } else {
        console.log('Auto-refresh skipped:', !status.isOpen ? 'Market Closed' : 'Tab Inactive');
      }
    }, 300000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  const selectedData = data.find(d => d.symbol === selectedSymbol);

  useEffect(() => {
    if (selectedData && selectedData.history.length > 0) {
      const result = runHypothesisTest(selectedData.history, selectedCondition, parseInt(selectedWindow));
      setHypothesisResult(result);
    }
  }, [selectedData, selectedCondition, selectedWindow]);

  const insights = selectedData ? generateInsights(selectedData) : [];
  const formatNum = (val: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(val);
  const formatCompact = (val: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>IDX Data Intelligence</h1>
        <p className={styles.subtitle}>Analisis Kontekstual & Pengujian Hipotesis Data Bursa</p>
      </header>

      {/* Market Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <div className={`${styles.statusIndicator} ${marketInfo.isOpen ? styles.statusOpen : styles.statusClosed}`} />
          <span>{marketInfo.message.toUpperCase()}</span>
        </div>
        {lastUpdated && (
          <div className={styles.statusItem}>
            <span className={styles.lastUpdated}>Updated {formatWIBTime(lastUpdated)}</span>
            <span className={styles.delayedBadge}>DELAYED</span>
          </div>
        )}
      </div>

      {loading && <div className={styles.loading}>Menganalisis data bursa terakhir...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {!loading && !error && (
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <h3 className={styles.selectorTitle}>Watchlist Saham</h3>
            <div className={styles.symbolList}>
              {data.map((item) => (
                <div
                  key={item.symbol}
                  className={`${styles.symbolItem} ${selectedSymbol === item.symbol ? styles.activeSymbol : ''}`}
                  onClick={() => setSelectedSymbol(item.symbol)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700 }}>{item.symbol}</span>
                    <span style={{ fontSize: '0.7rem', color: item.isAboveMA20 ? '#059669' : '#dc2626' }}>
                      {item.isAboveMA20 ? 'TREND ABOVE MA-20' : 'TREND BELOW MA-20'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      Vol: {item.volumeRatio.toFixed(1)}x Avg
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatNum(item.close)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => fetchData()} className={styles.refreshButton} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Update Data Manual
            </button>
          </aside>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {selectedData && (
              <>
                {/* INSIGHT CARD */}
                <section className={styles.insightSection}>
                  <h3 className={styles.insightTitle}>💡 Analisis Deskriptif: {selectedData.symbol}</h3>
                  <ul className={styles.insightList}>
                    {insights.map((text, i) => (
                      <li key={i} className={styles.insightItem}>{text}</li>
                    ))}
                  </ul>
                </section>

                <div className={styles.chartSection}>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Visualisasi Multi-Dimensi</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className={`${styles.badge} ${selectedData.volatilityStatus === 'High' ? styles.badgeFail : styles.badgeNeutral}`}>
                        Volatilitas: {selectedData.volatilityStatus}
                      </span>
                    </div>
                  </div>
                  <StockChart data={selectedData} />
                </div>

                {/* HYPOTHESIS TESTING */}
                <section className={styles.chartSection} style={{ marginTop: '2rem', background: '#f8fafc' }}>
                  <h3 className={styles.insightTitle}>🧪 Hypothesis Testing Engine</h3>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Pilih Kondisi:</label>
                      <select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value as HypothesisCondition)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', minWidth: '240px' }}
                      >
                        <option value="Price > MA-20">Price Cross Above MA-20</option>
                        <option value="Price > MA-20 + High Vol">Price {' > '} MA-20 + Volume {' > '} Avg</option>
                        <option value="MACD Bullish Crossover">MACD Bullish Crossover</option>
                        <option value="RSI < 30">RSI Cross Below 30</option>
                        <option value="Volatility Low (ATR)">Volatility Convergence (ATR)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Lookback History:</label>
                      <select
                        value={selectedWindow}
                        onChange={(e) => setSelectedWindow(e.target.value as TimeWindow)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}
                      >
                        <option value="125">6 Bulan</option>
                        <option value="250">1 Tahun</option>
                        <option value="500">2 Tahun</option>
                      </select>
                    </div>
                  </div>

                  {hypothesisResult && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Kemunculan Sinyal</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{hypothesisResult.totalSignals}</div>
                      </div>
                      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Success Rate (20 Hari)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{formatNum(hypothesisResult.successRate)}%</div>
                      </div>
                      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Rerata Return (20 Hari)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{formatNum(hypothesisResult.averageReturn)}%</div>
                      </div>
                    </div>
                  )}
                </section>

                <div className={styles.tableContainer} style={{ marginTop: '2rem' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Parameter Data</th>
                        <th>Nilai Terakhir</th>
                        <th>Keterangan Konteks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Volume (Partisipasi)</strong></td>
                        <td>{formatCompact(selectedData.volume)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.volumeRatio > 1.2 ? styles.badgePass : styles.badgeNeutral}`}>
                            {selectedData.volumeRatio.toFixed(2)}x Rata-rata 20 Hari
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>ATR 14 (Volatilitas)</strong></td>
                        <td>{formatNum(selectedData.atr)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.volatilityStatus === 'High' ? styles.badgeFail : styles.badgeNeutral
                            }`}>
                            {selectedData.volatilityStatus} ({selectedData.atrRelative.toFixed(2)}% dari harga)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Tren (MA-20)</strong></td>
                        <td>{formatNum(selectedData.ma20)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.isAboveMA20 ? styles.badgeAbove : styles.badgeBelow}`}>
                            {selectedData.isAboveMA20 ? 'Harga di Atas MA-20' : 'Harga di Bawah MA-20'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p><strong>Edukasi & Transparansi Data:</strong></p>
          <p>Aplikasi ini secara otomatis memperbarui data setiap 5 menit selama jam perdagangan bursa (IDX). Jika bursa tutup atau tab browser tidak aktif, pembaruan otomatis dijeda untuk efisiensi.</p>
          <p>Data yang ditampilkan memiliki **delay** sesuai dengan kebijakan Yahoo Finance. Seluruh analisis bersifat deskriptif dan statistik. **Bukan rekomendasi transaksi.** Keputusan keuangan sepenuhnya berada di tangan investor masing-masing.</p>
        </div>
      </footer>
    </main>
  );
}
