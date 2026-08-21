import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Perbandingan = () => {
  const { isAdmin } = useAuth();
  const [tft, setTft] = useState({ mape: 57.08, rmse: 0.908, mae: 0.792, r2: -0.075 });
  const [gru, setGru] = useState({ mape: 22.85, rmse: 0.4848, mae: 0.3437, r2: 0.8174 });
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeMsg, setOptimizeMsg] = useState(null);

  const fetchComparison = async () => {
    try {
      const response = await api.get('/model/compare');
      if (response.data.success) {
        const data = response.data.data;
        if (data.tft) setTft(data.tft);
        if (data.gru) setGru(data.gru);
      }
    } catch (error) {
      console.error('Error fetching comparison metrics:', error);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const runOptimization = async () => {
    setOptimizing(true);
    setOptimizeMsg(null);
    try {
      const response = await api.post('/model/optimize');
      if (response.data.success) {
        await fetchComparison();
        setOptimizeMsg({ type: 'success', text: response.data.message || 'Hasil training disinkronkan. Metrik model telah diperbarui.' });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Sinkronisasi gagal';
      setOptimizeMsg({ type: 'error', text: msg });
    } finally {
      setOptimizing(false);
    }
  };

  const METRIC_DEFS = [
    { key: 'mape', label: 'MAPE Kekeruhan', unit: '%', lowerBetter: true },
    { key: 'rmse', label: 'RMSE', unit: '', lowerBetter: true },
    { key: 'mae', label: 'MAE', unit: '', lowerBetter: true },
    { key: 'r2', label: 'R² Score', unit: '', lowerBetter: false }
  ];

  const analysis = METRIC_DEFS.map(({ key, label, unit, lowerBetter }) => {
    const t = Number(tft[key]);
    const g = Number(gru[key]);
    const diff = lowerBetter ? t - g : g - t;
    const base = lowerBetter ? t : Math.abs(t);
    const pct = base ? ((Math.abs(diff) / base) * 100).toFixed(1) : null;
    const improvementAbs = lowerBetter ? Math.abs(diff) : diff;
    const winner = diff > 0.000001 ? 'GRU' : diff < -0.000001 ? 'TFT' : 'SAMA';
    return { key, label, unit, lowerBetter, winner, pct, improvementAbs };
  });

  const a = (key) => analysis.find((x) => x.key === key);
  const arrow = (m) => {
    if (m.winner === 'SAMA') return '=';
    return m.winner === 'GRU' ? (m.lowerBetter ? '↓' : '↑') : m.lowerBetter ? '↑' : '↓';
  };

  const gruWins = analysis.filter((m) => m.winner === 'GRU').length;
  const tftWins = analysis.filter((m) => m.winner === 'TFT').length;
  const tieCount = analysis.filter((m) => m.winner === 'SAMA').length;

  let conclusion = '';
  if (gruWins > tftWins) {
    conclusion = `Model GRU+PSO lebih unggul dari TFT (menang ${gruWins} dari ${analysis.length} metrik) dalam memprediksi kekeruhan, dengan perbaikan di sebagian besar metrik evaluasi.`;
  } else if (tftWins > gruWins) {
    conclusion = `Model TFT lebih unggul dari GRU+PSO (menang ${tftWins} dari ${analysis.length} metrik) dalam memprediksi kekeruhan.`;
  } else {
    conclusion = `Kedua model memiliki performa yang seimbang${tieCount ? ' dengan beberapa metrik seri' : ''} dalam memprediksi kekeruhan.`;
  }

  const fmt = (v, d = 4) => (v === null || v === undefined ? '-' : Number(v).toFixed(d));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Perbandingan Kinerja Model</h1>
        <p className="text-sm text-slate-400 mt-1">Perbandingan metrik evaluasi model prediksi kekeruhan</p>
        {isAdmin && (
          <div className="mt-4">
            <button
              onClick={runOptimization}
              disabled={optimizing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {optimizing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sinkronisasi...
                </>
              ) : (
                'Update Hasil Training'
              )}
            </button>
            {optimizeMsg && (
              <p className={`mt-2 text-sm ${optimizeMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {optimizeMsg.text}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">Tabel Perbandingan Metrik Kekeruhan (NTU)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Metrik</th>
                <th className="px-4 py-3 text-center">Model TFT (Haris, 2025)</th>
                <th className="px-4 py-3 text-center">Model GRU+PSO (Penelitian Ini)</th>
                <th className="px-4 py-3 text-center">Peningkatan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="px-4 py-3 font-medium">MAPE (%)</td>
                <td className="px-4 py-3 text-center text-red-500 font-bold">{fmt(tft.mape, 2)}%</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold">{fmt(gru.mape, 2)}%</td>
                <td className="px-4 py-3 text-center text-blue-600 font-bold">{arrow(a('mape'))} {a('mape').pct}%</td>
              </tr>
              <tr className="table-row">
                <td className="px-4 py-3 font-medium">RMSE</td>
                <td className="px-4 py-3 text-center">{fmt(tft.rmse)}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold">{fmt(gru.rmse)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-bold">{arrow(a('rmse'))} {a('rmse').pct}%</td>
              </tr>
              <tr className="table-row">
                <td className="px-4 py-3 font-medium">MAE</td>
                <td className="px-4 py-3 text-center">{fmt(tft.mae)}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold">{fmt(gru.mae)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-bold">{arrow(a('mae'))} {a('mae').pct}%</td>
              </tr>
              <tr className="table-row">
                <td className="px-4 py-3 font-medium">R² Score</td>
                <td className="px-4 py-3 text-center text-red-500 font-bold">{fmt(tft.r2)}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-bold">{fmt(gru.r2)}</td>
                <td className="px-4 py-3 text-center text-blue-600 font-bold">{arrow(a('r2'))} {a('r2').improvementAbs.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium">↓ = penurunan (lebih baik), ↑ = peningkatan (lebih baik)</p>

        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
          <p>
            <strong className="text-slate-800">Apa itu kolom "Peningkatan"?</strong>{' '}
            Kolom ini menunjukkan <strong>penurunan relatif</strong> nilai kesalahan (error) model GRU+PSO
            dibandingkan model TFT sebagai baseline. Semakin besar nilainya, semakin besar perbaikan
            yang dihasilkan model GRU+PSO.
          </p>
          <p>
            <strong className="text-slate-800">Cara kerjanya:</strong> untuk metrik yang semakin kecil semakin baik
            (MAPE, RMSE, MAE), peningkatan dihitung dengan rumus{' '}
            <code className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">((nilai_TFT − nilai_GRU) / nilai_TFT) × 100%</code>.
            Contoh MAPE:{' '}
            <code className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">
              ((57.08 − 22.85) / 57.08) × 100% ≈ 60.0%
            </code>{' '}
            artinya kesalahan prediksi berkurang 60% dibanding TFT.
          </p>
          <p>
            Untuk R² (semakin besar semakin baik), peningkatan dihitung sebagai{' '}
            <strong>selisih langsung</strong> nilai R² GRU+PSO dikurangi TFT:{' '}
            <code className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">0.8174 − (−0.0750) = 0.8924</code>.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">Analisis Perbandingan</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600">
          {analysis.map((m) => {
            const isGruWin = m.winner === 'GRU';
            const isTftWin = m.winner === 'TFT';
            const valTft = m.unit === '%' ? `${fmt(tft[m.key], 2)}%` : fmt(tft[m.key]);
            const valGru = m.unit === '%' ? `${fmt(gru[m.key], 2)}%` : fmt(gru[m.key]);
            const improvementVal = m.unit === '%' ? `${arrow(m)} ${m.pct}%` : `${arrow(m)} ${m.improvementAbs.toFixed(4)}`;
            return (
              <li key={m.key}>
                <strong>{m.label}</strong> berubah dari{' '}
                <span className={isTftWin ? 'text-emerald-600 font-bold' : ''}>{valTft}</span> (TFT)
                menjadi <span className={isGruWin ? 'text-emerald-600 font-bold' : ''}>{valGru}</span> (GRU+PSO),
                peningkatan <strong>{improvementVal}</strong>
                {m.winner === 'SAMA' && ' (nilai setara)'}.
              </li>
            );
          })}
        </ul>
        <div className="mt-4 bg-primary-50 border border-primary-200 rounded-xl p-4">
          <p className="text-sm text-primary-800">
            <strong>Kesimpulan:</strong> {conclusion}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Perbandingan;
