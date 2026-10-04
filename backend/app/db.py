from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from fastapi import Request

def create_pool(url):
    return ConnectionPool(url, min_size=1, max_size=10, open=False,
                          kwargs={"row_factory": dict_row}, timeout=10)

def get_db(request: Request):
    with request.app.state.pool.connection() as connection:
        yield connection

def one(db, sql, params=()):
    return db.execute(sql, params).fetchone()

def many(db, sql, params=()):
    return db.execute(sql, params).fetchall()
