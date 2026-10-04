from sqlalchemy import and_, case, func, select

from app.models import Attempt, Quiz, User


def evaluation(school_id, user, db):
    # A window function keeps the earliest attempt per student/module/kind.
    rank = (
        func.row_number()
        .over(
            partition_by=(Attempt.user_id, Quiz.module_id, Quiz.kind),
            order_by=(Attempt.created_at, Attempt.id),
        )
        .label("rank")
    )
    first = (
        select(Attempt.user_id, Quiz.module_id, Quiz.kind, Attempt.score, rank).join(
            Quiz, Quiz.id == Attempt.quiz_id
        )
    ).cte("ranked_attempts")
    per_student = (
        select(
            first.c.user_id,
            first.c.module_id,
            func.max(case((first.c.kind == "PRE", first.c.score))).label("pre_score"),
            func.max(case((first.c.kind == "POST", first.c.score))).label("post_score"),
        )
        .join(User, User.id == first.c.user_id)
        .where(first.c.rank == 1, User.role == "STUDENT")
    )
    if school_id is not None:
        per_student = per_student.where(User.school_id == school_id)
    per_student = per_student.group_by(first.c.user_id, first.c.module_id).cte(
        "per_student"
    )
    paired = and_(
        per_student.c.pre_score.is_not(None), per_student.c.post_score.is_not(None)
    )
    result = select(
        per_student.c.module_id,
        func.count().label("participants"),
        func.count().filter(paired).label("paired_participants"),
        func.avg(per_student.c.pre_score).label("mean_pre"),
        func.avg(per_student.c.post_score).label("mean_post"),
        func.avg(per_student.c.post_score - per_student.c.pre_score)
        .filter(paired)
        .label("mean_gain"),
    )
    result = result.group_by(per_student.c.module_id).order_by(per_student.c.module_id)
    return [dict(row) for row in db.execute(result).mappings()]
