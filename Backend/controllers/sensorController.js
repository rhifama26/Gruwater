const fs = require('fs');
const path = require('path');

const DATA_MASUK_DIR = path.join(__dirname, '..', '..', 'data_masuk');
const INGEST_TOKEN = process.env.SENSOR_INGEST_TOKEN || '';

const pad = (n) => String(n).padStart(2, '0');
const nowTimestamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const parseTimestamp = (ts) => {
  if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts.trim())) {
    return ts.trim();
  }
  return nowTimestamp();
};

const ingest = (req, res) => {
  const auth = req.headers['authorization'] || '';
  if (!INGEST_TOKEN || auth !== `Bearer ${INGEST_TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }

  const { kja_id, ph, salinitas, suhu, kekeruhan, status, timestamp } = req.body;
  const nilai = [ph, salinitas, suhu, kekeruhan].map(Number);
  if (kja_id === undefined || nilai.some((v) => isNaN(v))) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const ts = parseTimestamp(timestamp);
  try {
    if (!fs.existsSync(DATA_MASUK_DIR)) fs.mkdirSync(DATA_MASUK_DIR, { recursive: true });
    const file = path.join(DATA_MASUK_DIR, `sensor_${ts.slice(0, 10)}.csv`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, 'kja_id,ph,salinitas,suhu,kekeruhan,status,timestamp\n');
    }
    fs.appendFileSync(
      file,
      `${kja_id},${nilai[0].toFixed(2)},${nilai[1].toFixed(2)},${nilai[2].toFixed(2)},${nilai[3].toFixed(2)},${status || ''},${ts}\n`
    );
    return res.status(201).json({ success: true, message: 'Data tersimpan' });
  } catch (err) {
    console.error('Gagal menulis CSV data_masuk:', err.message);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan data' });
  }
};

module.exports = { ingest };
