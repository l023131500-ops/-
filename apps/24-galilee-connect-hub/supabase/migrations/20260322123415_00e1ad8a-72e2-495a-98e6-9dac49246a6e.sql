
ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT 'medium';
ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT 'center';

COMMENT ON COLUMN ad_banners.size IS 'small, medium, large';
COMMENT ON COLUMN ad_banners.position IS 'center, side';
