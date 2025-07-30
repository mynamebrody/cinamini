-- Add Poster Pixels user stats table

-- Create poster_pixels_user_stats table
CREATE TABLE IF NOT EXISTS "public"."poster_pixels_user_stats" (
    "user_id" uuid NOT NULL,
    "games_played" integer DEFAULT 0,
    "games_won" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "average_time_ms" integer,
    "best_time_ms" integer,
    "last_played_date" date,
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "poster_pixels_user_stats_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "poster_pixels_user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."poster_pixels_user_stats" OWNER TO "postgres";

-- Create index for performance
CREATE INDEX IF NOT EXISTS "poster_pixels_user_stats_user_id_idx" ON "public"."poster_pixels_user_stats" USING btree ("user_id");

-- Enable Row Level Security
ALTER TABLE "public"."poster_pixels_user_stats" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user stats
CREATE POLICY "Users can view own stats" ON "public"."poster_pixels_user_stats"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stats" ON "public"."poster_pixels_user_stats"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON "public"."poster_pixels_user_stats"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats" ON "public"."poster_pixels_user_stats"
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON TABLE "public"."poster_pixels_user_stats" TO "postgres";
GRANT ALL ON TABLE "public"."poster_pixels_user_stats" TO "anon";
GRANT ALL ON TABLE "public"."poster_pixels_user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."poster_pixels_user_stats" TO "service_role";

-- Create the function first if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_poster_pixels_user_stats_updated_at BEFORE UPDATE ON "public"."poster_pixels_user_stats"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE "public"."poster_pixels_user_stats" IS 'User statistics and performance metrics for Poster Pixels';
COMMENT ON COLUMN "public"."poster_pixels_user_stats"."average_time_ms" IS 'Average time to complete games in milliseconds';
COMMENT ON COLUMN "public"."poster_pixels_user_stats"."best_time_ms" IS 'Best (fastest) completion time in milliseconds';