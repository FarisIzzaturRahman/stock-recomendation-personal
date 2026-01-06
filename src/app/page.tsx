'use client';

import { useEffect, useState } from 'react';
import { AnalysisResult, HypothesisResult } from '@/types';
import styles from './page.module.css';
import dynamic from 'next/dynamic';
import { generateInsights } from '@/lib/insights';
import { runHypothesisTest, HypothesisCondition } from '@/lib/hypothesis';

const StockChart = dynamic(() => import('@/components/Chart'), { ssr: false });

type TimeWindow = '125' | '250' | '500';

export default function Home() {
  const [data, setData] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Hypothesis State
  const [selectedCondition, setSelectedCondition] = useState<HypothesisCondition>('Price > MA-20');
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('250');
  const [hypothesisResult, setHypothesisResult] = useState<HypothesisResult | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json.data);
      if (json.data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(json.data[0].symbol);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <p className={styles.subtitle}>Volume, Volatilitas (ATR), Tren, & Momentum</p>
      </header>

      {loading && <div className={styles.loading}>Menganalisis 500+ hari bursa...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {!loading && !error && (
        <div className={styles.layout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <h3 className={styles.selectorTitle}>Watchlist & Screening</h3>
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
            <button onClick={fetchData} className={styles.refreshButton} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Refresh Market Data
            </button>
          </aside>

          {/* Main Content */}
          <div className={styles.mainContent}>
            {selectedData && (
              <>
                {/* INSIGHT CARD */}
                <section className={styles.insightSection}>
                  <h3 className={styles.insightTitle}>💡 Insight Kontekstual: {selectedData.symbol}</h3>
                  <ul className={styles.insightList}>
                    {insights.map((text, i) => (
                      <li key={i} className={styles.insightItem}>{text}</li>
                    ))}
                  </ul>
                </section>

                <div className={styles.chartSection}>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Visualisasi Multi-Data</h2>
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
                  <h3 className={styles.insightTitle}>🧪 Hypothesis Testing Module</h3>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Pilih Hipotesis:</label>
                      <select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value as HypothesisCondition)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', minWidth: '240px' }}
                      >
                        <option value="Price > MA-20">Price Cross Above MA-20</option>
                        <option value="Price > MA-20 + High Vol">Price {' > '} MA-20 + Volume {' > '} Avg</option>
                        <option value="MACD Bullish Crossover">MACD Bullish Crossover</option>
                        <option value="RSI < 30">RSI Cross Below 30</option>
                        <option value="Volatility Low (ATR)">Volatility High to Low (ATR)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>Periode Historis:</label>
                      <select
                        value={selectedWindow}
                        onChange={(e) => setSelectedWindow(e.target.value as TimeWindow)}
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white' }}
                      >
                        <option value="125">6 Bulan Terakhir</option>
                        <option value="250">1 Tahun Terakhir</option>
                        <option value="500">2 Tahun Terakhir</option>
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
                        <th>Indikator & Konteks</th>
                        <th>Nilai Terkini</th>
                        <th>Keterangan Deskriptif</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Volume (Participation)</strong></td>
                        <td>{formatCompact(selectedData.volume)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.volumeRatio > 1.2 ? styles.badgePass : styles.badgeNeutral}`}>
                            {selectedData.volumeRatio.toFixed(2)}x Rata-rata 20 Hari
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>ATR 14 (Volatility)</strong></td>
                        <td>{formatNum(selectedData.atr)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.volatilityStatus === 'High' ? styles.badgeFail : styles.badgeNeutral
                            }`}>
                            {selectedData.volatilityStatus} ({selectedData.atrRelative.toFixed(2)}% dari harga)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>MA-20 (Trend)</strong></td>
                        <td>{formatNum(selectedData.ma20)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.isAboveMA20 ? styles.badgeAbove : styles.badgeBelow}`}>
                            {selectedData.isAboveMA20 ? 'Di Atas MA-20' : 'Di Bawah MA-20'}
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
          <p><strong>Pernyataan Sanggahan & Edukasi:</strong></p>
          <p>Aplikasi ini dirancang sebagai platform pembelajaran analisis pasar modal. Indikator **Volume** dan **ATR** disajikan untuk memberikan konteks partisipasi dan volatilitas pasar, bukan sebagai instruksi eksekusi transaksi.</p>
          <p>Seluruh data diolah secara mekanis dari sumber sekunder. Kami **TIDAK memberikan rekomendasi investasi** atau saran keuangan. Investasi saham memiliki risiko fluktuasi harga; keputusan sepenuhnya adalah tanggung jawab pengguna individu (DIYOR).</p>
        </div>
      </footer>
    </main>
  );
}
