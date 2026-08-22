from config.database import execute, query, query_one


class Lokasi:
    @staticmethod
    def find_all():
        return query("SELECT * FROM lokasi_tambak ORDER BY nama_lokasi ASC")

    @staticmethod
    def find_by_id(row_id):
        return query_one("SELECT * FROM lokasi_tambak WHERE id = %s", (row_id,))

    @staticmethod
    def create(data):
        _, insert_id = execute(
            "INSERT INTO lokasi_tambak (user_id, nama_lokasi, keterangan) VALUES (%s, %s, %s)",
            (data["user_id"], data["nama_lokasi"], data.get("keterangan") or None),
        )
        return insert_id

    @staticmethod
    def update(row_id, data):
        rowcount, _ = execute(
            "UPDATE lokasi_tambak SET nama_lokasi = %s, keterangan = %s WHERE id = %s",
            (data["nama_lokasi"], data.get("keterangan") or None, row_id),
        )
        return rowcount

    @staticmethod
    def delete(row_id):
        rowcount, _ = execute("DELETE FROM lokasi_tambak WHERE id = %s", (row_id,))
        return rowcount
