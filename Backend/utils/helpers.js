const calculateRiskScore = (suhu, pH, salinitas, kekeruhan) => {
  const ideal = { suhu: 29, pH: 7.8, salinitas: 30, kekeruhan: 1 };
  const min = { suhu: 26, pH: 7.0, salinitas: 10, kekeruhan: 0 };
  const max = { suhu: 32, pH: 8.5, salinitas: 35, kekeruhan: 5 };

  const q = (val, ideal, min, max) => Math.max(0, Math.min(100, (1 - Math.abs(val - ideal) / (max - min)) * 100));
  
  const qSuhu = q(suhu, ideal.suhu, min.suhu, max.suhu);
  const qpH = q(pH, ideal.pH, min.pH, max.pH);
  const qSal = q(salinitas, ideal.salinitas, min.salinitas, max.salinitas);
  const qTurb = q(kekeruhan, ideal.kekeruhan, min.kekeruhan, max.kekeruhan);

  const wqi = Math.round((qSuhu + qpH + qSal + qTurb) / 4);
  let status;
  if (wqi >= 76) status = 'Normal';
  else if (wqi >= 51) status = 'Waspada';
  else status = 'Bahaya';

  return { skor: wqi, status };
};

const getMitigationRecommendation = (status) => {
  if (status === 'Normal') return 'Kondisi air optimal. Lakukan pemantauan rutin.';
  if (status === 'Waspada') return 'Kurangi pakan, tambah aerasi, cek salinitas.';
  return 'Segera pindahkan ikan, aerasi maksimal, hentikan pakan.';
};

module.exports = { calculateRiskScore, getMitigationRecommendation };