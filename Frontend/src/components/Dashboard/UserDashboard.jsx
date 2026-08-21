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
} from 'chart.js';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const UserDashboard = () => {
  const [seriesData, setSeriesData] = useState([]);
  const [riskPerLokasi, setRiskPerLokasi] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchAllSeries = async (lokasiList) => {
    try {
      const results = await Promise.all(
        lokasiList.map(async (lokasi) => {
          const response = await api.get('/prediction/latest', { params: { lokasi } });
          return { lokasi, points: response.data.data || [] };
        })
      );
      results.sort((a, b) => a.lokasi.localeCompare(b.lokasi));
      setSeriesData(results);
    } catch (error) {
      console.error('Error fetching prediction series:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/prediction/dashboard');
      const perLokasi = response.data.data.perLokasi || [];
      setRiskPerLokasi(perLokasi);
      await fetchAllSeries(perLokasi.map((item) => item.lokasi));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const TAMBAK_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const RISK_BANDS = [
    { label: 'Batas Normal (≥76)', value: 76, color: '#16a34a' },
    { label: 'Batas Bahaya (≤51)', value: 51, color: '#dc2626' },
  ];

  const chartData = (() => {
    if (seriesData.length === 0) return { labels: [], datasets: [] };
    const labels = Array.from(
      new Set(seriesData.flatMap((s) => s.points.map((p) => p.step_ke)))
    ).sort((a, b) => a - b);
    const datasets = seriesData.map((series, idx) => {
      const color = TAMBAK_COLORS[idx % TAMBAK_COLORS.length];
      const pointMap = new Map(series.points.map((p) => [p.step_ke, p]));
      return {
        label: series.lokasi,
        data: labels.map((h) => {
          const point = pointMap.get(h);
          return point ? point.skor_risiko : null;
        }),
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 30,
      };
    });
    RISK_BANDS.forEach((band) => {
      datasets.push({
        label: band.label,
        data: labels.map(() => band.value),
        borderColor: band.color,
        borderDash: [6, 6],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      });
    });
    return { labels, datasets };
  })();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 12,
          boxWidth: 10,
          font: { size: 11, weight: '500' },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 100,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  const formatDate = (date) =>
    date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const statusCounts = riskPerLokasi.reduce(
    (acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; },
    {}
  );
  const totalTambak = riskPerLokasi.length;

  const renderStatusRow = () => {
    const items = [
      { label: 'Total Tambak', value: totalTambak, icon: 'lokasi', box: 'bg-primary-50 text-primary-500', bar: 'card-stat-teal' },
      { label: 'Normal', value: statusCounts.Normal || 0, icon: 'check', box: 'bg-emerald-50 text-emerald-500', bar: 'card-stat-green' },
      { label: 'Waspada', value: statusCounts.Waspada || 0, icon: 'alert', box: 'bg-amber-50 text-amber-500', bar: 'card-stat-amber' },
      { label: 'Bahaya', value: statusCounts.Bahaya || 0, icon: 'danger', box: 'bg-red-50 text-red-500', bar: 'card-stat-red' },
    ];
    return items.map((it) => (
      <div key={it.label} className={`card-stat ${it.bar}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{it.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{it.value}</p>
          </div>
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${it.box}`}>
            {it.icon === 'lokasi' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            )}
            {it.icon === 'check' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {it.icon === 'alert' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {it.icon === 'danger' && (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </span>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary-600">{getGreeting()}</p>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5">Dashboard Pembudidaya</h1>
          <p className="text-sm text-slate-400 mt-1">Pantau kondisi kualitas air tambak Anda</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-card px-4 py-3">
            <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tambak Dipantau</p>
              <p className="text-sm font-bold text-slate-800">{totalTambak} Tambak</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-card px-4 py-3">
            <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tanggal</p>
              <p className="text-sm font-bold text-slate-800">{formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {renderStatusRow()}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">Tren Skor Risiko per Tambak</h3>
              <p className="text-xs text-slate-400 mt-0.5">Perbandingan skor risiko hasil prediksi semua tambak (semakin tinggi semakin baik)</p>
            </div>
          </div>
        </div>
        {seriesData.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Belum ada hasil prediksi untuk ditampilkan.</div>
        ) : (
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-800">Nilai & Skor Risiko per Tambak</h3>
              <p className="text-xs text-slate-400 mt-0.5">Nilai terburuk dalam 1 hari tiap lokasi tambak beserta rekomendasi</p>
            </div>
          </div>
        </div>
        {riskPerLokasi.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Belum ada data prediksi untuk ditampilkan.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...riskPerLokasi].sort((a, b) => a.lokasi.localeCompare(b.lokasi)).map((item) => (
              <div key={item.lokasi} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">{item.lokasi}</p>
                  <span className={getStatusBadge(item.status)}>{item.status}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-slate-400">Suhu</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{item.suhu} <span className="text-xs font-medium text-slate-400">°C</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">pH</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{item.pH}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Salinitas</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{item.salinitas} <span className="text-xs font-medium text-slate-400">ppt</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Kekeruhan</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{item.kekeruhan} <span className="text-xs font-medium text-slate-400">NTU</span></p>
                  </div>
                </div>
                <div className="flex items-end gap-1 mt-4">
                  <p className="text-2xl font-bold" style={{ color: getRiskColor(item.status) }}>{item.skor_risiko}</p>
                  <p className="text-sm text-slate-400 mb-1">/100</p>
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3">Rekomendasi</p>
                <p className="text-sm text-slate-600 mt-1">{item.rekomendasi}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
