import pytest
from pydantic import ValidationError

from app.schemas import QuestionCreate
from app.services.quiz_service import (
    correct_answer,
    is_correct,
    public_questions,
    valid_answer,
    with_shuffle,
)


def ordering(n=4):
    return {"id": 1, "question_type": "ORDERING", "prompt": "Urutkan", "options": [f"L{i}" for i in range(n)],
            "correct_index": 0, "explanation": "x"}


def matching():
    return {"id": 2, "question_type": "MATCHING", "prompt": "Cocokkan", "options": ["a", "b", "c"],
            "left_items": ["A", "B", "C"], "correct_index": 0, "explanation": "x"}


def test_ordering_shuffled_and_graded_in_shown_indices():
    q = with_shuffle([ordering()])[0]
    assert q["perm"] != sorted(q["perm"])
    shown = public_questions([q])[0]["options"]
    # Pick shown positions in the true step order
    answer = [shown.index(f"L{k}") for k in range(4)]
    assert answer == correct_answer(q)
    assert is_correct(q, answer)
    assert not is_correct(q, list(reversed(answer)))


def test_matching_pairs_each_left_with_its_right():
    q = with_shuffle([matching()])[0]
    pub = public_questions([q])[0]
    assert pub["left_items"] == ["A", "B", "C"]
    answer = [pub["options"].index(x) for x in ("a", "b", "c")]
    assert is_correct(q, answer)
    wrong = answer[1:] + answer[:1]
    assert not is_correct(q, wrong)


def test_answer_shape_is_validated():
    q = with_shuffle([ordering(3)])[0]
    assert valid_answer(q, [2, 0, 1])
    assert not valid_answer(q, [0, 0, 1])
    assert not valid_answer(q, 1)
    single = {"options": ["x", "y"], "correct_index": 1}
    assert valid_answer(single, 1) and not valid_answer(single, [1]) and not valid_answer(single, 2)


def test_schema_rules_for_new_types():
    QuestionCreate(question_type="ORDERING", prompt="Urutkan", options=["a", "b"], correct_index=0, explanation="abc")
    QuestionCreate(question_type="MATCHING", prompt="Cocok", options=["a", "b"], left_items=["A", "B"],
                   correct_index=0, explanation="abc")
    with pytest.raises(ValidationError):
        QuestionCreate(question_type="MATCHING", prompt="Cocok", options=["a", "b"], left_items=["A"],
                       correct_index=0, explanation="abc")
    with pytest.raises(ValidationError):
        QuestionCreate(question_type="SINGLE_CHOICE", prompt="Biasa", options=["a", "b"], left_items=["A", "B"],
                       correct_index=0, explanation="abc")
