const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./api/authRoutes');
const dataRoutes = require('./api/dataRoutes');
const modelRoutes = require('./api/modelRoutes');
const predictionRoutes = require('./api/predictionRoutes');
const predictionInputRoutes = require('./api/predictionInputRoutes');
const reportRoutes = require('./api/reportRoutes');
const usersRoutes = require('./api/usersRoutes');
const locationRoutes = require('./api/locationRoutes');
const sensorRoutes = require('./api/sensorRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/prediction-inputs', predictionInputRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/lokasi', locationRoutes);
app.use('/api/sensor', sensorRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server running', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});