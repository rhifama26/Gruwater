import json

from config.database import execute, query, query_one


class PredictionInput:
    @staticmethod
    def find_all(user_id=None):
        where = "WHERE pi.user_id = %s" if user_id else ""
        params = (user_id,) if user_id else ()
        return query(
            f"SELECT pi.*, u.username, u.email FROM prediction_inputs pi "
            f"JOIN users u ON u.id = pi.user_id {where} ORDER BY pi.created_at DESC",
            params,
        )

    @staticmethod
    def create(data):
        _, insert_id = execute(
            "INSERT INTO prediction_inputs (user_id, lokasi, tanggal_prediksi, nilai_parameter) "
            "VALUES (%s, %s, %s, %s)",
            (
                data["user_id"],
                data.get("lokasi"),
                data["tanggal_prediksi"],
                json.dumps(data["nilai_parameter"]),
            ),
        )
        return insert_id

    @staticmethod
    def delete_all(user_id=None):
        rowcount, _ = execute("DELETE FROM prediction_inputs WHERE user_id = %s", (user_id,))
        return rowcount

    @staticmethod
    def get_stats(user_id=None):
        return query_one(
            "SELECT COUNT(*) as total FROM prediction_inputs WHERE user_id = %s", (user_id,)
        )
