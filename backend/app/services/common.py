from sqlalchemy import inspect


class ServiceError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def require(value, message="Data tidak ditemukan"):
    if value is None:
        raise ServiceError(404, message)
    return value


def record(entity):
    return {
        column.key: getattr(entity, column.key)
        for column in inspect(entity).mapper.column_attrs
    }


def records(entities):
    return [record(entity) for entity in entities]


def add(db, entity):
    db.add(entity)
    db.flush()
    return entity


from functools import wraps
from inspect import signature


def transactional(function):
    """Commit a service operation once; rollback every failure before propagating it."""
    parameters = signature(function)

    @wraps(function)
    def operation(*args, **kwargs):
        db = parameters.bind(*args, **kwargs).arguments["db"]
        try:
            result = function(*args, **kwargs)
            db.commit()
            return result
        except Exception:
            db.rollback()
            raise

    return operation
