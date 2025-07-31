-- Function to calculate average session duration
-- This is a simplified implementation - in production you would track actual session times
CREATE OR REPLACE FUNCTION calculate_avg_session_duration(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(avg_duration INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  -- For now, return a fixed estimate of 3 minutes (180 seconds)
  -- In production, you would track actual session start/end times
  RETURN QUERY
  SELECT 180::INTEGER as avg_duration;
END;
$$;