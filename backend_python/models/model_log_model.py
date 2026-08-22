from config.database import execute, query, query_one


class ModelLog:
    @staticmethod
    def find_all():
        return query("SELECT * FROM model_logs ORDER BY created_at DESC")

    @staticmethod
    def find_best():
        return query_one(
            'SELECT * FROM model_logs WHERE status = "completed" ORDER BY rmse ASC LIMIT 1'
        )

    @staticmethod
    def find_latest():
        return query_one("SELECT * FROM model_logs ORDER BY created_at DESC LIMIT 1")

    @staticmethod
    def find_by_id(row_id):
        return query_one("SELECT * FROM model_logs WHERE id = %s", (row_id,))

    @staticmethod
    def create(data):
        _, insert_id = execute(
            "INSERT INTO model_logs (units, learning_rate, dropout_rate, batch_size, epochs, rmse, status, completed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (
                data["units"],
                data["learning_rate"],
                data["dropout_rate"],
                data["batch_size"],
                data["epochs"],
                data.get("rmse"),
                data.get("status") or "pending",
                data.get("completed_at"),
            ),
        )
        return insert_id

    @staticmethod
    def update(row_id, data):
        fields = []
        values = []
        for key in (
            "units",
            "learning_rate",
            "dropout_rate",
            "batch_size",
            "epochs",
            "rmse",
            "status",
            "completed_at",
        ):
            if key in data:
                fields.append(f"{key} = %s")
                values.append(data[key])
        if not fields:
            return 0
        values.append(row_id)
        rowcount, _ = execute(
            f"UPDATE model_logs SET {', '.join(fields)} WHERE id = %s", tuple(values)
        )
        return rowcount


class Comparison:
    @staticmethod
    def find_by_type(model_type):
        return query_one("SELECT * FROM comparison_metrics WHERE model_type = %s", (model_type,))

    @staticmethod
    def upsert(model_type, data):
        execute(
            "INSERT INTO comparison_metrics (model_type, mape, rmse, mae, r2) VALUES (%s, %s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE mape = VALUES(mape), rmse = VALUES(rmse), mae = VALUES(mae), r2 = VALUES(r2)",
            (model_type, data["mape"], data["rmse"], data["mae"], data["r2"]),
        )
