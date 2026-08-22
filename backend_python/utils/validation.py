def validate_water_quality_data(data):
    errors = []
    if not data.get("tanggal"):
        errors.append("Tanggal harus diisi")
    if not data.get("lokasi"):
        errors.append("Lokasi harus diisi")
    if data.get("suhu") is None or data["suhu"] < 0 or data["suhu"] > 45:
        errors.append("Suhu tidak valid")
    if data.get("pH") is None or data["pH"] < 0 or data["pH"] > 14:
        errors.append("pH tidak valid")
    if data.get("salinitas") is None or data["salinitas"] < 0 or data["salinitas"] > 50:
        errors.append("Salinitas tidak valid")
    if data.get("kekeruhan") is None or data["kekeruhan"] < 0:
        errors.append("Kekeruhan tidak valid")
    return errors


def validate_login(data):
    errors = []
    if not data.get("username"):
        errors.append("Username harus diisi")
    if not data.get("password"):
        errors.append("Password harus diisi")
    return errors


def validate_user(data):
    errors = []
    if not data.get("username"):
        errors.append("Username harus diisi")
    if not data.get("email"):
        errors.append("Email harus diisi")
    if not data.get("password") or len(str(data["password"])) < 6:
        errors.append("Password minimal 6 karakter")
    return errors
