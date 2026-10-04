"""Create initial admin explicitly with SQLAlchemy; no default credentials."""

import os
import re
from getpass import getpass

from dotenv import load_dotenv
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

from app.database import create_database
from app.models import User
from app.security import hasher


def main():
    load_dotenv()
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD") or getpass(
        "Password admin (minimal 10 karakter): "
    )
    if not re.fullmatch(r"[a-z0-9_]{3,40}", username):
        raise SystemExit("Username harus 3-40 huruf kecil, angka, atau underscore")
    if not 10 <= len(password) <= 128 or password.startswith("replace-"):
        raise SystemExit("Gunakan password kuat, 10-128 karakter; bukan nilai contoh")
    raw_email = os.getenv("ADMIN_EMAIL")
    email = (
        str(TypeAdapter(EmailStr).validate_python(raw_email)).lower()
        if raw_email
        else None
    )
    engine, factory = create_database()
    try:
        with factory.begin() as db:
            if db.scalar(select(User.id).where(User.username == username)):
                print("Username sudah ada; akun tidak diubah")
            else:
                db.add(
                    User(
                        username=username,
                        display_name="Administrator",
                        password_hash=hasher.hash(password),
                        email=email,
                        role="ADMIN",
                    )
                )
                db.flush()
                print("Admin dibuat")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
