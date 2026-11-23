P = "/api/v1"


def test_register_with_email_only_generates_username_and_can_login(client):
    form = {"display_name": "Siti Aminah", "email": "Siti.Aminah@example.org",
            "password": "secure-password-123"}
    r = client.post(P + "/auth/register", json=form)
    assert r.status_code == 201, r.text
    assert r.json()["username"] == "siti_aminah"
    assert "password_hash" not in r.text

    # Same e-mail local part on another domain gets a unique suffix.
    other = dict(form, email="siti.aminah@example.com")
    assert client.post(P + "/auth/register", json=other).json()["username"] == "siti_aminah2"

    # Duplicate e-mail is rejected.
    assert client.post(P + "/auth/register", json=form).status_code == 409

    login = client.post(P + "/auth/login",
                        json={"username": "siti.aminah@example.org", "password": "secure-password-123"})
    assert login.status_code == 200, login.text


def test_register_needs_email_or_username(client):
    r = client.post(P + "/auth/register",
                    json={"display_name": "Tanpa Email", "password": "secure-password-123"})
    assert r.status_code == 422
