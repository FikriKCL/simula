"""A follow-up borrows the previous topic only when it points back to it."""

import pytest

from app.services.rag_service import detect_emergency, resolve_conversational_query

HISTORY = [
    {"sender": "user", "text": "Bagaimana cara menolong orang yang luka bakar?"},
    {"sender": "bot", "text": "> Luka bakar adalah cedera akibat suhu tinggi."},
]


@pytest.mark.parametrize("question", ["Apa itu kekeringan?", "Apakah TBC itu?", "Perban?"])
def test_question_with_its_own_topic_is_left_alone(question):
    resolved = resolve_conversational_query(question, HISTORY)
    assert resolved == question
    assert not detect_emergency(resolved)


def test_follow_up_uses_only_the_latest_topic():
    history = HISTORY + [
        {"sender": "user", "text": "Apa itu kekeringan?"},
        {"sender": "bot", "text": "> Kekeringan adalah matinya sumber air."},
    ]
    resolved = resolve_conversational_query("lalu dampaknya apa?", history)
    assert "kekeringan" in resolved
    assert "luka" not in resolved
    assert not detect_emergency(resolved)


@pytest.mark.parametrize(
    "question",
    ["lalu gejalanya?", "Jelaskan lebih detail", "Kalau yang parah?", "Bagaimana penanganannya?", "Apa itu?"],
)
def test_question_that_points_back_gets_the_previous_topic(question):
    assert "luka bakar" in resolve_conversational_query(question, HISTORY)
