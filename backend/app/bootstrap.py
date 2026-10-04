"""Create initial admin explicitly, without hard-coded credentials."""
import os
import re
from dotenv import load_dotenv
from getpass import getpass
from psycopg import connect
from app.config import settings
from app.security import hasher

def main():
    load_dotenv()
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD") or getpass("Password admin (minimal 10 karakter): ")
    if not re.fullmatch(r"[a-z0-9_]{3,40}", username):
        raise SystemExit("Username harus 3-40 huruf kecil, angka, atau underscore")
    if not 10 <= len(password) <= 128 or password.startswith("replace-"):
        raise SystemExit("Gunakan password kuat, 10-128 karakter; bukan nilai contoh")
    with connect(settings().psycopg_url) as db:
        # Existing admin is never overwritten by rerunning the bootstrap.
        result = db.execute('''INSERT INTO "User" (username,display_name,password_hash,role)
            VALUES (%s,%s,%s,'ADMIN') ON CONFLICT (username) DO NOTHING RETURNING id''',
            (username,"Administrator",hasher.hash(password))).fetchone()
        print("Admin dibuat" if result else "Username sudah ada; akun tidak diubah")

if __name__ == "__main__":
    main()
