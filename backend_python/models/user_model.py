import os

import bcrypt
from dotenv import load_dotenv

from config.database import BASE_DIR, execute, query, query_one

load_dotenv(os.path.join(BASE_DIR, ".env"))


class User:
    @staticmethod
    def find_by_username(username):
        return query_one("SELECT * FROM users WHERE username = %s", (username,))

    @staticmethod
    def find_by_id(user_id):
        return query_one(
            "SELECT id, username, email, role, created_at FROM users WHERE id = %s",
            (user_id,),
        )

    @staticmethod
    def find_all():
        return query(
            "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC"
        )

    @staticmethod
    def create(data):
        hashed = bcrypt.hashpw(str(data["password"]).encode(), bcrypt.gensalt(rounds=10)).decode()
        _, insert_id = execute(
            "INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)",
            (data["username"], data["email"], hashed, data.get("role") or "user"),
        )
        return insert_id

    @staticmethod
    def update(user_id, data):
        fields = []
        values = []
        if data.get("username"):
            fields.append("username = %s")
            values.append(data["username"])
        if data.get("email"):
            fields.append("email = %s")
            values.append(data["email"])
        if data.get("password"):
            hashed = bcrypt.hashpw(str(data["password"]).encode(), bcrypt.gensalt(rounds=10)).decode()
            fields.append("password = %s")
            values.append(hashed)
        if data.get("role"):
            fields.append("role = %s")
            values.append(data["role"])
        if not fields:
            return 0
        values.append(user_id)
        rowcount, _ = execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", tuple(values))
        return rowcount

    @staticmethod
    def delete(user_id):
        rowcount, _ = execute("DELETE FROM users WHERE id = %s", (user_id,))
        return rowcount

    @staticmethod
    def compare_password(plain, hashed):
        try:
            return bcrypt.checkpw(str(plain).encode(), str(hashed).encode())
        except ValueError:
            return False
