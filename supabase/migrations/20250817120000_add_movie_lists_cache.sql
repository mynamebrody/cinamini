-- Create table for caching TMDB movie lists (now playing, popular, top rated, upcoming)
CREATE TABLE IF NOT EXISTS "public"."tmdb_movie_lists_cache" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "list_type" text NOT NULL,
    "movies_data" jsonb NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "page" integer DEFAULT 1,
    "total_results" integer,
    "cache_version" text DEFAULT '1.0',
    CONSTRAINT "tmdb_movie_lists_cache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tmdb_movie_lists_cache_list_type_check" CHECK (("list_type" = ANY (ARRAY['now_playing'::text, 'popular'::text, 'top_rated'::text, 'upcoming'::text])))
);

-- Set table owner
ALTER TABLE "public"."tmdb_movie_lists_cache" OWNER TO "postgres";

-- Add table comment
COMMENT ON TABLE "public"."tmdb_movie_lists_cache" IS 'Cache table for TMDB movie lists (now playing, popular, top rated, upcoming) to reduce API calls and provide fast access';

-- Add column comments
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."list_type" IS 'Type of movie list: now_playing, popular, top_rated, upcoming';
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."movies_data" IS 'JSON array of movie objects with full details from TMDB API';
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."expires_at" IS 'When this cache entry expires and should be refreshed (24 hours from fetch)';
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."total_results" IS 'Total number of results from TMDB API response';
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."page" IS 'Which page of results this cache entry represents';
COMMENT ON COLUMN "public"."tmdb_movie_lists_cache"."cache_version" IS 'Version of cache format for migration compatibility';

-- Create indexes for performance
CREATE INDEX "idx_tmdb_movie_lists_cache_list_type" ON "public"."tmdb_movie_lists_cache" USING btree ("list_type");
CREATE INDEX "idx_tmdb_movie_lists_cache_expires_at" ON "public"."tmdb_movie_lists_cache" USING btree ("expires_at");
CREATE INDEX "idx_tmdb_movie_lists_cache_compound" ON "public"."tmdb_movie_lists_cache" USING btree ("list_type", "expires_at");
CREATE INDEX "idx_tmdb_movie_lists_cache_fetched_at" ON "public"."tmdb_movie_lists_cache" USING btree ("fetched_at");
CREATE INDEX "idx_tmdb_movie_lists_cache_cleanup" ON "public"."tmdb_movie_lists_cache" USING btree ("expires_at");

-- Enable Row Level Security
ALTER TABLE "public"."tmdb_movie_lists_cache" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for read access
CREATE POLICY "tmdb_movie_lists_cache_read_policy" ON "public"."tmdb_movie_lists_cache" FOR SELECT USING (true);

-- Policy for service role (full access)
CREATE POLICY "tmdb_movie_lists_cache_service_policy" ON "public"."tmdb_movie_lists_cache" TO "service_role" USING (true) WITH CHECK (true);

-- Policy for server operations (authenticated admin users and service role)
CREATE POLICY "tmdb_movie_lists_cache_server_policy" ON "public"."tmdb_movie_lists_cache" 
USING ((
    (current_setting('role'::text) = 'service_role'::text) OR 
    (auth.role() IS NULL) OR 
    (auth.role() = 'service_role'::text)
));

-- Grant permissions
GRANT ALL ON TABLE "public"."tmdb_movie_lists_cache" TO "anon";
GRANT ALL ON TABLE "public"."tmdb_movie_lists_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."tmdb_movie_lists_cache" TO "service_role";

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_movie_lists_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tmdb_movie_lists_cache WHERE expires_at < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;