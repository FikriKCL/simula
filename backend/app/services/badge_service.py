from sqlalchemy import exists, select

from app.models import Attempt, Badge, Quiz, UserBadge

from .common import add, record, transactional
from .module_service import module_for_edit, unfinished_lessons


def award_badge(db, uid, mid):
    if db.scalar(unfinished_lessons(mid, uid).limit(1)):
        return
    passed = exists(
        select(Attempt.id)
        .where(
            Attempt.quiz_id == Quiz.id, Attempt.user_id == uid, Attempt.passed.is_(True)
        )
        .correlate(Quiz)
    )
    if db.scalar(
        select(Quiz.id)
        .where(Quiz.module_id == mid, Quiz.kind == "POST", ~passed)
        .limit(1)
    ):
        return
    badge = db.scalar(select(Badge).where(Badge.module_id == mid))
    if badge and not db.scalar(
        select(UserBadge.id).where(
            UserBadge.user_id == uid, UserBadge.badge_id == badge.id
        )
    ):
        add(db, UserBadge(user_id=uid, badge_id=badge.id))


@transactional
def badge_create(mid, data, user, db):
    module_for_edit(db, mid, user)
    return record(add(db, Badge(module_id=mid, **data.model_dump())))


def badges(user, db):
    rows = db.execute(
        select(Badge, UserBadge.earned_at)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .where(UserBadge.user_id == user["id"])
        .order_by(UserBadge.earned_at.desc())
    )
    return [dict(record(badge), earned_at=earned_at) for badge, earned_at in rows]
