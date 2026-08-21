const validateWaterQualityData = (data) => {
  const errors = [];
  if (!data.tanggal) errors.push('Tanggal harus diisi');
  if (!data.lokasi) errors.push('Lokasi harus diisi');
  if (data.suhu === undefined || data.suhu < 0 || data.suhu > 45) errors.push('Suhu tidak valid');
  if (data.pH === undefined || data.pH < 0 || data.pH > 14) errors.push('pH tidak valid');
  if (data.salinitas === undefined || data.salinitas < 0 || data.salinitas > 50) errors.push('Salinitas tidak valid');
  if (data.kekeruhan === undefined || data.kekeruhan < 0) errors.push('Kekeruhan tidak valid');
  return errors;
};

const validateLogin = (data) => {
  const errors = [];
  if (!data.username) errors.push('Username harus diisi');
  if (!data.password) errors.push('Password harus diisi');
  return errors;
};

const validateUser = (data) => {
  const errors = [];
  if (!data.username) errors.push('Username harus diisi');
  if (!data.email) errors.push('Email harus diisi');
  if (!data.password || data.password.length < 6) errors.push('Password minimal 6 karakter');
  return errors;
};

module.exports = { validateWaterQualityData, validateLogin, validateUser };