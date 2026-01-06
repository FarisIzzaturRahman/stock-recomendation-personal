'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnalysisResult, ContextAlignment, RetrospectiveAnalysis } from '@/types';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import { generateInsights } from '@/lib/insights';
import { getIDXMarketStatus, formatWIBTime, MarketStatus } from '@/lib/market';
import { runRetrospectiveAnalysis } from '@/lib/retrospective';

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

  // Retrospective State
  const [retrospectiveData, setRetrospectiveData] = useState<RetrospectiveAnalysis | null>(null);

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
    if (selectedData && selectedData.contexts) {
      const setup = {
        isAboveMA20: selectedData.isAboveMA20,
        trend: selectedData.contexts.trend,
        momentum: selectedData.contexts.momentum,
        participation: selectedData.contexts.participation,
        volatility: selectedData.contexts.volatility
      };
      const result = runRetrospectiveAnalysis(selectedData.history, setup);
      setRetrospectiveData(result);
    }
  }, [selectedData]);

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

                  {selectedData.contexts?.isDivergent && (
                    <div className={styles.divergenceWarning}>
                      ⚠️ <strong>Observasi Divergensi:</strong> {selectedData.contexts.divergenceReason}
                    </div>
                  )}

                  {selectedData.contexts && (
                    <div className={styles.contextGrid}>
                      <div className={styles.contextItem}>
                        <div className={styles.contextIcon}>📈</div>
                        <span className={styles.contextLabel}>Trend</span>
                        <span className={styles.contextValue}>
                          {selectedData.contexts.trend}
                          {selectedData.contexts.trendLongevity && selectedData.contexts.trendLongevity > 1 && (
                            <span className={styles.longevityBadge}>{selectedData.contexts.trendLongevity}D</span>
                          )}
                        </span>
                      </div>
                      <div className={styles.contextItem}>
                        <div className={styles.contextIcon}>⚡</div>
                        <span className={styles.contextLabel}>Momentum</span>
                        <span className={styles.contextValue}>{selectedData.contexts.momentum}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <div className={styles.contextIcon}>👥</div>
                        <span className={styles.contextLabel}>Participation</span>
                        <span className={styles.contextValue}>{selectedData.contexts.participation}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <div className={styles.contextIcon}>🌊</div>
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

                {/* RETROSPECTIVE EXPLORATION */}
                <section className={styles.chartSection} style={{ marginTop: '2rem', background: '#f8fafc' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 className={styles.insightTitle}>🔍 What usually happens after this setup?</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Eksplorasi retrospektif: Mencari kejadian serupa di masa lalu (1 tahun terakhir) dan mengamati hasil 5, 10, dan 20 hari setelahnya.
                    </p>
                  </div>

                  {selectedData.contexts && (
                    <div className={styles.setupDisplay}>
                      <span className={styles.setupTag}>Tren: {selectedData.contexts.trend}</span>
                      <span className={styles.setupTag}>Momentum: {selectedData.contexts.momentum}</span>
                      <span className={styles.setupTag}>Partisipasi: {selectedData.contexts.participation}</span>
                      <span className={styles.setupTag}>Volatilitas: {selectedData.contexts.volatility}</span>
                    </div>
                  )}

                  {retrospectiveData && retrospectiveData.totalOccurrences > 0 ? (
                    <>
                      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#1e293b' }}>
                        Ditemukan <strong>{retrospectiveData.totalOccurrences} kejadian serupa</strong> dalam sejarah historis. Berikut adalah hasil probabilistiknya:
                      </div>
                      <div className={styles.horizonGrid}>
                        {retrospectiveData.stats.map(stat => (
                          <div key={stat.horizon} className={styles.statCard}>
                            <div className={styles.statLabel}>{stat.horizon} Hari Perdagangan Setelehnya</div>
                            <div className={styles.statValue} style={{ color: stat.positiveRate > 50 ? '#059669' : '#1e293b' }}>
                              {formatNum(stat.positiveRate)}%
                              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.5rem' }}>Higher</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                              Median: <strong>{stat.medianReturn > 0 ? '+' : ''}{formatNum(stat.medianReturn)}%</strong>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                              Rentang Historis: {formatNum(stat.minReturn)}% s/d {formatNum(stat.maxReturn)}%
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        *Hasil di atas merupakan observasi data masa lalu dan bukan jaminan hasil di masa depan. Variasi rentang menunjukkan ketidakpastian pasar yang signifikan.
                      </p>
                    </>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      Setup teknikal ini unik dan tidak ditemukan padanan serupa dalam 1 tahun terakhir untuk emiten ini.
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
