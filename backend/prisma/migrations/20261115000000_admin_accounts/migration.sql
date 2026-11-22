-- Existing users stay approved; only new public registrations may require review.
ALTER TABLE "User" ADD COLUMN registration_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "User" ADD CONSTRAINT "User_registration_status_check" CHECK (registration_status IN ('PENDING','APPROVED','REJECTED'));
CREATE INDEX "User_registration_status_idx" ON "User" (registration_status);
