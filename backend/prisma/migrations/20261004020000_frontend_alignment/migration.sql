ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE,
 ADD COLUMN "avatar_url" TEXT, ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'id',
 ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "User" ADD CONSTRAINT "User_locale_check" CHECK (locale IN ('id','en'));
ALTER TABLE "User" ADD CONSTRAINT "User_theme_check" CHECK (theme IN ('light','dark','system'));
CREATE TABLE "Topic" ("id" SERIAL PRIMARY KEY,"code" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,"position" INTEGER NOT NULL DEFAULT 1);
INSERT INTO "Topic" (id,code,name,position) VALUES (1,'PP','Pertolongan Pertama',1),(2,'ASB','ASB',2),(3,'PRS','PRS',3);
SELECT setval(pg_get_serial_sequence('"Topic"','id'),3);
ALTER TABLE "Module" DROP CONSTRAINT "Module_level_key";
ALTER TABLE "Module" ADD COLUMN "topic_id" INTEGER NOT NULL DEFAULT 1 REFERENCES "Topic"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Module" ADD CONSTRAINT "Module_topic_id_level_key" UNIQUE (topic_id,level);
CREATE INDEX "Module_topic_id_idx" ON "Module"(topic_id);
CREATE TABLE "Material" (id SERIAL PRIMARY KEY,lesson_id INTEGER NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 title TEXT NOT NULL,kind TEXT NOT NULL CHECK (kind IN ('PDF','VIDEO','COMIC')),url TEXT,
 thumbnail_url TEXT,body TEXT NOT NULL DEFAULT '',pages JSONB NOT NULL DEFAULT '[]',
 page_count INTEGER CHECK (page_count>0),duration_seconds INTEGER CHECK(duration_seconds>0),
 position INTEGER NOT NULL CHECK(position>0),required BOOLEAN NOT NULL DEFAULT true,UNIQUE(lesson_id,position));
CREATE INDEX "Material_lesson_id_idx" ON "Material"(lesson_id);
CREATE TABLE "MaterialProgress" (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 material_id INTEGER NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TIMESTAMPTZ,UNIQUE(user_id,material_id));
CREATE INDEX "MaterialProgress_user_id_idx" ON "MaterialProgress"(user_id);
CREATE INDEX "MaterialProgress_material_id_idx" ON "MaterialProgress"(material_id);
ALTER TABLE "Question" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Attempt" ADD COLUMN "question_snapshot" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE "QuizRun" (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 quiz_id INTEGER NOT NULL REFERENCES "Quiz"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 question_snapshot JSONB NOT NULL,pass_score INTEGER NOT NULL CHECK(pass_score BETWEEN 0 AND 100),
 expires_at TIMESTAMPTZ NOT NULL,submitted_at TIMESTAMPTZ,attempt_id INTEGER UNIQUE REFERENCES "Attempt"(id) ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "QuizRun_user_id_idx" ON "QuizRun"(user_id);
CREATE INDEX "QuizRun_quiz_id_idx" ON "QuizRun"(quiz_id);
CREATE TABLE "Certificate" (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
 quiz_id INTEGER NOT NULL REFERENCES "Quiz"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 attempt_id INTEGER NOT NULL REFERENCES "Attempt"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 code TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,module_title TEXT NOT NULL,quiz_title TEXT NOT NULL,score INTEGER NOT NULL,
 issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,quiz_id));
CREATE INDEX "Certificate_user_id_idx" ON "Certificate"(user_id);
CREATE INDEX "Certificate_quiz_id_idx" ON "Certificate"(quiz_id);
CREATE INDEX "Certificate_attempt_id_idx" ON "Certificate"(attempt_id);
