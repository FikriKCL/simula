-- Preserve legacy PDF records; new article content lives in body TEXT.
ALTER TABLE "Material" DROP CONSTRAINT "Material_kind_check";
ALTER TABLE "Material" ADD CONSTRAINT "Material_kind_check" CHECK (kind IN ('ARTICLE','PDF','VIDEO','COMIC'));
ALTER TABLE "Material" ADD COLUMN thumbnail_key TEXT, ADD COLUMN video_provider TEXT, ADD COLUMN video_id TEXT;
ALTER TABLE "Material" ADD CONSTRAINT "Material_thumbnail_key_check" CHECK (thumbnail_key IS NULL OR thumbnail_key IN ('plaster','kit','hand','heart','roll'));
ALTER TABLE "Material" ADD CONSTRAINT "Material_video_check" CHECK (
 (video_provider IS NULL AND video_id IS NULL) OR
 (kind = 'VIDEO' AND video_provider IS NOT NULL AND video_id IS NOT NULL AND
 ((video_provider = 'youtube' AND video_id ~ '^[A-Za-z0-9_-]{11}$') OR
  (video_provider = 'vimeo' AND video_id ~ '^[0-9]{1,15}$'))));
