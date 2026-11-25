-- Soal urutkan & cocokkan. Tidak mengubah soal lama.
ALTER TABLE "Question" ADD COLUMN left_items JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Question" ADD COLUMN left_images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Question" DROP CONSTRAINT "Question_type_check";
ALTER TABLE "Question" ADD CONSTRAINT "Question_type_check" CHECK (question_type IN ('SINGLE_CHOICE','IMAGE_CHOICE','TRUE_FALSE','ORDERING','MATCHING'));
ALTER TABLE "Question" ADD CONSTRAINT "Question_left_items_check" CHECK (jsonb_typeof(left_items) = 'array' AND jsonb_typeof(left_images) = 'array');
