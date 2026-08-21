-- Schema lengkap database water_quality_db
-- Dibuat ulang setelah tabel InnoDB rusak (data dictionary tidak cocok).
-- Jalankan: mysql -uroot < Backend/db/schema.sql

CREATE DATABASE IF NOT EXISTS water_quality_db;
USE water_quality_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(70) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS water_quality_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tanggal DATETIME NOT NULL,
  lokasi VARCHAR(50) NOT NULL,
  suhu DECIMAL(5,2) NOT NULL,
  pH DECIMAL(5,2) NOT NULL,
  salinitas DECIMAL(5,2) NOT NULL,
  kekeruhan DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lokasi VARCHAR(50) NULL,
  tanggal_prediksi DATETIME NOT NULL,
  step_ke INT NOT NULL,
  suhu DECIMAL(5,2) NOT NULL,
  pH DECIMAL(5,2) NOT NULL,
  salinitas DECIMAL(5,2) NOT NULL,
  kekeruhan DECIMAL(5,2) NOT NULL,
  skor_risiko INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  rekomendasi TEXT NULL,
  model_log_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS model_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  units INT NOT NULL,
  learning_rate DECIMAL(10,6) NOT NULL,
  dropout_rate DECIMAL(5,2) NOT NULL,
  batch_size INT NOT NULL,
  epochs INT NOT NULL,
  rmse DECIMAL(10,6) NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS prediction_inputs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lokasi VARCHAR(50) NULL,
  tanggal_prediksi DATETIME NOT NULL,
  nilai_parameter JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS lokasi_tambak (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nama_lokasi VARCHAR(50) NOT NULL,
  keterangan TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS comparison_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_type VARCHAR(10) NOT NULL UNIQUE,
  mape DECIMAL(12,6) NOT NULL,
  rmse DECIMAL(12,6) NOT NULL,
  mae DECIMAL(12,6) NOT NULL,
  r2 DECIMAL(12,6) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO comparison_metrics (model_type, mape, rmse, mae, r2) VALUES
  ('tft', 57.08, 0.908, 0.792, -0.075),
  ('gru', 22.846027, 0.484779, 0.343726, 0.817436)
ON DUPLICATE KEY UPDATE
  mape = VALUES(mape), rmse = VALUES(rmse), mae = VALUES(mae), r2 = VALUES(r2);

-- Admin utama (id 1): admin / admin123
INSERT INTO users (username, email, password, role) VALUES
  ('admin', 'admin@gruwater.com', '$2b$10$tW9aVnk9jvrnXsM4DuMD/uKsbGIDiu/oWutyi0NTY8ciTJTMETplW', 'admin')
ON DUPLICATE KEY UPDATE username = VALUES(username);
