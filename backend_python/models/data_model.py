from config.database import execute, query, query_one


class Data:
    @staticmethod
    def find_all(limit=50, offset=0, user_id=None, lokasi=None):
        return query(
            "SELECT id, DATE_FORMAT(tanggal, '%%Y-%%m-%%d') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE user_id = %s AND (%s IS NULL OR lokasi = %s) "
            "ORDER BY tanggal DESC LIMIT %s OFFSET %s",
            (user_id, lokasi, lokasi, int(limit), int(offset)),
        )

    @staticmethod
    def find_latest(user_id=None, lokasi=None):
        return query_one(
            "SELECT id, DATE_FORMAT(tanggal, '%%Y-%%m-%%d') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE user_id = %s AND (%s IS NULL OR lokasi = %s) "
            "ORDER BY tanggal DESC LIMIT 1",
            (user_id, lokasi, lokasi),
        )

    @staticmethod
    def find_all_for_user(user_id=None):
        return query(
            "SELECT id, DATE_FORMAT(tanggal, '%%Y-%%m-%%d') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE user_id = %s ORDER BY tanggal DESC, id DESC",
            (user_id,),
        )

    @staticmethod
    def find_all_export(user_id=None, lokasi=None):
        return query(
            "SELECT id, tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE user_id = %s AND (%s IS NULL OR lokasi = %s) "
            "ORDER BY tanggal ASC, id ASC",
            (user_id, lokasi, lokasi),
        )

    @staticmethod
    def find_last_day(user_id=None):
        return query(
            "SELECT id, DATE_FORMAT(tanggal, '%%Y-%%m-%%d') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE user_id = %s "
            "AND tanggal = (SELECT MAX(tanggal) FROM water_quality_data WHERE user_id = %s) "
            "ORDER BY tanggal DESC, id DESC",
            (user_id, user_id),
        )

    @staticmethod
    def find_by_id(row_id, user_id=None):
        return query_one(
            "SELECT id, DATE_FORMAT(tanggal, '%%Y-%%m-%%d') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan "
            "FROM water_quality_data WHERE id = %s AND user_id = %s",
            (row_id, user_id),
        )

    @staticmethod
    def create(data):
        _, insert_id = execute(
            "INSERT INTO water_quality_data (user_id, tanggal, lokasi, suhu, pH, salinitas, kekeruhan) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                data["user_id"],
                data["tanggal"],
                data["lokasi"],
                data["suhu"],
                data["pH"],
                data["salinitas"],
                data["kekeruhan"],
            ),
        )
        return insert_id

    @staticmethod
    def update(row_id, data, user_id=None):
        rowcount, _ = execute(
            "UPDATE water_quality_data SET tanggal=%s, lokasi=%s, suhu=%s, pH=%s, salinitas=%s, kekeruhan=%s "
            "WHERE id=%s AND user_id=%s",
            (
                data["tanggal"],
                data["lokasi"],
                data["suhu"],
                data["pH"],
                data["salinitas"],
                data["kekeruhan"],
                row_id,
                user_id,
            ),
        )
        return rowcount

    @staticmethod
    def delete(row_id, user_id=None):
        rowcount, _ = execute(
            "DELETE FROM water_quality_data WHERE id = %s AND user_id = %s", (row_id, user_id)
        )
        return rowcount

    @staticmethod
    def count(user_id=None):
        row = query_one("SELECT COUNT(*) as total FROM water_quality_data WHERE user_id = %s", (user_id,))
        return row["total"] if row else 0

    @staticmethod
    def get_stats(user_id=None):
        return query_one(
            "SELECT COUNT(*) as total_data, AVG(suhu) as avg_suhu, AVG(pH) as avg_pH, "
            "AVG(salinitas) as avg_salinitas, AVG(kekeruhan) as avg_kekeruhan "
            "FROM water_quality_data WHERE user_id = %s",
            (user_id,),
        )
