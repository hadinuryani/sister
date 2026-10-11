import React, { useState, useEffect } from 'react';
import {
  syncCristian,
  fetchLamportStatus,
  triggerLamportTick,
  fetchMutexState,
  simulateMutexConcurrency,
  getClientLamportClock,
} from '../services/api';
import { IconClock, IconRefresh, IconCheck, IconActivity } from '../components/Icons';

export default function SyncPage({ showToast }) {
  // --- Cristian Algorithm State ---
  const [cristianData, setCristianData] = useState(null);
  const [isSyncingCristian, setIsSyncingCristian] = useState(false);

  // --- Lamport Clock State ---
  const [lamportData, setLamportData] = useState({ currentClock: 1, history: [] });
  const [clientClock, setClientClock] = useState(getClientLamportClock());
  const [isLoadingLamport, setIsLoadingLamport] = useState(false);

  // --- Mutex State ---
  const [mutexState, setMutexState] = useState({ isLocked: false, lockedBy: null, queueLength: 0, queue: [] });
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Load initial data
  useEffect(() => {
    loadLamport();
    loadMutex();
    const interval = setInterval(() => {
      loadMutex();
      setClientClock(getClientLamportClock());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncCristian = async () => {
    setIsSyncingCristian(true);
    try {
      const res = await syncCristian();
      setCristianData(res);
      showToast('Sinkronisasi jam fisik (Cristian) berhasil dieksekusi!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal sinkronisasi Cristian', 'error');
    } finally {
      setIsSyncingCristian(false);
    }
  };

  const loadLamport = async () => {
    try {
      const data = await fetchLamportStatus();
      setLamportData(data);
      setClientClock(getClientLamportClock());
    } catch {
      // silent background retry
    }
  };

  const handleLamportTick = async () => {
    setIsLoadingLamport(true);
    try {
      const data = await triggerLamportTick();
      setLamportData(data);
      showToast('Event lokal berhasil dipicu (Aturan 1: C = C + 1)', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal memicu tick Lamport', 'error');
    } finally {
      setIsLoadingLamport(false);
    }
  };

  const loadMutex = async () => {
    try {
      const state = await fetchMutexState();
      setMutexState(state);
    } catch {
      // silent background retry
    }
  };

  const handleSimulateMutex = async () => {
    setIsSimulating(true);
    setSimulationLogs([]);
    try {
      const res = await simulateMutexConcurrency();
      setSimulationLogs(res.logs || []);
      setMutexState(res.state || mutexState);
      showToast('Simulasi konkurensi 3 proses selesai tanpa race condition!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal simulasi mutex', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <section className="page-section sync-page-container">
      {/* Header Halaman */}
      <div className="section-header-row">
        <div>
          <h1 className="page-heading">Sinkronisasi Sistem Terdistribusi</h1>
          <p className="page-description">
            Implementasi materi Pertemuan 07: Algoritma Cristian (Jam Fisik), Jam Logika Lamport, dan Mutual Exclusion Terpusat.
          </p>
        </div>
        <div className="sync-badges-group">
          <span className="sync-badge-client">Client LC: {clientClock}</span>
          <span className="sync-badge-server">Server LC: {lamportData.currentClock}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BAGIAN 1: ALGORITMA CRISTIAN (JAM FISIK)
          ───────────────────────────────────────────────────────────── */}
      <div className="sync-card">
        <div className="sync-card-header">
          <div className="sync-card-title-group">
            <span className="sync-step-pill">Algoritma 1</span>
            <h2 className="sync-card-title">Sinkronisasi Jam Fisik: Algoritma Cristian</h2>
          </div>
          <button
            type="button"
            className="action-btn-primary"
            onClick={handleSyncCristian}
            disabled={isSyncingCristian}
          >
            {isSyncingCristian ? <span className="minimal-spinner small" /> : <IconClock size={15} />}
            <span>Sinkronkan Jam Fisik Sekarang</span>
          </button>
        </div>

        <p className="sync-card-desc">
          Menggunakan model request-response untuk mengestimasi latensi jaringan bolak-balik (Round Trip Time / RTT)
          dan menghitung clock offset (&theta;) antara mesin Client dan Server waktu.
        </p>

        {/* Rumus Matematis Slide 22-25 */}
        <div className="sync-formula-box">
          <div className="formula-col">
            <span className="formula-label">Round Trip Time (RTT):</span>
            <code className="formula-code">RTT = (T4 - T1) - (T3 - T2)</code>
          </div>
          <div className="formula-col">
            <span className="formula-label">Clock Offset (&theta;):</span>
            <code className="formula-code">&theta; = ((T2 - T1) + (T3 - T4)) / 2</code>
          </div>
          <div className="formula-col">
            <span className="formula-label">Waktu Tersinkronisasi:</span>
            <code className="formula-code">T_sync = T3 + (RTT / 2)</code>
          </div>
        </div>

        {cristianData ? (
          <div className="cristian-results-wrap">
            <div className="cristian-metrics-grid">
              <div className="metric-box">
                <span className="metric-label">T1 (Kirim Client)</span>
                <span className="metric-value font-mono">{cristianData.t1}</span>
                <span className="metric-sub">{new Date(cristianData.t1).toLocaleTimeString('id-ID')}.{String(cristianData.t1 % 1000).padStart(3, '0')}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">T2 (Terima Server)</span>
                <span className="metric-value font-mono">{cristianData.t2}</span>
                <span className="metric-sub">{new Date(cristianData.t2).toLocaleTimeString('id-ID')}.{String(cristianData.t2 % 1000).padStart(3, '0')}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">T3 (Balas Server)</span>
                <span className="metric-value font-mono">{cristianData.t3}</span>
                <span className="metric-sub">{new Date(cristianData.t3).toLocaleTimeString('id-ID')}.{String(cristianData.t3 % 1000).padStart(3, '0')}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">T4 (Terima Client)</span>
                <span className="metric-value font-mono">{cristianData.t4}</span>
                <span className="metric-sub">{new Date(cristianData.t4).toLocaleTimeString('id-ID')}.{String(cristianData.t4 % 1000).padStart(3, '0')}</span>
              </div>
            </div>

            <div className="cristian-summary-banner">
              <div className="summary-stat">
                <span className="stat-title">Network RTT</span>
                <span className="stat-number highlight-blue">{cristianData.rtt} ms</span>
                <span className="stat-hint">Total jeda bolak-balik jaringan</span>
              </div>
              <div className="summary-stat">
                <span className="stat-title">Clock Offset (&theta;)</span>
                <span className="stat-number highlight-green">
                  {cristianData.offset >= 0 ? `+${cristianData.offset}` : cristianData.offset} ms
                </span>
                <span className="stat-hint">Selisih jam client vs server</span>
              </div>
              <div className="summary-stat">
                <span className="stat-title">Akurasi Sinkronisasi</span>
                <span className="stat-number highlight-amber">&plusmn; {Math.round(cristianData.rtt / 2)} ms</span>
                <span className="stat-hint">Batas kesalahan &plusmn; (RTT/2)</span>
              </div>
              <div className="summary-stat">
                <span className="stat-title">Waktu Tersinkronisasi</span>
                <span className="stat-number text-light">
                  {new Date(cristianData.syncTime).toLocaleTimeString('id-ID')}.{String(cristianData.syncTime % 1000).padStart(3, '0')}
                </span>
                <span className="stat-hint">T3 + (RTT / 2)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="sync-placeholder-box">
            <p>Klik tombol <strong>"Sinkronkan Jam Fisik Sekarang"</strong> di atas untuk mengukur $T_1, T_2, T_3, T_4$ secara real-time.</p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BAGIAN 2: JAM LOGIKA LAMPORT (HAPPENED-BEFORE)
          ───────────────────────────────────────────────────────────── */}
      <div className="sync-card">
        <div className="sync-card-header">
          <div className="sync-card-title-group">
            <span className="sync-step-pill">Algoritma 2</span>
            <h2 className="sync-card-title">Sinkronisasi Jam Logika: Lamport's Logical Clock</h2>
          </div>
          <div className="button-group-row">
            <button
              type="button"
              className="action-btn-secondary"
              onClick={handleLamportTick}
              disabled={isLoadingLamport}
            >
              <span>+ Picu Kejadian Lokal (Aturan 1)</span>
            </button>
            <button
              type="button"
              className="action-btn-secondary"
              onClick={loadLamport}
            >
              <IconRefresh size={14} />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        <p className="sync-card-desc">
          Mengurutkan peristiwa kausal dalam sistem terdistribusi menggunakan relasi <em>happened-before</em> (a &rarr; b &rArr; C(a) &lt; C(b)).
          Setiap proses (Client, REST API, RMI Inventory, RPC Payment) menyematkan nilai jam logika ke dalam payload.
        </p>

        {/* 3 Aturan Lamport Slide 47 & 49 */}
        <div className="lamport-rules-grid">
          <div className="rule-card">
            <span className="rule-badge">Aturan 1</span>
            <strong className="rule-title">Internal Event</strong>
            <p className="rule-desc">Sebelum menjalankan kejadian internal pada proses P<sub>i</sub>, naikkan jam: <code>C<sub>i</sub> = C<sub>i</sub> + 1</code></p>
          </div>
          <div className="rule-card">
            <span className="rule-badge">Aturan 2</span>
            <strong className="rule-title">Send Event</strong>
            <p className="rule-desc">Saat proses P<sub>i</sub> mengirim pesan <em>m</em>, sematkan timestamp <code>t<sub>m</sub> = C<sub>i</sub></code> ke dalam pesan.</p>
          </div>
          <div className="rule-card">
            <span className="rule-badge">Aturan 3</span>
            <strong className="rule-title">Receive Event</strong>
            <p className="rule-desc">Saat P<sub>j</sub> menerima <em>m(t<sub>m</sub>)</em>, perbarui jam logika: <code>C<sub>j</sub> = max(C<sub>j</sub>, t<sub>m</sub>) + 1</code></p>
          </div>
        </div>

        {/* Tabel Riwayat Event Lamport */}
        <div className="lamport-table-wrap">
          <h3 className="section-subheading">Riwayat Kejadian & Relasi Causal Sistem</h3>
          {lamportData.history && lamportData.history.length > 0 ? (
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Clock (C)</th>
                  <th>Tipe Kejadian</th>
                  <th>Proses</th>
                  <th>Deskripsi Kausal</th>
                  <th>Waktu Fisik</th>
                </tr>
              </thead>
              <tbody>
                {lamportData.history.slice(-8).reverse().map((ev) => (
                  <tr key={ev.eventId}>
                    <td className="font-mono text-muted">{ev.eventId}</td>
                    <td>
                      <span className="clock-badge">C = {ev.clock}</span>
                    </td>
                    <td>
                      <span className={`type-tag type-${(ev.type || '').toLowerCase()}`}>
                        {ev.type}
                      </span>
                    </td>
                    <td className="font-medium">{ev.process}</td>
                    <td>{ev.description}</td>
                    <td className="text-muted font-mono">{ev.timestamp.split('T')[1].replace('Z', '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-hint">Belum ada riwayat kejadian. Buat pesanan baru atau klik "Picu Kejadian Lokal".</p>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BAGIAN 3: DISTRIBUTED MUTUAL EXCLUSION (CENTRALIZED)
          ───────────────────────────────────────────────────────────── */}
      <div className="sync-card">
        <div className="sync-card-header">
          <div className="sync-card-title-group">
            <span className="sync-step-pill">Algoritma 3</span>
            <h2 className="sync-card-title">Distributed Mutual Exclusion: Centralized Coordinator</h2>
          </div>
          <button
            type="button"
            className="action-btn-primary"
            onClick={handleSimulateMutex}
            disabled={isSimulating}
          >
            {isSimulating ? <span className="minimal-spinner small" /> : <IconActivity size={15} />}
            <span>Simulasi Konkurensi 3 Proses (P1, P2, P3)</span>
          </button>
        </div>

        <p className="sync-card-desc">
          Mencegah race condition ketika beberapa proses melakukan pemesanan dan mengubah stok bersamaan.
          Koordinator mengelola token lock dengan antrean FIFO. Jika lock sedang dipegang, proses lain wajib menunggu.
        </p>

        {/* Status Lock Real-Time */}
        <div className="mutex-status-dashboard">
          <div className="mutex-status-pill-box">
            <span className="status-label">Status Lock:</span>
            <span className={`mutex-state-pill ${mutexState.isLocked ? 'state-locked' : 'state-free'}`}>
              <span className="state-dot" />
              <span>{mutexState.isLocked ? 'LOCKED (Sedang Digunakan)' : 'FREE / IDLE'}</span>
            </span>
          </div>

          <div className="mutex-status-info">
            <div className="info-block">
              <span className="info-title">Pemegang Lock Saat Ini:</span>
              <span className="info-value font-mono">{mutexState.lockedBy || 'Tidak Ada'}</span>
            </div>
            <div className="info-block">
              <span className="info-title">Antrean Menunggu (FIFO):</span>
              <span className="info-value font-mono">{mutexState.queueLength} Proses</span>
            </div>
          </div>
        </div>

        {/* Live Terminal Log Simulasi Konkurensi */}
        {simulationLogs.length > 0 && (
          <div className="simulation-terminal-wrap">
            <div className="terminal-header">
              <span className="terminal-title">Terminal Log Eksekusi Koordinator Terpusat (FIFO Queue)</span>
              <span className="terminal-badge">Race Condition: 0% Terhindar</span>
            </div>
            <div className="terminal-body font-mono">
              {simulationLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`terminal-line ${
                    log.includes('GRANT')
                      ? 'log-grant'
                      : log.includes('BUSY') || log.includes('WAIT')
                      ? 'log-wait'
                      : log.includes('RELEASE')
                      ? 'log-release'
                      : log.includes('START') || log.includes('SELESAI')
                      ? 'log-highlight'
                      : ''
                  }`}
                >
                  <span className="line-num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="line-text">{log}</span>
                </div>
              ))}
            </div>
            <div className="terminal-footer">
              <IconCheck size={14} className="terminal-check-icon" />
              <span>
                Simulasi membuktikan seluruh transaksi dieksekusi secara serial (satu per satu) dalam Critical Section tanpa merusak integritas stok.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
