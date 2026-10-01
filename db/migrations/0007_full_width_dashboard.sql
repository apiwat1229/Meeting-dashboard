UPDATE theme_settings
SET config = jsonb_set(config, '{layout,maxWidth}', '3840'::jsonb, true),
    updated_at = now()
WHERE config #>> '{layout,maxWidth}' = '1840';
