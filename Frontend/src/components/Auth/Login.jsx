import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.registered) {
      setSuccess('Akun berhasil dibuat. Silakan login.');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate(result.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-slate-100">
      <div className="w-full grid md:grid-cols-2 gap-0">
        <div className="flex flex-col justify-center p-4 md:p-8">
          <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mt-5">GruWater</h1>
            <p className="text-slate-400 mt-1.5 text-sm">Sistem Prediksi Kualitas Air Laut</p>
            <p className="text-xs text-slate-300 mt-1 font-medium">GRU + PSO Optimization</p>
          </div>

          <div className="bg-white rounded-2xl shadow-elevated border border-slate-100 p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label-field">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="Masukkan username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-6">
                <label className="label-field">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Masukkan password"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl font-semibold text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 disabled:opacity-50 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500 mb-3">
                Belum punya akun?{' '}
                <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                  Daftar di sini
                </Link>
              </p>

            </div>
          </div>
          </div>
        </div>

        <div className="hidden md:block relative min-h-[640px] overflow-hidden bg-gradient-to-b from-teal-500 via-teal-700 to-emerald-950">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="45%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>
              <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width="1200" height="800" fill="url(#ocean)" />
            <circle cx="900" cy="170" r="130" fill="url(#sunGlow)" />
            <circle cx="900" cy="170" r="62" fill="url(#sun)" />

            <path d="M0 260 Q150 220 300 260 T600 260 T900 260 T1200 260 V800 H0 Z" fill="#064e3b" opacity="0.55" />
            <path d="M0 300 Q150 260 300 300 T600 300 T900 300 T1200 300 V800 H0 Z" fill="#065f46" opacity="0.7" />
            <path d="M0 350 Q150 310 300 350 T600 350 T900 350 T1200 350 V800 H0 Z" fill="#064e3b" />

            <g fill="#99f6e4" opacity="0.85">
              <circle cx="120" cy="480" r="3" />
              <circle cx="260" cy="420" r="2" />
              <circle cx="420" cy="520" r="3" />
              <circle cx="560" cy="460" r="2" />
              <circle cx="720" cy="540" r="3" />
              <circle cx="880" cy="430" r="2" />
              <circle cx="1040" cy="500" r="3" />
              <circle cx="1140" cy="560" r="2" />
            </g>

            <g fill="#ccfbf1" opacity="0.9">
              <circle cx="180" cy="430" r="2" />
              <circle cx="340" cy="560" r="2" />
              <circle cx="500" cy="400" r="2" />
              <circle cx="660" cy="600" r="2" />
              <circle cx="820" cy="480" r="2" />
              <circle cx="980" cy="620" r="2" />
            </g>

            <g fill="#d1fae5">
              <path d="M170 640 Q200 600 230 640 L220 640 Q200 620 180 640 Z" />
              <path d="M150 660 Q185 615 220 660 L205 660 Q185 635 165 660 Z" />
              <path d="M140 690 Q180 640 220 690 L200 690 Q180 660 160 690 Z" />
            </g>

            <g fill="#a7f3d0">
              <path d="M960 600 Q1000 550 1040 600 L1020 600 Q1000 570 980 600 Z" />
              <path d="M980 630 Q1020 580 1060 630 L1040 630 Q1020 600 1000 630 Z" />
              <path d="M950 665 Q1000 610 1050 665 L1025 665 Q1000 630 975 665 Z" />
            </g>

            <g fill="#f43f5e">
              <path d="M520 420 l18 -30 l18 30 l-13 -4 l-5 18 l-10 -18 l-10 18 l-5 -18 Z" />
              <circle cx="543" cy="400" r="2.5" fill="#0f172a" />
            </g>
            <g fill="#fb923c">
              <path d="M760 380 l16 -26 l16 26 l-12 -3 l-4 16 l-9 -16 l-9 16 l-4 -16 Z" />
              <circle cx="781" cy="364" r="2.5" fill="#0f172a" />
            </g>
            <g fill="#4ade80">
              <path d="M420 660 l15 -24 l15 24 l-11 -3 l-4 15 l-8 -15 l-8 15 l-4 -15 Z" />
              <circle cx="440" cy="646" r="2.5" fill="#0f172a" />
            </g>
            <g fill="#2dd4bf">
              <path d="M1050 470 l14 -22 l14 22 l-10 -3 l-3 13 l-8 -13 l-8 13 l-3 -13 Z" />
              <circle cx="1069" cy="456" r="2.5" fill="#0f172a" />
            </g>
          </svg>

          <div className="relative z-10 flex flex-col justify-center h-full p-10 lg:p-14 text-white">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-[0.25em] mb-3">
              Sistem Prediksi Kualitas Air Laut
            </p>
            <h2 className="text-4xl font-bold leading-tight">
              Pantau Kualitas Air Sejak Dini,
              <br />
              Cegah Risiko Lebih Awal
            </h2>
            <p className="mt-5 text-teal-50 text-sm leading-relaxed max-w-md">
              Prediksi suhu, pH, salinitas, dan kekeruhan air laut 1 hari ke depan
              dengan akurasi tinggi untuk mendukung pengelolaan tambak yang aman
              dan berkelanjutan.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 max-w-md">
              <div className="flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">GRU — Deep Learning</h3>
                  <p className="text-teal-50/90 text-sm leading-relaxed mt-1">
                    Gated Recurrent Unit menangkap pola deret waktu suhu, pH, salinitas,
                    dan kekeruhan untuk memprediksi kondisi air di masa mendatang.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">PSO — Optimasi Cerdas</h3>
                  <p className="text-teal-50/90 text-sm leading-relaxed mt-1">
                    Particle Swarm Optimization mencari hyperparameter GRU terbaik
                    secara otomatis, menghasilkan akurasi prediksi yang lebih optimal.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <svg className="w-6 h-6 text-teal-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a4.5 4.5 0 110 9 4.5 4.5 0 010-9zM12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M5.636 5.636l1.591 1.591M16.773 16.773l1.591 1.591M18.364 5.636l-1.591 1.591M7.227 16.773l-1.591 1.591" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Hasil Akurat</h3>
                  <p className="text-teal-50/90 text-sm leading-relaxed mt-1">
                    Skor risiko (WQI) dan status Normal, Waspada, atau Bahaya
                    beserta rekomendasi mitigasi untuk keputusan cepat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
