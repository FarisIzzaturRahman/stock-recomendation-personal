'use client';

import { useEffect, useState } from 'react';
import { AnalysisResult } from '@/types';
import styles from './page.module.css';
import dynamic from 'next/dynamic';

// Import Chart component dynamically to avoid SSR issues with lightweight-charts
const StockChart = dynamic(() => import('@/components/Chart'), { ssr: false });

export default function Home() {
  const [data, setData] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

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

  const formatNum = (val: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(val);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Analisis Pro: Multi-Indikator</h1>
        <p className={styles.subtitle}>MA-20, RSI(14), dan MACD (12, 26, 9) - Bursa Efek Indonesia</p>
      </header>

      {loading && <div className={styles.loading}>Menganalisis data pasar...</div>}
      {error && <div className={styles.error}>Error: {error}</div>}

      {!loading && !error && (
        <div className={styles.layout}>
          {/* Sidebar: Symbol Selector */}
          <aside className={styles.sidebar}>
            <h3 className={styles.selectorTitle}>Daftar Watchlist</h3>
            <div className={styles.symbolList}>
              {data.map((item) => (
                <div
                  key={item.symbol}
                  className={`${styles.symbolItem} ${selectedSymbol === item.symbol ? styles.activeSymbol : ''}`}
                  onClick={() => setSelectedSymbol(item.symbol)}
                >
                  <span style={{ fontWeight: 700 }}>{item.symbol}</span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{formatNum(item.close)}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Content: Chart & Details */}
          <div className={styles.mainContent}>
            {selectedData && (
              <>
                <div className={styles.chartSection}>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{selectedData.symbol} Analysis</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className={`${styles.badge} ${selectedData.isAboveMA20 ? styles.badgeAbove : styles.badgeBelow}`}>
                        {selectedData.isAboveMA20 ? 'Above MA-20' : 'Below MA-20'}
                      </span>
                      <span className={`${styles.badge} ${selectedData.rsiStatus === 'Overbought' ? styles.badgeOverbought :
                        selectedData.rsiStatus === 'Oversold' ? styles.badgeOversold : styles.badgeNeutral
                        }`}>
                        RSI: {formatNum(selectedData.rsi)} ({selectedData.rsiStatus})
                      </span>
                      <span className={`${styles.badge} ${selectedData.macdStatus.includes('Bullish') ? styles.badgeBullish : styles.badgeBearish
                        }`}>
                        MACD: {selectedData.macdStatus}
                      </span>
                    </div>
                  </div>
                  <StockChart data={selectedData} />
                </div>

                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Indikator</th>
                        <th>Nilai / Kondisi</th>
                        <th>Status Analisis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>MA-20</strong></td>
                        <td>{formatNum(selectedData.ma20)}</td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.isAboveMA20 ? styles.badgeAbove : styles.badgeBelow}`}>
                            {selectedData.isAboveMA20 ? 'Harga di atas rata-rata 20 hari' : 'Harga di bawah rata-rata 20 hari'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>RSI (14)</strong></td>
                        <td>{formatNum(selectedData.rsi)}</td>
                        <td>
                          <span className={styles.badgeNeutral}>
                            Momentum {selectedData.rsiStatus}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>MACD</strong></td>
                        <td>
                          Line: {formatNum(selectedData.macd)}<br />
                          Signal: {formatNum(selectedData.signal)}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${selectedData.macdStatus.includes('Bullish') ? styles.badgeBullish : styles.badgeBearish}`}>
                            {selectedData.macdStatus}
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

      <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid #eee', color: '#666', fontSize: '0.9rem' }}>
        <h3>Tentang Analisis</h3>
        <p>Aplikasi ini memberikan gambaran teknikal berdasarkan data historis:</p>
        <ul>
          <li><strong>EMA & MACD:</strong> Menggunakan perhitungan rata-rata eksponensial untuk melihat momentum tren.</li>
          <li><strong>RSI:</strong> Mengukur kecepatan dan perubahan pergerakan harga untuk mengidentifikasi kondisi jenuh.</li>
          <li><strong>Chart Interaktif:</strong> Divisualisasikan menggunakan TradingView Lightweight Charts untuk akurasi data visual.</li>
        </ul>
        <p><em>* Disclaimer: Ini adalah alat bantu analisis teknikal dan bukan merupakan saran beli/jual atau rekomendasi investasi.</em></p>
      </footer>
    </main>
  );
}
