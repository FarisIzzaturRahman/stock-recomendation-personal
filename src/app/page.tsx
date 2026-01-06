'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnalysisResult, HypothesisResult, ContextAlignment } from '@/types';
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

      // Prioritize data: High > Moderate > Low alignment
      const sortedData = (json.data as AnalysisResult[]).sort((a, b) => {
        const score = { 'High': 3, 'Moderate': 2, 'Low': 1 };
        return (score[b.alignment || 'Low']) - (score[a.alignment || 'Low']);
      });

      setData(sortedData);
      setLastUpdated(new Date());
      if (sortedData.length > 0 && !selectedSymbol) {
        setSelectedSymbol(sortedData[0].symbol);
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
        fetchData(true);
      }
    }, 300000);

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

  const getAlignmentClass = (alignment?: ContextAlignment) => {
    if (alignment === 'High') return styles.badgeHigh;
    if (alignment === 'Moderate') return styles.badgeModerate;
    return styles.badgeLow;
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>IDX Data Intelligence</h1>
        <p className={styles.subtitle}>Sistem Evaluasi Konteks & Pengujian Hipotesis Bursa Indonesia</p>
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

      {loading && <div className={styles.loading}>Mengevaluasi keselarasan konteks teknikal...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {!loading && !error && (
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <h3 className={styles.selectorTitle}>Watchlist Prioritas</h3>
            <div className={styles.symbolList}>
              {data.map((item) => (
                <div
                  key={item.symbol}
                  className={`${styles.symbolItem} ${selectedSymbol === item.symbol ? styles.activeSymbol : ''}`}
                  onClick={() => setSelectedSymbol(item.symbol)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700 }}>{item.symbol}</span>
                    <span className={`${styles.badge} ${getAlignmentClass(item.alignment)}`} style={{ fontSize: '0.65rem', alignSelf: 'flex-start' }}>
                      {item.alignment?.toUpperCase()} ALIGNMENT
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatNum(item.close)}</div>
                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>Vol: {item.volumeRatio.toFixed(1)}x</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => fetchData()} className={styles.refreshButton} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Update Analisis
            </button>
            <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '1rem', textAlign: 'center' }}>
              Watchlist diurutkan berdasarkan keselarasan konteks teknikal (Trend, Momentum, Partisipasi, Risiko).
            </p>
          </aside>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {selectedData && (
              <>
                {/* PRIORITY REASON BOX */}
                <section className={styles.prioritySection}>
                  <div className={styles.priorityTitle}>
                    ⚡ Focus Insight: {selectedData.symbol}
                    <span className={`${styles.badge} ${getAlignmentClass(selectedData.alignment)}`} style={{ marginLeft: '1rem' }}>
                      {selectedData.alignment} Confluence
                    </span>
                  </div>
                  <div className={styles.priorityReason}>
                    {selectedData.alignmentReason}
                  </div>

                  {selectedData.contexts && (
                    <div className={styles.contextGrid}>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Trend</span>
                        <span className={styles.contextValue}>{selectedData.contexts.trend}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Momentum</span>
                        <span className={styles.contextValue}>{selectedData.contexts.momentum}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Participation</span>
                        <span className={styles.contextValue}>{selectedData.contexts.participation}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Volatility</span>
                        <span className={styles.contextValue}>{selectedData.contexts.volatility}</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* INSIGHT CARD */}
                <section className={styles.insightSection}>
                  <h3 className={styles.insightTitle}>💡 Narasi Deskriptif</h3>
                  <ul className={styles.insightList}>
                    {insights.map((text, i) => (
                      <li key={i} className={styles.insightItem}>{text}</li>
                    ))}
                  </ul>
                </section>

                <div className={styles.chartSection}>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Visualisasi Context-Aware</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className={`${styles.badge} ${selectedData.volatilityStatus === 'High' ? styles.badgeFail : styles.badgeNeutral}`}>
                        ATR: {selectedData.volatilityStatus}
                      </span>
                    </div>
                  </div>
                  <StockChart data={selectedData} />
                </div>

                {/* HYPOTHESIS TESTING */}
                <section className={styles.chartSection} style={{ marginTop: '2rem', background: '#f8fafc' }}>
                  <h3 className={styles.insightTitle}>🧪 Hypothesis Testing Module</h3>
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
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Periode:</label>
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
              </>
            )}
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p><strong>Filosofi Watchlist Prioritasi:</strong></p>
          <p>Watchlist ini diurutkan secara kualitatif berdasarkan **Keselarasan Konteks (Confluence)** antara Tren, Momentum, Partisipasi Pasar, dan Volatilitas. Urutan ini bukan merupakan peringkat absolut atau sinyal beli/jual.</p>
          <p>Saham yang berada di posisi lebih atas dianggap memenuhi lebih banyak kriteria teknikal secara bersamaan, sehingga layak untuk **diobservasi lebih lanjut** sebagai bahan pembelajaran dan pendukung keputusan mandiri Anda.</p>
          <p>Seluruh data bersifat delayed. Kami **tidak memberikan rekomendasi investasi**. Keputusan sepenuhnya adalah tanggung jawab pengguna (DIYOR).</p>
        </div>
      </footer>
    </main>
  );
}
