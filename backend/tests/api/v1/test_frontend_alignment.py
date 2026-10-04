from datetime import datetime, timedelta, timezone

from app.models import Question, QuizRun

P = "/api/v1"


def test_material_run_snapshot_certificate_and_profile(client, auth):
    r = client.post(
        P + "/auth/register",
        json={
            "username": "learner",
            "display_name": "Raka",
            "password": "secure-password-123",
            "email": "raka@example.org",
        },
    )
    assert r.status_code == 201, r.text
    login = client.post(
        P + "/auth/login",
        json={"email": "RAKA@example.org", "password": "secure-password-123"},
    )
    assert login.status_code == 200, login.text
    student = {"Authorization": "Bearer " + login.json()["access_token"]}
    teacher = auth("teacher")
    admin = auth("admin")
    reviewer = auth("reviewer")
    mid = client.post(
        P + "/modules",
        headers=teacher,
        json={
            "title": "Belajar Komik",
            "description": "Materi contoh untuk pengujian",
            "level": 1,
            "topic_id": 1,
        },
    ).json()["id"]
    lid = client.post(
        P + f"/modules/{mid}/lessons",
        headers=teacher,
        json={
            "title": "Pelajaran contoh",
            "body": "Pengantar contoh belajar",
            "position": 1,
        },
    ).json()["id"]
    r = client.post(
        P + f"/lessons/{lid}/materials",
        headers=teacher,
        json={
            "title": "Komik contoh",
            "kind": "COMIC",
            "body": "Kataunikkomik membantu mencari materi tervalidasi.",
            "pages": [
                {
                    "image_url": "https://example.org/page.png",
                    "alt": "Halaman contoh",
                    "text": "Isi contoh",
                }
            ],
            "position": 1,
        },
    )
    assert r.status_code == 201, r.text
    aid = r.json()["id"]
    qid = client.post(
        P + f"/modules/{mid}/quizzes",
        headers=teacher,
        json={
            "title": "Post-test contoh",
            "kind": "POST",
            "questions": [
                {
                    "prompt": "Pilih contoh benar",
                    "options": ["Benar", "Salah"],
                    "correct_index": 0,
                    "explanation": "Benar adalah contoh jawabannya.",
                }
            ],
        },
    ).json()["id"]
    assert (
        client.post(P + f"/modules/{mid}/submit-review", headers=teacher).status_code
        == 200
    )
    assert (
        client.post(
            P + f"/modules/{mid}/review",
            headers=reviewer,
            json={"approved": True, "note": "Materi contoh untuk pengujian"},
        ).status_code
        == 200
    )
    # Same level number in another topic is allowed and independently accessible.
    other = client.post(
        P + "/modules",
        headers=teacher,
        json={
            "title": "Topik kedua",
            "description": "Materi contoh terpisah",
            "level": 1,
            "topic_id": 2,
        },
    )
    assert other.status_code == 201, other.text
    catalogue = client.get(P + "/materials?kind=COMIC&q=Komik", headers=student).json()
    assert catalogue["total"] == 1 and "url" not in catalogue["items"][0]
    assert (
        client.post(P + f"/lessons/{lid}/complete", headers=student).status_code == 403
    )
    for _ in range(2):
        assert (
            client.post(P + f"/materials/{aid}/open", headers=student).status_code
            == 200
        )
    summary = client.get(P + "/users/me/summary", headers=student).json()
    assert summary["opened_materials"] == 1
    assert (
        client.post(P + f"/materials/{aid}/complete", headers=student).status_code
        == 200
    )
    assert (
        client.post(P + f"/lessons/{lid}/complete", headers=student).status_code == 200
    )
    run = client.post(P + f"/quizzes/{qid}/runs", headers=student)
    assert run.status_code == 201, run.text
    run = run.json()
    assert (
        client.post(
            P + f"/quizzes/{qid}/runs/{run['id']}/submit",
            headers=teacher,
            json={"answers": {str(run["questions"][0]["id"]): 0}},
        ).status_code
        == 404
    )
    assert (
        client.post(
            P + f"/quizzes/{qid}/runs/{run['id']}/submit",
            headers=student,
            json={"answers": {str(run["questions"][0]["id"]): 9}},
        ).status_code
        == 422
    )
    question_id = run["questions"][0]["id"]
    assert "correct_index" not in run["questions"][0]
    changed = client.put(
        P + f"/admin/quizzes/{qid}/questions/{question_id}",
        headers=admin,
        json={
            "prompt": "Soal telah diubah",
            "options": ["Benar", "Salah"],
            "correct_index": 1,
            "explanation": "Versi terbaru berbeda.",
        },
    )
    assert changed.status_code == 200, changed.text
    r = client.post(
        P + f"/quizzes/{qid}/runs/{run['id']}/submit",
        headers=student,
        json={"answers": {str(question_id): 0}},
    )
    assert r.status_code == 201 and r.json()["score"] == 100, r.text
    assert "question_snapshot" not in r.json()
    cid = r.json()["certificate_id"]
    assert cid
    assert (
        client.post(
            P + f"/quizzes/{qid}/runs/{run['id']}/submit",
            headers=student,
            json={"answers": {str(question_id): 0}},
        ).status_code
        == 409
    )
    pdf = client.get(P + f"/certificates/{cid}/download", headers=student)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF"), (
        pdf.text[:100] if pdf.status_code != 200 else ""
    )
    assert (
        client.get(P + f"/certificates/{cid}/download", headers=teacher).status_code
        == 404
    )
    assert len(client.get(P + "/certificates", headers=student).json()) == 1
    summary = client.get(P + "/users/me/summary", headers=student).json()
    assert summary["completed_levels"] == 1 and "password_hash" not in summary["user"]
    expiring = client.post(P + f"/quizzes/{qid}/runs", headers=student).json()
    with client.app.state.session_factory.begin() as db:
        db.get(QuizRun, expiring["id"]).expires_at = datetime.now(
            timezone.utc
        ) - timedelta(minutes=1)
    assert (
        client.post(
            P + f"/quizzes/{qid}/runs/{expiring['id']}/submit",
            headers=student,
            json={"answers": {str(question_id): 1}},
        ).status_code
        == 409
    )
    r = client.patch(
        P + f"/admin/quizzes/{qid}/questions/{question_id}/active",
        headers=admin,
        json={"active": False},
    )
    assert r.status_code == 200
    assert client.post(P + f"/quizzes/{qid}/runs", headers=student).status_code == 409
    assert (
        client.get(P + f"/admin/quizzes/{qid}/questions", headers=student).status_code
        == 403
    )
    result = client.patch(
        P + "/users/me",
        headers=student,
        json={
            "display_name": "Raka Baru",
            "locale": "en",
            "theme": "dark",
            "avatar_url": None,
        },
    )
    assert result.status_code == 200 and result.json()["theme"] == "dark"
    # Certificate retains the recipient name at issuance.
    assert (
        client.get(P + "/certificates", headers=student).json()[0]["display_name"]
        == "Raka"
    )

    # Bank capacity matches the submission schema's maximum of 50 answers.
    with client.app.state.session_factory.begin() as db:
        db.add_all(
            [
                Question(
                    quiz_id=qid,
                    prompt=f"Soal kapasitas {i}",
                    options=["Benar", "Salah"],
                    correct_index=0,
                    explanation="Contoh teknis",
                )
                for i in range(50)
            ]
        )
    assert (
        client.post(
            P + f"/admin/quizzes/{qid}/questions",
            headers=admin,
            json={
                "prompt": "Soal tambahan",
                "options": ["Benar", "Salah"],
                "correct_index": 0,
                "explanation": "Contoh teknis",
            },
        ).status_code
        == 409
    )
    assert (
        client.patch(
            P + f"/admin/quizzes/{qid}/questions/{question_id}/active",
            headers=admin,
            json={"active": True},
        ).status_code
        == 409
    )
