CREATE TABLE "School" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "address" TEXT
);

CREATE TABLE "User" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "display_name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'STUDENT',
  "school_id" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (role IN ('STUDENT','INSTRUCTOR','REVIEWER','ADMIN')),
  CHECK (xp >= 0)
);

CREATE TABLE "Module" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "level" INTEGER NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "review_note" TEXT,
  "reviewed_by" INTEGER,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (level > 0),
  CHECK (status IN ('DRAFT','PENDING','PUBLISHED','REJECTED'))
);

CREATE TABLE "Lesson" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "module_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "image_url" TEXT,
  "video_url" TEXT,
  "position" INTEGER NOT NULL,
  FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("module_id", "position"),
  CHECK (position > 0)
);

CREATE TABLE "Progress" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "lesson_id" INTEGER NOT NULL,
  "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("user_id", "lesson_id")
);

CREATE TABLE "Quiz" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "module_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "pass_score" INTEGER NOT NULL DEFAULT 70,
  FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (kind IN ('PRE','POST')),
  CHECK (pass_score BETWEEN 0 AND 100)
);

CREATE TABLE "Question" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "quiz_id" INTEGER NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" JSONB NOT NULL,
  "correct_index" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL,
  FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (jsonb_typeof(options) = 'array'),
  CHECK (jsonb_array_length(options) BETWEEN 2 AND 6),
  CHECK (correct_index >= 0 AND correct_index < jsonb_array_length(options))
);

CREATE TABLE "Attempt" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "quiz_id" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "answers" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE "Badge" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "module_id" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  FOREIGN KEY ("module_id") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserBadge" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "badge_id" INTEGER NOT NULL,
  "earned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("badge_id") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE ("user_id", "badge_id")
);

CREATE TABLE "ChatSession" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChatMessage" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "session_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sources" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("session_id") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK (role IN ('user','assistant'))
);

CREATE INDEX "User_school_id_idx" ON "User" ("school_id");

CREATE INDEX "Module_created_by_idx" ON "Module" ("created_by");

CREATE INDEX "Module_reviewed_by_idx" ON "Module" ("reviewed_by");

CREATE INDEX "Lesson_module_id_idx" ON "Lesson" ("module_id");

CREATE INDEX "Progress_user_id_idx" ON "Progress" ("user_id");

CREATE INDEX "Progress_lesson_id_idx" ON "Progress" ("lesson_id");

CREATE INDEX "Quiz_module_id_idx" ON "Quiz" ("module_id");

CREATE INDEX "Question_quiz_id_idx" ON "Question" ("quiz_id");

CREATE INDEX "Attempt_user_id_idx" ON "Attempt" ("user_id");

CREATE INDEX "Attempt_quiz_id_idx" ON "Attempt" ("quiz_id");

CREATE INDEX "Badge_module_id_idx" ON "Badge" ("module_id");

CREATE INDEX "UserBadge_user_id_idx" ON "UserBadge" ("user_id");

CREATE INDEX "UserBadge_badge_id_idx" ON "UserBadge" ("badge_id");

CREATE INDEX "ChatSession_user_id_idx" ON "ChatSession" ("user_id");

CREATE INDEX "ChatMessage_session_id_idx" ON "ChatMessage" ("session_id");
