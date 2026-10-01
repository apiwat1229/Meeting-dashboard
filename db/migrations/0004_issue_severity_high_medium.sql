UPDATE issues
SET severity = 'MEDIUM', updated_at = NOW()
WHERE severity = 'LOW';
