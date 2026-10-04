P = "/api/v1"


def make_student(client, name="student"):
    r = client.post(
        P + "/auth/register",
        json={
            "username": name,
            "display_name": "Pelajar",
            "password": "secure-password-123",
            "role": "ADMIN",
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["role"] == "STUDENT"
    assert "password_hash" not in r.json()
    return r.json()


def create_module(client, auth, level=1):
    teacher = auth("teacher")
    m = client.post(
        P + "/modules",
        headers=teacher,
        json={
            "title": f"Modul {level}",
            "description": "Materi contoh untuk pengujian",
            "level": level,
        },
    )
    assert m.status_code == 201, m.text
    mid = m.json()["id"]
    r = client.post(
        P + f"/modules/{mid}/lessons",
        headers=teacher,
        json={
            "title": "Belajar PMR",
            "body": "Materi PMR contoh yang digunakan untuk menguji alur API.",
            "position": 1,
        },
    )
    assert r.status_code == 201, r.text
    return mid, r.json()["id"]


def publish(client, auth, mid):
    assert (
        client.post(
            P + f"/modules/{mid}/submit-review", headers=auth("teacher")
        ).status_code
        == 200
    )
    r = client.post(
        P + f"/modules/{mid}/review",
        headers=auth("reviewer"),
        json={"approved": True, "note": "Konten contoh disetujui untuk pengujian."},
    )
    assert r.status_code == 200, r.text


def test_auth_and_role_boundaries(client, auth):
    make_student(client)
    student = auth("student")
    assert client.get(P + "/users/me").status_code == 401
    assert (
        client.post(
            P + "/modules",
            headers=student,
            json={"title": "Test", "description": "Example", "level": 1},
        ).status_code
        == 403
    )
    assert (
        client.post(
            P + "/auth/login",
            json={"username": "student", "password": "wrong-password"},
        ).status_code
        == 401
    )
    uid = client.get(P + "/users/me", headers=student).json()["id"]
    assert (
        client.patch(
            P + f"/admin/users/{uid}/active",
            headers=auth("admin"),
            json={"active": False},
        ).status_code
        == 200
    )
    assert client.get(P + "/users/me", headers=student).status_code == 401
    assert (
        client.post(
            P + "/auth/register",
            json={
                "username": "student",
                "display_name": "Other",
                "password": "secure-password-123",
            },
        ).status_code
        == 409
    )


def test_learning_quiz_badge_and_reports(client, auth):
    make_student(client)
    student = auth("student")
    mid, lid = create_module(client, auth)
    assert client.get(P + f"/modules/{mid}", headers=student).status_code == 404
    assert (
        client.post(
            P + f"/modules/{mid}/badge",
            headers=auth("teacher"),
            json={
                "name": "Pemula PMR",
                "description": "Selesai belajar dan lulus post-test",
            },
        ).status_code
        == 201
    )
    qids = {}
    for kind in ["PRE", "POST"]:
        r = client.post(
            P + f"/modules/{mid}/quizzes",
            headers=auth("teacher"),
            json={
                "title": "Kuis contoh",
                "kind": kind,
                "questions": [
                    {
                        "prompt": "Pilih jawaban contoh",
                        "options": ["Benar", "Salah"],
                        "correct_index": 0,
                        "explanation": "Jawaban contoh adalah Benar.",
                    }
                ],
            },
        )
        assert r.status_code == 201, r.text
        qids[kind] = r.json()["id"]
    publish(client, auth, mid)
    assert (
        client.put(
            P + f"/modules/{mid}",
            headers=auth("teacher"),
            json={"title": "New title", "description": "Changed", "level": 1},
        ).status_code
        == 409
    )
    qs = {
        kind: client.get(P + f"/quizzes/{qid}", headers=student).json()["questions"][0]
        for kind, qid in qids.items()
    }
    assert "correct_index" not in qs["POST"]
    assert (
        client.post(
            P + f"/quizzes/{qids['POST']}/attempts",
            headers=student,
            json={"answers": {str(qs["POST"]["id"]): 0}},
        ).status_code
        == 403
    )
    r = client.post(
        P + f"/quizzes/{qids['PRE']}/attempts",
        headers=student,
        json={"answers": {str(qs["PRE"]["id"]): 1}},
    )
    assert r.status_code == 201 and r.json()["score"] == 0
    for expected in [10, 0]:
        r = client.post(P + f"/lessons/{lid}/complete", headers=student)
        assert r.status_code == 200 and r.json()["xp_awarded"] == expected
    assert client.get(P + "/learning/badges", headers=student).json() == []
    assert (
        client.post(
            P + f"/quizzes/{qids['POST']}/attempts",
            headers=student,
            json={"answers": {"999": 0}},
        ).status_code
        == 422
    )
    for expected in [20, 0]:
        r = client.post(
            P + f"/quizzes/{qids['POST']}/attempts",
            headers=student,
            json={"answers": {str(qs["POST"]["id"]): 0}},
        )
        assert (
            r.status_code == 201
            and r.json()["score"] == 100
            and r.json()["xp_awarded"] == expected
        ), r.text
    assert client.get(P + "/users/me", headers=student).json()["xp"] == 30
    assert len(client.get(P + "/learning/badges", headers=student).json()) == 1
    assert (
        client.get(P + "/reports/evaluation", headers=auth("reviewer")).json()[0][
            "mean_gain"
        ]
        == 100
    )
    assert client.get(P + "/reports/evaluation", headers=student).status_code == 403


def test_level_lock_and_chat_ownership(client, auth):
    make_student(client)
    make_student(client, "other")
    student = auth("student")
    first, lid = create_module(client, auth, 1)
    second, _ = create_module(client, auth, 2)
    publish(client, auth, first)
    publish(client, auth, second)
    assert client.get(P + f"/modules/{second}", headers=student).status_code == 403
    assert (
        client.post(P + f"/lessons/{lid}/complete", headers=student).status_code == 200
    )
    assert client.get(P + f"/modules/{second}", headers=student).status_code == 200
    sid = client.post(P + "/chat/sessions", headers=student).json()["id"]
    assert (
        client.get(
            P + f"/chat/sessions/{sid}/messages", headers=auth("other")
        ).status_code
        == 404
    )
    r = client.post(
        P + f"/chat/sessions/{sid}/messages",
        headers=student,
        json={"message": "Materi PMR"},
    )
    assert r.status_code == 201 and r.json()["sources"], r.text
    r = client.post(
        P + f"/chat/sessions/{sid}/messages",
        headers=student,
        json={"message": "xyzunknown"},
    )
    assert r.status_code == 201 and r.json()["sources"] == []
    assert (
        len(client.get(P + f"/chat/sessions/{sid}/messages", headers=student).json())
        == 4
    )


def test_independent_review(client, auth):
    admin = auth("admin")
    r = client.post(
        P + "/modules",
        headers=admin,
        json={"title": "Admin module", "description": "Example content", "level": 1},
    )
    mid = r.json()["id"]
    assert (
        client.post(P + f"/modules/{mid}/submit-review", headers=admin).status_code
        == 422
    )
    client.post(
        P + f"/modules/{mid}/lessons",
        headers=admin,
        json={"title": "Lesson", "body": "Example content for lesson", "position": 1},
    )
    assert (
        client.post(P + f"/modules/{mid}/submit-review", headers=admin).status_code
        == 200
    )
    assert (
        client.post(
            P + f"/modules/{mid}/review",
            headers=admin,
            json={"approved": True, "note": "Self approval"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            P + f"/modules/{mid}/review",
            headers=auth("reviewer"),
            json={"approved": False, "note": "Perbaiki materi contoh"},
        ).json()["status"]
        == "REJECTED"
    )
    assert (
        client.put(
            P + f"/modules/{mid}",
            headers=admin,
            json={
                "title": "Revised module",
                "description": "Revised example",
                "level": 1,
            },
        ).json()["status"]
        == "DRAFT"
    )
