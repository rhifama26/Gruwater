import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const formatWaktu = (datetimeStr) => {
  if (!datetimeStr) return '';
  const d = new Date(datetimeStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const getStatusBadge = (status) => {
  const classes = {
    Normal: 'status-badge-normal',
    Waspada: 'status-badge-waspada',
    Bahaya: 'status-badge-bahaya',
  };
  return classes[status] || 'status-badge-normal';
};

const History = () => {
  const [locations, setLocations] = useState([]);
  const [lokasi, setLokasi] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (lokasi) fetchPredictions();
  }, [lokasi]);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/lokasi');
      const data = response.data.data || [];
      setLocations(data);
      if (data.length > 0) setLokasi(data[0].nama_lokasi);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await api.get('/prediction/latest', { params: { lokasi } });
      setPredictions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const handleLokasiChange = (e) => {
    setLokasi(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Memuat riwayat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Historis</h1>
        <p className="text-sm text-slate-400 mt-1">Hasil prediksi kualitas air per langkah (interval 15 menit)</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h3 className="text-base font-bold text-slate-800">
            Hasil Prediksi
            <span className="text-sm font-normal text-slate-400 ml-2">({predictions.length} langkah)</span>
          </h3>
          <select
            value={lokasi}
            onChange={handleLokasiChange}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          >
            {locations.length === 0 && <option value="">Belum ada lokasi</option>}
            {locations.map((loc) => (
              <option key={loc.id} value={loc.nama_lokasi}>{loc.nama_lokasi}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Langkah Ke</th>
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Suhu</th>
                <th className="px-4 py-3 text-left">pH</th>
                <th className="px-4 py-3 text-left">Salinitas</th>
                <th className="px-4 py-3 text-left">Kekeruhan</th>
                <th className="px-4 py-3 text-left">Skor</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Belum ada hasil prediksi untuk lokasi ini.</p>
                  </td>
                </tr>
              ) : (
                predictions.map((p) => (
                  <tr key={p.step_ke} className="table-row">
                    <td className="px-4 py-3 font-semibold text-primary-600">{p.step_ke}</td>
                    <td className="px-4 py-3">{formatWaktu(p.tanggal_prediksi)}</td>
                    <td className="px-4 py-3">{p.suhu} °C</td>
                    <td className="px-4 py-3">{p.pH}</td>
                    <td className="px-4 py-3">{p.salinitas} ppt</td>
                    <td className="px-4 py-3">{p.kekeruhan} NTU</td>
                    <td className="px-4 py-3 font-medium">{p.skor_risiko}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadge(p.status)}>{p.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;
