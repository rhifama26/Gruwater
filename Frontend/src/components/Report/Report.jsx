import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Report = () => {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [lokasiFilter, setLokasiFilter] = useState('semua');
  const [lokasiOptions, setLokasiOptions] = useState([]);

  useEffect(() => {
    fetchReport();
    fetchLokasi();
  }, []);

  const fetchLokasi = async () => {
    try {
      const response = await api.get('/lokasi');
      setLokasiOptions((response.data.data || []).map((l) => l.nama_lokasi));
    } catch (error) {
      console.error('Error fetching lokasi:', error);
    }
  };

  const fetchReport = async () => {
    try {
      const response = await api.get('/report/full');
      setReport(response.data.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const response = await api.get('/report/export/excel', {
        params: {
          lokasi: lokasiFilter === 'semua' ? '' : lokasiFilter,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'laporan_kualitas_air_' + new Date().toISOString().split('T')[0] + '.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting excel:', error);
      alert('Gagal mengunduh laporan.');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const classes = {
      Normal: 'status-badge-normal',
      Waspada: 'status-badge-waspada',
      Bahaya: 'status-badge-bahaya',
    };
    return classes[status] || 'status-badge-normal';
  };

  const formatTanggal = (datetimeStr) => {
    if (!datetimeStr) return '-';
    const d = new Date(datetimeStr);
    if (isNaN(d.getTime())) return datetimeStr;
    const pad2 = (n) => String(n).padStart(2, '0');
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dateStr}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  const lokasiList = [
    ...new Set([...lokasiOptions, ...(report?.predictions || []).map((p) => p.lokasi)]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const displayPredictions = (report?.predictions || [])
    .filter((p) => lokasiFilter === 'semua' || p.lokasi === lokasiFilter)
    .sort((a, b) => (a.lokasi || '').localeCompare(b.lokasi || '') || Number(a.step_ke) - Number(b.step_ke));

  const predAvg = (key) => {
    const values = displayPredictions.map((p) => p[key]).filter((v) => v != null);
    return values.length ? values.reduce((a, b) => a + Number(b), 0) / values.length : 0;
  };
  const predSummary = {
    total_data: displayPredictions.length,
    avg_suhu: predAvg('suhu'),
    avg_pH: predAvg('pH'),
    avg_salinitas: predAvg('salinitas'),
    avg_kekeruhan: predAvg('kekeruhan'),
    normal_count: displayPredictions.filter((p) => p.status === 'Normal').length,
    waspada_count: displayPredictions.filter((p) => p.status === 'Waspada').length,
    bahaya_count: displayPredictions.filter((p) => p.status === 'Bahaya').length,
  };

  const signerName = user?.username || 'Petugas/Pengelola';
  const signerRole = user?.role === 'admin' ? 'Administrator' : 'Petugas';

  return (
    <div className="space-y-6 report-print-wrap">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-slate-800">Laporan Kualitas Air</h1>
        <p className="text-sm text-slate-400 mt-1">Ringkasan dan ekspor data kualitas air</p>
      </div>

      <div className="print-only hidden">
        <div className="border-b-4 border-primary pb-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">GRUWATER</h1>
            <p className="text-sm text-slate-500">Sistem Prediksi Kualitas Air Tambak</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-700">Laporan Kualitas Air</p>
            <p className="text-slate-500">Dicetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="card no-print">
        <h3 className="text-base font-bold text-slate-800 mb-4">Pilihan Laporan</h3>
        {lokasiList.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Pilih Tambak</label>
            <select
              value={lokasiFilter}
              onChange={(e) => setLokasiFilter(e.target.value)}
              className="w-full max-w-md border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="semua">Semua Tambak</option>
              {lokasiList.map((lk) => (
                <option key={lk} value={lk}>{lk}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Belum ada tambak terdaftar.</p>
        )}
      </div>

      <div className="card no-print">
        <h3 className="text-base font-bold text-slate-800 mb-4">Ekspor Laporan</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="btn-success disabled:opacity-50 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {exportLoading ? 'Mengunduh...' : 'Export Excel'}
          </button>
          <button onClick={handlePrint} className="btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">Ringkasan Statistik — Hasil Prediksi</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Total Prediksi</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{predSummary.total_data || 0}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Rata-rata Suhu</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{parseFloat(predSummary.avg_suhu || 0).toFixed(1)} <span className="text-sm font-medium text-slate-400">°C</span></p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Rata-rata pH</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{parseFloat(predSummary.avg_pH || 0).toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Rata-rata Salinitas</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{parseFloat(predSummary.avg_salinitas || 0).toFixed(1)} <span className="text-sm font-medium text-slate-400">ppt</span></p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-base font-bold text-slate-800 mb-4">Distribusi Status Risiko — Hasil Prediksi</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Normal</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{predSummary.normal_count || 0}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Waspada</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{predSummary.waspada_count || 0}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider">Bahaya</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{predSummary.bahaya_count || 0}</p>
              </div>
            </div>
          </div>

      {displayPredictions.length > 0 && (
        <div className="card">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Hasil Prediksi
            <span className="text-sm font-normal text-slate-400 ml-2">({displayPredictions.length} prediksi)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm report-table">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Tanggal Prediksi</th>
                  <th className="px-4 py-3 text-left">Lokasi</th>
                  <th className="px-4 py-3 text-left">Langkah Ke</th>
                  <th className="px-4 py-3 text-left">Suhu</th>
                  <th className="px-4 py-3 text-left">pH</th>
                  <th className="px-4 py-3 text-left">Salinitas</th>
                  <th className="px-4 py-3 text-left">Kekeruhan</th>
                  <th className="px-4 py-3 text-left">Skor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayPredictions.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(p.tanggal_prediksi)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.lokasi}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-primary-600">Langkah {p.step_ke}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.suhu}&nbsp;°C</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.pH}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.salinitas}&nbsp;ppt</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.kekeruhan}&nbsp;NTU</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{p.skor_risiko}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={getStatusBadge(p.status)}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="print-only hidden mt-10 report-signature">
        <div className="flex justify-end">
          <div className="text-center text-sm">
            <p className="mb-1">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mb-16">{signerRole}</p>
            <p className="font-semibold border-t border-slate-400 pt-1 w-44">({signerName})</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;
