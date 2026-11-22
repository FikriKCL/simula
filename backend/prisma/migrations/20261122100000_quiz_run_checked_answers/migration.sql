-- Jawaban yang sudah diperiksa per soal (kuis gaya satu-soal-per-layar); terkunci setelah diperiksa.
ALTER TABLE "QuizRun" ADD COLUMN checked_answers JSONB NOT NULL DEFAULT '{}';
