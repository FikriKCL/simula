from .badge import Badge, UserBadge
from .chat import ChatMessage, ChatSession
from .learning import Progress
from .module import Lesson, Module
from .quiz import Attempt, Question, Quiz
from .school import School
from .user import User

__all__ = [
    "School",
    "User",
    "Module",
    "Lesson",
    "Progress",
    "Quiz",
    "Question",
    "Attempt",
    "Badge",
    "UserBadge",
    "ChatSession",
    "ChatMessage",
]

from .content import Material, MaterialProgress, Topic
from .evaluation import Certificate, QuizRun

__all__ += ["Topic", "Material", "MaterialProgress", "QuizRun", "Certificate"]
