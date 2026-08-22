from config.database import execute, query, query_one


class Prediction:
    @staticmethod
    def find_all(user_id=None, lokasi=None):
        return query(
            "SELECT * FROM predictions WHERE user_id = %s AND (%s IS NULL OR lokasi = %s) "
            "ORDER BY tanggal_prediksi DESC",
            (user_id, lokasi, lokasi),
        )

    @staticmethod
    def find_latest(user_id=None, lokasi=None):
        return query(
            "SELECT * FROM predictions WHERE user_id = %s AND (%s IS NULL OR lokasi = %s) "
            "ORDER BY step_ke ASC",
            (user_id, lokasi, lokasi),
        )

    @staticmethod
    def create_batch(predictions):
        if not predictions:
            return 0
        values = []
        for p in predictions:
            values.extend(
                [
                    p["user_id"],
                    p.get("lokasi"),
                    p["tanggal_prediksi"],
                    p["step_ke"],
                    p["suhu"],
                    p["pH"],
                    p["salinitas"],
                    p["kekeruhan"],
                    p["skor_risiko"],
                    p["status"],
                    p["rekomendasi"],
                    p.get("model_log_id"),
                ]
            )
        row = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        placeholders = ",".join([row] * len(predictions))
        rowcount, _ = execute(
            "INSERT INTO predictions (user_id, lokasi, tanggal_prediksi, step_ke, suhu, pH, salinitas, kekeruhan, "
            f"skor_risiko, status, rekomendasi, model_log_id) VALUES {placeholders}",
            tuple(values),
        )
        return rowcount

    @staticmethod
    def delete_all(user_id=None, lokasi=None):
        rowcount, _ = execute(
            "DELETE FROM predictions WHERE user_id = %s AND (%s IS NULL OR lokasi = %s)",
            (user_id, lokasi, lokasi),
        )
        return rowcount

    @staticmethod
    def get_stats(user_id=None):
        return query_one(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status = 'Normal' THEN 1 ELSE 0 END) as normal_count, "
            "SUM(CASE WHEN status = 'Waspada' THEN 1 ELSE 0 END) as waspada_count, "
            "SUM(CASE WHEN status = 'Bahaya' THEN 1 ELSE 0 END) as bahaya_count "
            "FROM predictions WHERE user_id = %s",
            (user_id,),
        )
