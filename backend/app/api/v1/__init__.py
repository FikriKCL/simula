from fastapi import APIRouter

from . import (
    auth,
    badges,
    chat,
    learning,
    lessons,
    modules,
    quizzes,
    reports,
    schools,
    users,
)

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(schools.router)
router.include_router(modules.router)
router.include_router(lessons.router)
router.include_router(learning.router)
router.include_router(quizzes.router)
router.include_router(badges.router)
router.include_router(reports.router)
router.include_router(chat.router)

from . import content

router.include_router(content.router)
