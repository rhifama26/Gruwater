import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const peakPlugin = {
  id: 'peakMarkers',
  afterDraw(chart) {
    const { ctx, data, scales } = chart;
    if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data.length) return;

    const series = data.datasets.map((ds) => ds.data);
    const n = series[0].length;
    const ranges = series.map((arr) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      return { min, max, span: max - min || 1 };
    });

    const combined = Array.from({ length: n }, (_, i) => {
      let sum = 0;
      series.forEach((arr, k) => {
        sum += (arr[i] - ranges[k].min) / ranges[k].span;
      });
      return sum / series.length;
    });

    let topIdx = 0;
    for (let i = 1; i < combined.length; i++) {
      if (combined[i] > combined[topIdx]) topIdx = i;
    }

    const meta = chart.getDatasetMeta(0);
    const point = meta.data[topIdx];
    if (!point) return;

    const x = point.x;
    const yTop = scales.y.top;
    const yBottom = scales.y.bottom;

    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBottom);
    ctx.stroke();

    const peakTime = data.labels && data.labels[topIdx] ? data.labels[topIdx] : '';
    ctx.setLineDash([]);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u25B2 ' + combined[topIdx].toFixed(3) + ' — ' + peakTime, x, yTop + 10);
    ctx.restore();
  },
};

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

const getRiskColor = (status) => {
  const colors = {
    Normal: '#16a34a',
    Waspada: '#d97706',
    Bahaya: '#dc2626',
  };
  return colors[status] || '#16a34a';
};

const Prediction = () => {
  const [predictions, setPredictions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lokasi, setLokasi] = useState('');
  const defaultDate = new Date();
  defaultDate.setMinutes(0, 0, 0);
  defaultDate.setHours(defaultDate.getHours() + 1);
  const pad2 = (n) => String(n).padStart(2, '0');
  const defaultDateStr =
    defaultDate.getFullYear() + '-' +
    pad2(defaultDate.getMonth() + 1) + '-' +
    pad2(defaultDate.getDate());
  const defaultTimeStr =
    pad2(defaultDate.getHours()) + ':' +
    pad2(defaultDate.getMinutes());

  const [formData, setFormData] = useState({ suhu: '', pH: '', salinitas: '', kekeruhan: '', waktu: defaultDateStr + 'T' + defaultTimeStr });
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (lokasi) {
      fetchLatestPredictions();
    } else {
      setPredictions([]);
    }
  }, [lokasi]);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/lokasi');
      setLocations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleTimeChange = (e) => {
    let v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (v.length >= 2) v = v.slice(0, 2) + ':' + v.slice(2);
    const [hh, mm] = v.split(':');
    if (hh && (parseInt(hh) > 23)) return;
    if (mm && (parseInt(mm) > 59)) return;
    const datePart = formData.waktu.split('T')[0] || defaultDateStr;
    setFormData((prev) => ({ ...prev, waktu: datePart + 'T' + v }));
  };

  const waktuDate = formData.waktu.split('T')[0] || defaultDateStr;
  const waktuTime = formData.waktu.split('T')[1] || defaultTimeStr;

  const fetchLatestPredictions = async () => {
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

  const runPrediction = async () => {
    setRunning(true);
    setMessage(null);

    if (!lokasi) {
      setMessage({ type: 'error', text: 'Pilih lokasi tambak terlebih dahulu.' });
      setRunning(false);
      return;
    }

    const parameterFields = [
      { key: 'Suhu (°C)', value: formData.suhu },
      { key: 'pH', value: formData.pH },
      { key: 'Salinitas (ppt)', value: formData.salinitas },
      { key: 'Kekeruhan (NTU)', value: formData.kekeruhan },
    ];
    const kosong = parameterFields.filter(
      (f) => f.value === '' || f.value === null || f.value === undefined || Number.isNaN(parseFloat(f.value))
    );
    if (kosong.length) {
      setMessage({ type: 'error', text: 'Parameter harus diisi: ' + kosong.map((f) => f.key).join(', ') });
      setRunning(false);
      return;
    }

    try {
      const response = await api.post('/prediction/run', {
        suhu: parseFloat(formData.suhu),
        pH: parseFloat(formData.pH),
        salinitas: parseFloat(formData.salinitas),
        kekeruhan: parseFloat(formData.kekeruhan),
        waktu: formData.waktu,
        lokasi,
      });
      if (response.data.success) {
        setPredictions(response.data.data || []);
        setMessage({ type: 'success', text: 'Prediksi 1 hari ke depan (96 langkah, interval 15 menit) berhasil dijalankan.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal menjalankan prediksi' });
    } finally {
      setRunning(false);
    }
  };

  const runTimestamp = predictions.length > 0 ? predictions[0].tanggal_prediksi : null;
  const runDate = runTimestamp
    ? new Date(runTimestamp).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const runTime = runTimestamp ? formatWaktu(runTimestamp) : '';

  const labels = predictions.map((p) => formatWaktu(p.tanggal_prediksi));

  const getPeakData = (key) => {
    const values = predictions.map((p) => p[key]);
    const max = Math.max(...values);
    const idx = values.indexOf(max);
    return { max, idx };
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Suhu (°C)',
        data: predictions.map((p) => p.suhu),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        fill: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointHitRadius: 25,
      },
      {
        label: 'pH',
        data: predictions.map((p) => p.pH),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointHitRadius: 25,
      },
      {
        label: 'Salinitas (ppt)',
        data: predictions.map((p) => p.salinitas),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        fill: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointHitRadius: 25,
      },
      {
        label: 'Kekeruhan (NTU)',
        data: predictions.map((p) => p.kekeruhan),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        fill: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointHitRadius: 25,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 12, weight: '500' },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(96, 165, 250, 0.35)', drawTicks: false, lineWidth: 1 },
        border: { color: 'rgba(59, 130, 246, 0.5)' },
        ticks: { font: { size: 11 } },
      },
      x: {
        grid: { color: 'rgba(96, 165, 250, 0.35)', lineWidth: 1 },
        border: { color: 'rgba(59, 130, 246, 0.5)' },
        ticks: { font: { size: 11 } },
      },
    },
  };

  const suhuPeak = getPeakData('suhu');
  const phPeak = getPeakData('pH');
  const salinitasPeak = getPeakData('salinitas');
  const kekeruhanPeak = getPeakData('kekeruhan');

  const peakInfo = [
    { label: 'Suhu', value: suhuPeak.max, idx: suhuPeak.idx, time: labels[suhuPeak.idx], color: '#ef4444', unit: '°C' },
    { label: 'pH', value: phPeak.max, idx: phPeak.idx, time: labels[phPeak.idx], color: '#3b82f6', unit: '' },
    { label: 'Salinitas', value: salinitasPeak.max, idx: salinitasPeak.idx, time: labels[salinitasPeak.idx], color: '#8b5cf6', unit: ' ppt' },
    { label: 'Kekeruhan', value: kekeruhanPeak.max, idx: kekeruhanPeak.idx, time: labels[kekeruhanPeak.idx], color: '#f59e0b', unit: ' NTU' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Prediksi Kualitas Air</h1>
        <p className="text-sm text-slate-400 mt-1">Masukkan nilai parameter, lalu jalankan prediksi 1 hari ke depan</p>
      </div>

      <div className="card">
        <h3 className="text-base font-bold text-slate-800 mb-4">Input Parameter Awal</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="w-full md:w-52">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Lokasi Tambak</label>
            <select
              value={lokasi}
              onChange={handleLokasiChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            >
              <option value="" disabled>Pilih lokasi</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.nama_lokasi}>{loc.nama_lokasi}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-52">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={waktuDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, waktu: e.target.value + 'T' + waktuTime }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
          <div className="w-full md:w-52">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Waktu</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:MM"
              value={waktuTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Suhu (°C)</label>
            <input
              type="number"
              step="0.1"
              value={formData.suhu}
              onChange={handleChange('suhu')}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">pH</label>
            <input
              type="number"
              step="0.1"
              value={formData.pH}
              onChange={handleChange('pH')}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Salinitas (ppt)</label>
            <input
              type="number"
              step="0.1"
              value={formData.salinitas}
              onChange={handleChange('salinitas')}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Kekeruhan (NTU)</label>
            <input
              type="number"
              step="0.1"
              value={formData.kekeruhan}
              onChange={handleChange('kekeruhan')}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Prediksi akan menghasilkan 96 langkah (interval 15 menit) untuk 1 hari ke depan
          </p>
          <button
            onClick={runPrediction}
            disabled={running}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Memproses...' : 'Jalankan Prediksi'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {predictions.length === 0 && (
        <div className="card">
          <p className="text-sm text-slate-400 text-center py-8">
            {lokasi ? 'Belum ada hasil prediksi untuk lokasi ini.' : 'Pilih lokasi tambak untuk melihat hasil prediksi.'}
          </p>
        </div>
      )}

      {predictions.length > 0 && (
        <>
          <div className="card">
            <h3 className="text-base font-bold text-slate-800 mb-4">Ringkasan Prediksi</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Lokasi Tambak</p>
                <p className="font-semibold text-slate-800 mt-1">{predictions[0].lokasi || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Waktu Prediksi</p>
                <p className="font-semibold text-slate-800 mt-1">{runDate}, pukul {runTime}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Total Langkah</p>
                <p className="font-semibold text-slate-800 mt-1">96 langkah</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium">Cakupan</p>
                <p className="font-semibold text-slate-800 mt-1">1 hari ke depan</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Nilai Tertinggi Setiap Parameter</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {peakInfo.map((p) => (
                  <div key={p.label} className="rounded-xl p-3 border" style={{ borderColor: p.color + '40', backgroundColor: p.color + '08' }}>
                    <p className="text-xs font-medium" style={{ color: p.color }}>{p.label}</p>
                    <p className="text-lg font-bold text-slate-800">{p.value}{p.unit}</p>
                    <p className="text-xs text-slate-400">{p.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Visualisasi Prediksi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Grafik parameter 1 hari ke depan (96 langkah, interval 15 menit)</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
            </div>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} plugins={[peakPlugin]} />
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              Garis putus-putus menandakan titik tertinggi dari gabungan semua parameter (dinormalisasi per parameter)
            </p>
          </div>

          <div className="card">
            <h3 className="text-base font-bold text-slate-800 mb-4">Hasil Prediksi Detail</h3>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
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
                  {predictions.map((p) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="text-base font-bold text-slate-800 mb-4">Rekomendasi Mitigasi</h3>
            {(() => {
              const total = predictions.length || 1;
              const counts = {
                Normal: predictions.filter((p) => p.status === 'Normal').length,
                Waspada: predictions.filter((p) => p.status === 'Waspada').length,
                Bahaya: predictions.filter((p) => p.status === 'Bahaya').length,
              };
              const pct = (n) => Math.round((n / total) * 100);
              const severity = ['Normal', 'Waspada', 'Bahaya'];
              const dominantStatus = severity.slice().sort(
                (a, b) => counts[b] - counts[a] || severity.indexOf(b) - severity.indexOf(a)
              )[0];
              const worstScore = Math.min(...predictions.map((p) => p.skor_risiko || 0));
              const worstIdx = predictions.findIndex((p) => (p.skor_risiko || 0) === worstScore);
              const worstStatus = worstIdx >= 0 ? predictions[worstIdx].status : 'Normal';
              const worstTime = worstIdx >= 0 ? formatWaktu(predictions[worstIdx].tanggal_prediksi) : '';

              const styles = {
                Normal: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', bar: 'bg-emerald-500' },
                Waspada: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', bar: 'bg-amber-500' },
                Bahaya: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', bar: 'bg-red-500' },
              };
              const recs = {
                Normal: 'Hasil prediksi didominasi kondisi air yang optimal (Normal). Lakukan pemantauan rutin dan pertahankan manajemen pakan serta aerasi.',
                Waspada: 'Hasil prediksi didominasi status Waspada. Kurangi pemberian pakan, tambah aerasi, dan periksa salinitas secara berkala terutama saat periode yang menurun.',
                Bahaya: 'Hasil prediksi didominasi status Bahaya. Segera pindahkan ikan/keramba jika diperlukan, aktifkan aerasi maksimal, hentikan pemberian pakan, dan tingkatkan sirkulasi air.',
              };
              const rank = (s) => severity.indexOf(s);
              const escalated = rank(worstStatus) > rank(dominantStatus);
              const c = styles[dominantStatus];
              const ec = styles[worstStatus];

              return (
                <div className="space-y-4">
                  <div className={`${ec.bg} ${ec.border} rounded-xl p-4`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${ec.text}`}>
                      {escalated ? 'Rekomendasi (Periode Kritis)' : 'Rekomendasi (Periode Terburuk)'}
                    </p>
                    <p className={`text-sm mt-1 ${ec.text}`}>
                      Nilai paling buruk berada pada langkah ke-{worstIdx + 1} (pukul {worstTime}) dengan skor {worstScore}.
                      {escalated && ` Kondisi ini lebih parah dari status dominan (${dominantStatus}), sehingga rekomendasi disesuaikan ke level ${worstStatus}.`}
                    </p>
                    <p className={`text-sm font-semibold mt-2 ${ec.text}`}>{recs[worstStatus]}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status Dominan: <span className={`font-bold ${c.text}`}>{dominantStatus}</span> ({total} langkah)
                    </p>
                    <p className="text-xs text-slate-400">{counts[dominantStatus]} langkah ({pct(counts[dominantStatus])}%)</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Distribusi Status (dari {total} langkah)</p>
                    <div className="flex h-3 rounded-full overflow-hidden">
                      {['Normal', 'Waspada', 'Bahaya'].map((s) =>
                        counts[s] > 0 ? (
                          <div
                            key={s}
                            className={styles[s].bar}
                            style={{ width: `${pct(counts[s])}%` }}
                            title={`${s}: ${counts[s]} langkah`}
                          />
                        ) : null
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {['Normal', 'Waspada', 'Bahaya'].map((s) => (
                        <div key={s} className="rounded-xl p-3 border bg-slate-50">
                          <p className="text-xs font-medium text-slate-400">{s}</p>
                          <p className="text-lg font-bold text-slate-800">
                            {counts[s]} <span className="text-xs font-medium text-slate-400">({pct(counts[s])}%)</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="card">
            {(() => {
              const n = predictions.length || 1;
              const avgSkor = Math.round(predictions.reduce((s, p) => s + (p.skor_risiko || 0), 0) / n);
              const scores = predictions.map((p) => p.skor_risiko || 0);
              const minSkor = Math.min(...scores);
              const maxSkor = Math.max(...scores);
              const st = avgSkor >= 76 ? 'Normal' : avgSkor >= 51 ? 'Waspada' : 'Bahaya';
              const stColor = getRiskColor(st);
              return (
                <>
                  <div className="mb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">Skor Agregat Prediksi</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Rata-rata skor risiko dari {n} langkah prediksi</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 p-5 flex flex-col items-center justify-center">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Skor</p>
                      <div className="flex items-end gap-1 mt-2">
                        <p className="text-4xl font-bold" style={{ color: stColor }}>{avgSkor}</p>
                        <p className="text-lg text-slate-400 mb-1">/100</p>
                      </div>
                      <span className={`${getStatusBadge(st)} mt-3`}>{st}</span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skor Terendah</p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{minSkor} <span className="text-sm font-medium text-slate-400">/100</span></p>
                      <p className="text-xs text-slate-400 mt-1">Langkah dengan kondisi terburuk</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-5">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skor Tertinggi</p>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{maxSkor} <span className="text-sm font-medium text-slate-400">/100</span></p>
                      <p className="text-xs text-slate-400 mt-1">Langkah dengan kondisi terbaik</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default Prediction;
