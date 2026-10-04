from sqlalchemy import select

from app.models import School

from .common import add, record, records, transactional


def schools(limit, offset, db):
    return records(
        db.scalars(select(School).order_by(School.id).limit(limit).offset(offset))
    )


@transactional
def school_create(data, user, db):
    return record(add(db, School(**data.model_dump())))
