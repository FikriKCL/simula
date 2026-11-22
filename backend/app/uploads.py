from pathlib import Path
from app.config import settings


def upload_root():
    value = settings().upload_dir
    root = Path(value).expanduser() if value else Path(__file__).resolve().parent.parent / "uploads"
    root = root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root
