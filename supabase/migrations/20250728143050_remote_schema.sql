

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tmdb_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tmdb_trending_cache WHERE expires_at < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tmdb_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_favorite_films_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_favorite_films_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."budget_bracket_games" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "puzzle_id" integer,
    "rounds_completed" integer DEFAULT 0 NOT NULL,
    "final_result" character varying(20) NOT NULL,
    "choices" "jsonb" NOT NULL,
    "total_duration_ms" integer,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_bracket_games" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."budget_bracket_games_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."budget_bracket_games_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."budget_bracket_games_id_seq" OWNED BY "public"."budget_bracket_games"."id";



CREATE TABLE IF NOT EXISTS "public"."budget_bracket_puzzles" (
    "id" integer NOT NULL,
    "puzzle_date" "date" NOT NULL,
    "seed_value" character varying(32) NOT NULL,
    "movie_pairs" "jsonb" NOT NULL,
    "difficulty_progression" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "puzzle_number" integer NOT NULL,
    CONSTRAINT "bb_puzzles_seed_format" CHECK (((("seed_value")::"text" ~ '^[a-zA-Z0-9_-]+$'::"text") AND ("length"(("seed_value")::"text") <= 32)))
);


ALTER TABLE "public"."budget_bracket_puzzles" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_bracket_puzzles" IS 'Daily Budget Bracket puzzle configurations with unified seeding support';



COMMENT ON COLUMN "public"."budget_bracket_puzzles"."seed_value" IS 'Deterministic seed value for reproducible puzzle generation';



COMMENT ON COLUMN "public"."budget_bracket_puzzles"."movie_pairs" IS 'JSON array of movie pairs for each round with metadata';



COMMENT ON COLUMN "public"."budget_bracket_puzzles"."difficulty_progression" IS 'Target difficulty ratios for progressive rounds';



CREATE SEQUENCE IF NOT EXISTS "public"."budget_bracket_puzzles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."budget_bracket_puzzles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."budget_bracket_puzzles_id_seq" OWNED BY "public"."budget_bracket_puzzles"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."budget_bracket_puzzles_puzzle_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."budget_bracket_puzzles_puzzle_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."budget_bracket_puzzles_puzzle_number_seq" OWNED BY "public"."budget_bracket_puzzles"."puzzle_number";



CREATE TABLE IF NOT EXISTS "public"."budget_bracket_stats" (
    "user_id" "uuid" NOT NULL,
    "games_played" integer DEFAULT 0,
    "perfect_games" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "best_streak" integer DEFAULT 0,
    "total_rounds_won" integer DEFAULT 0,
    "average_round_reached" numeric(3,2) DEFAULT 0.00,
    "last_played_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."budget_bracket_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cinamini_games" (
    "game_id" character varying(50) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "launch_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cinamini_games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cinamini_user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" character varying(100),
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cinamini_user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."cinamini_user_profiles" IS 'Extended user profile information for Cinamini users';



COMMENT ON COLUMN "public"."cinamini_user_profiles"."user_id" IS 'References auth.users.id - the primary user identifier';



COMMENT ON COLUMN "public"."cinamini_user_profiles"."display_name" IS 'User-chosen display name/username, must be unique';



COMMENT ON COLUMN "public"."cinamini_user_profiles"."avatar_url" IS 'URL to user avatar image (for future use)';



COMMENT ON COLUMN "public"."cinamini_user_profiles"."created_at" IS 'When the profile was first created';



COMMENT ON COLUMN "public"."cinamini_user_profiles"."updated_at" IS 'When the profile was last modified (auto-updated by trigger)';



CREATE TABLE IF NOT EXISTS "public"."retitled_guesses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "puzzle_id" "uuid",
    "guess_film_id" integer NOT NULL,
    "is_correct" boolean NOT NULL,
    "solve_time_ms" integer,
    "attempt_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."retitled_guesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retitled_puzzles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "puzzle_date" "date" NOT NULL,
    "film_id" integer NOT NULL,
    "film_title" character varying NOT NULL,
    "localized_title" character varying NOT NULL,
    "country_code" character varying(2) NOT NULL,
    "country_name" character varying NOT NULL,
    "distractor_ids" integer[] NOT NULL,
    "difficulty_level" integer DEFAULT 1,
    "translation_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "seed_value" character varying(32) NOT NULL,
    "puzzle_number" integer NOT NULL,
    CONSTRAINT "retitled_puzzles_difficulty_range" CHECK ((("difficulty_level" >= 1) AND ("difficulty_level" <= 4))),
    CONSTRAINT "retitled_puzzles_seed_format" CHECK (((("seed_value")::"text" ~ '^[a-zA-Z0-9_-]+$'::"text") AND ("length"(("seed_value")::"text") <= 32)))
);


ALTER TABLE "public"."retitled_puzzles" OWNER TO "postgres";


COMMENT ON TABLE "public"."retitled_puzzles" IS 'Daily Retitled puzzle configurations with localized movie titles';



COMMENT ON COLUMN "public"."retitled_puzzles"."country_name" IS 'Human-readable country name for UI display';



COMMENT ON COLUMN "public"."retitled_puzzles"."translation_note" IS 'Optional explanation about the translation for user education';



COMMENT ON COLUMN "public"."retitled_puzzles"."seed_value" IS 'Deterministic seed value for reproducible puzzle generation';



CREATE SEQUENCE IF NOT EXISTS "public"."retitled_puzzles_puzzle_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."retitled_puzzles_puzzle_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."retitled_puzzles_puzzle_number_seq" OWNED BY "public"."retitled_puzzles"."puzzle_number";



CREATE TABLE IF NOT EXISTS "public"."retitled_user_stats" (
    "user_id" "uuid" NOT NULL,
    "games_played" integer DEFAULT 0,
    "games_correct" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "average_solve_time_ms" integer,
    "countries_guessed" "jsonb" DEFAULT '[]'::"jsonb",
    "last_played_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."retitled_user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tmdb_trending_cache" (
    "id" "text" NOT NULL,
    "time_window" "text" NOT NULL,
    "movies_data" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total_results" integer,
    "page_fetched" integer DEFAULT 1,
    "cache_version" "text" DEFAULT '1.0'::"text",
    CONSTRAINT "tmdb_trending_cache_time_window_check" CHECK (("time_window" = ANY (ARRAY['day'::"text", 'week'::"text"])))
);


ALTER TABLE "public"."tmdb_trending_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."tmdb_trending_cache" IS 'Cache table for TMDB trending movies data to reduce API calls and provide offline capability';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."time_window" IS 'TMDB trending time window: day or week';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."movies_data" IS 'JSON array of TMDBMovie objects from TMDB API';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."expires_at" IS 'When this cache entry expires and should be refreshed';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."total_results" IS 'Total number of results from TMDB API response';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."page_fetched" IS 'Which page of results this cache entry represents';



COMMENT ON COLUMN "public"."tmdb_trending_cache"."cache_version" IS 'Version of cache format for migration compatibility';



CREATE TABLE IF NOT EXISTS "public"."user_favorite_films" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "movie_id" integer NOT NULL,
    "movie_title" "text" NOT NULL,
    "poster_path" "text",
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_favorite_films_position_check" CHECK ((("position" >= 1) AND ("position" <= 4)))
);


ALTER TABLE "public"."user_favorite_films" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorite_films" IS 'User favorite films (max 4) displayed on profile';



COMMENT ON COLUMN "public"."user_favorite_films"."id" IS 'Unique identifier for the favorite entry';



COMMENT ON COLUMN "public"."user_favorite_films"."user_id" IS 'References auth.users.id';



COMMENT ON COLUMN "public"."user_favorite_films"."movie_id" IS 'TMDB movie ID';



COMMENT ON COLUMN "public"."user_favorite_films"."movie_title" IS 'Cached movie title for performance';



COMMENT ON COLUMN "public"."user_favorite_films"."poster_path" IS 'TMDB poster path (relative URL)';



COMMENT ON COLUMN "public"."user_favorite_films"."position" IS 'Display position (1-4) in the grid';



COMMENT ON COLUMN "public"."user_favorite_films"."created_at" IS 'When the favorite was added';



COMMENT ON COLUMN "public"."user_favorite_films"."updated_at" IS 'When the favorite was last modified';



ALTER TABLE ONLY "public"."budget_bracket_games" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."budget_bracket_games_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."budget_bracket_puzzles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."budget_bracket_puzzles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."budget_bracket_puzzles" ALTER COLUMN "puzzle_number" SET DEFAULT "nextval"('"public"."budget_bracket_puzzles_puzzle_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."retitled_puzzles" ALTER COLUMN "puzzle_number" SET DEFAULT "nextval"('"public"."retitled_puzzles_puzzle_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."budget_bracket_games"
    ADD CONSTRAINT "budget_bracket_games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_bracket_games"
    ADD CONSTRAINT "budget_bracket_games_user_id_puzzle_id_key" UNIQUE ("user_id", "puzzle_id");



ALTER TABLE ONLY "public"."budget_bracket_puzzles"
    ADD CONSTRAINT "budget_bracket_puzzles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_bracket_puzzles"
    ADD CONSTRAINT "budget_bracket_puzzles_puzzle_date_key" UNIQUE ("puzzle_date");



ALTER TABLE ONLY "public"."budget_bracket_stats"
    ADD CONSTRAINT "budget_bracket_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."cinamini_games"
    ADD CONSTRAINT "cinamini_games_pkey" PRIMARY KEY ("game_id");



ALTER TABLE ONLY "public"."cinamini_user_profiles"
    ADD CONSTRAINT "cinamini_user_profiles_display_name_key" UNIQUE ("display_name");



ALTER TABLE ONLY "public"."cinamini_user_profiles"
    ADD CONSTRAINT "cinamini_user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."retitled_guesses"
    ADD CONSTRAINT "retitled_guesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."retitled_guesses"
    ADD CONSTRAINT "retitled_guesses_user_id_puzzle_id_key" UNIQUE ("user_id", "puzzle_id");



ALTER TABLE ONLY "public"."retitled_puzzles"
    ADD CONSTRAINT "retitled_puzzles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."retitled_puzzles"
    ADD CONSTRAINT "retitled_puzzles_puzzle_date_key" UNIQUE ("puzzle_date");



ALTER TABLE ONLY "public"."retitled_user_stats"
    ADD CONSTRAINT "retitled_user_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."tmdb_trending_cache"
    ADD CONSTRAINT "tmdb_trending_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorite_films"
    ADD CONSTRAINT "user_favorite_films_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorite_films"
    ADD CONSTRAINT "user_favorite_films_user_id_movie_id_key" UNIQUE ("user_id", "movie_id");



ALTER TABLE ONLY "public"."user_favorite_films"
    ADD CONSTRAINT "user_favorite_films_user_id_position_key" UNIQUE ("user_id", "position");



CREATE INDEX "idx_bb_games_completed_at" ON "public"."budget_bracket_games" USING "btree" ("completed_at");



CREATE INDEX "idx_bb_games_user_date" ON "public"."budget_bracket_games" USING "btree" ("user_id", "completed_at");



CREATE INDEX "idx_bb_games_user_puzzle" ON "public"."budget_bracket_games" USING "btree" ("user_id", "puzzle_id");



CREATE INDEX "idx_bb_puzzles_date" ON "public"."budget_bracket_puzzles" USING "btree" ("puzzle_date");



CREATE INDEX "idx_bb_puzzles_seed" ON "public"."budget_bracket_puzzles" USING "btree" ("seed_value");



CREATE INDEX "idx_bb_stats_streak" ON "public"."budget_bracket_stats" USING "btree" ("user_id", "current_streak", "last_played_date");



CREATE INDEX "idx_bb_stats_user_id" ON "public"."budget_bracket_stats" USING "btree" ("user_id");



CREATE INDEX "idx_cinamini_user_profiles_display_name" ON "public"."cinamini_user_profiles" USING "btree" ("display_name");



CREATE INDEX "idx_cinamini_user_profiles_updated_at" ON "public"."cinamini_user_profiles" USING "btree" ("updated_at");



CREATE INDEX "idx_retitled_guesses_created_at" ON "public"."retitled_guesses" USING "btree" ("created_at");



CREATE INDEX "idx_retitled_guesses_puzzle" ON "public"."retitled_guesses" USING "btree" ("puzzle_id");



CREATE INDEX "idx_retitled_guesses_user" ON "public"."retitled_guesses" USING "btree" ("user_id");



CREATE INDEX "idx_retitled_guesses_user_date" ON "public"."retitled_guesses" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_retitled_puzzles_country" ON "public"."retitled_puzzles" USING "btree" ("country_code");



CREATE INDEX "idx_retitled_puzzles_date" ON "public"."retitled_puzzles" USING "btree" ("puzzle_date");



CREATE INDEX "idx_retitled_puzzles_difficulty" ON "public"."retitled_puzzles" USING "btree" ("difficulty_level");



CREATE INDEX "idx_retitled_puzzles_film_id" ON "public"."retitled_puzzles" USING "btree" ("film_id");



CREATE INDEX "idx_retitled_puzzles_seed" ON "public"."retitled_puzzles" USING "btree" ("seed_value");



CREATE INDEX "idx_retitled_stats_streak" ON "public"."retitled_user_stats" USING "btree" ("user_id", "current_streak", "last_played_date");



CREATE INDEX "idx_tmdb_cache_cleanup" ON "public"."tmdb_trending_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_tmdb_trending_cache_compound" ON "public"."tmdb_trending_cache" USING "btree" ("time_window", "expires_at");



CREATE INDEX "idx_tmdb_trending_cache_expires_at" ON "public"."tmdb_trending_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_tmdb_trending_cache_fetched_at" ON "public"."tmdb_trending_cache" USING "btree" ("fetched_at");



CREATE INDEX "idx_tmdb_trending_cache_time_window" ON "public"."tmdb_trending_cache" USING "btree" ("time_window");



CREATE INDEX "idx_user_favorite_films_user_id" ON "public"."user_favorite_films" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_budget_bracket_stats_updated_at" BEFORE UPDATE ON "public"."budget_bracket_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cinamini_games_updated_at" BEFORE UPDATE ON "public"."cinamini_games" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cinamini_user_profiles_updated_at" BEFORE UPDATE ON "public"."cinamini_user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_favorite_films_updated_at" BEFORE UPDATE ON "public"."user_favorite_films" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_favorite_films_updated_at"();



ALTER TABLE ONLY "public"."budget_bracket_games"
    ADD CONSTRAINT "budget_bracket_games_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "public"."budget_bracket_puzzles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_bracket_games"
    ADD CONSTRAINT "budget_bracket_games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_bracket_stats"
    ADD CONSTRAINT "budget_bracket_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cinamini_user_profiles"
    ADD CONSTRAINT "cinamini_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."retitled_guesses"
    ADD CONSTRAINT "retitled_guesses_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "public"."retitled_puzzles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."retitled_guesses"
    ADD CONSTRAINT "retitled_guesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."retitled_user_stats"
    ADD CONSTRAINT "retitled_user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorite_films"
    ADD CONSTRAINT "user_favorite_films_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view puzzles" ON "public"."budget_bracket_puzzles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Service role can manage puzzles" ON "public"."budget_bracket_puzzles" TO "service_role" USING (true);



CREATE POLICY "Users can delete own favorite films" ON "public"."user_favorite_films" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own profile" ON "public"."cinamini_user_profiles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own favorite films" ON "public"."user_favorite_films" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own games" ON "public"."budget_bracket_games" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own guesses" ON "public"."retitled_guesses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."cinamini_user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own stats" ON "public"."budget_bracket_stats" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own stats" ON "public"."retitled_user_stats" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own favorite films" ON "public"."user_favorite_films" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own games" ON "public"."budget_bracket_games" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own guesses" ON "public"."retitled_guesses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."cinamini_user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own stats" ON "public"."budget_bracket_stats" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own stats" ON "public"."retitled_user_stats" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own favorite films" ON "public"."user_favorite_films" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own games" ON "public"."budget_bracket_games" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own guesses" ON "public"."retitled_guesses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."cinamini_user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own stats" ON "public"."budget_bracket_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own stats" ON "public"."retitled_user_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."budget_bracket_games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_bracket_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cinamini_user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."retitled_guesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."retitled_puzzles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "retitled_puzzles_read_policy" ON "public"."retitled_puzzles" FOR SELECT USING (true);



CREATE POLICY "retitled_puzzles_server_policy" ON "public"."retitled_puzzles" USING ((("current_setting"('role'::"text") = 'service_role'::"text") OR ("auth"."role"() IS NULL) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "retitled_puzzles_service_policy" ON "public"."retitled_puzzles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."retitled_user_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tmdb_cache_read_policy" ON "public"."tmdb_trending_cache" FOR SELECT USING (true);



CREATE POLICY "tmdb_cache_server_policy" ON "public"."tmdb_trending_cache" USING ((("current_setting"('role'::"text") = 'service_role'::"text") OR ("auth"."role"() IS NULL) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tmdb_cache_service_policy" ON "public"."tmdb_trending_cache" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tmdb_trending_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_favorite_films" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."retitled_puzzles";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cleanup_expired_tmdb_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tmdb_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tmdb_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_favorite_films_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_favorite_films_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_favorite_films_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."budget_bracket_games" TO "anon";
GRANT ALL ON TABLE "public"."budget_bracket_games" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_bracket_games" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_bracket_games_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_bracket_games_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_bracket_games_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budget_bracket_puzzles" TO "anon";
GRANT ALL ON TABLE "public"."budget_bracket_puzzles" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_bracket_puzzles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_puzzle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_puzzle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_bracket_puzzles_puzzle_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budget_bracket_stats" TO "anon";
GRANT ALL ON TABLE "public"."budget_bracket_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_bracket_stats" TO "service_role";



GRANT ALL ON TABLE "public"."cinamini_games" TO "anon";
GRANT ALL ON TABLE "public"."cinamini_games" TO "authenticated";
GRANT ALL ON TABLE "public"."cinamini_games" TO "service_role";



GRANT ALL ON TABLE "public"."cinamini_user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."cinamini_user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."cinamini_user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."retitled_guesses" TO "anon";
GRANT ALL ON TABLE "public"."retitled_guesses" TO "authenticated";
GRANT ALL ON TABLE "public"."retitled_guesses" TO "service_role";



GRANT ALL ON TABLE "public"."retitled_puzzles" TO "anon";
GRANT ALL ON TABLE "public"."retitled_puzzles" TO "authenticated";
GRANT ALL ON TABLE "public"."retitled_puzzles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."retitled_puzzles_puzzle_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."retitled_puzzles_puzzle_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."retitled_puzzles_puzzle_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."retitled_user_stats" TO "anon";
GRANT ALL ON TABLE "public"."retitled_user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."retitled_user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."tmdb_trending_cache" TO "anon";
GRANT ALL ON TABLE "public"."tmdb_trending_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."tmdb_trending_cache" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorite_films" TO "anon";
GRANT ALL ON TABLE "public"."user_favorite_films" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorite_films" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
