ALTER TABLE "Material" ADD COLUMN meta TEXT NOT NULL DEFAULT '';
ALTER TABLE "Question" ADD COLUMN image_url TEXT, ADD COLUMN option_images JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Question" ADD CONSTRAINT "Question_option_images_check" CHECK (jsonb_typeof(option_images) = 'array' AND (jsonb_array_length(option_images) = 0 OR jsonb_array_length(option_images) = jsonb_array_length(options)));

ALTER TABLE "Question" ADD COLUMN question_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE';
ALTER TABLE "Question" ADD CONSTRAINT "Question_type_check" CHECK (question_type IN ('SINGLE_CHOICE','IMAGE_CHOICE','TRUE_FALSE'));
