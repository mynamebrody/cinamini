-- Cast Climb game schema
-- Daily puzzle guessing game where players identify movies from cast members

-- Cast Climb puzzles table - stores daily puzzle data
CREATE TABLE "public"."cast_climb_puzzles" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "puzzle_date" date NOT NULL UNIQUE,
    "puzzle_number" integer NOT NULL,
    "film_id" integer NOT NULL,
    "film_title" character varying NOT NULL,
    "film_poster_url" text,
    "film_release_year" integer,
    "actors" jsonb NOT NULL, -- Array of actor objects with name, order, character
    "total_actors" integer NOT NULL DEFAULT 4,
    "difficulty_level" integer DEFAULT 1,
    "fun_fact" text,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "cast_climb_puzzles_pkey" PRIMARY KEY ("id")
);

-- Cast Climb guesses table - tracks user guess attempts
CREATE TABLE "public"."cast_climb_guesses" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "puzzle_id" uuid NOT NULL,
    "guess_film_id" integer NOT NULL,
    "guess_film_title" character varying NOT NULL,
    "is_correct" boolean NOT NULL,
    "actors_revealed" integer NOT NULL, -- How many actors were shown when this guess was made
    "solve_time_ms" integer, -- Time from game start to correct guess (null if not correct)
    "attempt_number" integer NOT NULL, -- 1st guess, 2nd guess, etc.
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "cast_climb_guesses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cast_climb_guesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "cast_climb_guesses_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "public"."cast_climb_puzzles"("id") ON DELETE CASCADE
);

-- Cast Climb user stats table - tracks user performance
CREATE TABLE "public"."cast_climb_user_stats" (
    "user_id" uuid NOT NULL,
    "games_played" integer DEFAULT 0,
    "games_won" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "total_guesses" integer DEFAULT 0,
    "perfect_games" integer DEFAULT 0, -- Won with only 1 guess
    "average_actors_revealed" numeric(3,2), -- Average number of actors needed to win
    "average_solve_time_ms" integer,
    "best_solve_time_ms" integer,
    "last_played_date" date,
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "cast_climb_user_stats_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "cast_climb_user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX "cast_climb_puzzles_puzzle_date_idx" ON "public"."cast_climb_puzzles" USING btree ("puzzle_date");
CREATE INDEX "cast_climb_guesses_user_id_idx" ON "public"."cast_climb_guesses" USING btree ("user_id");
CREATE INDEX "cast_climb_guesses_puzzle_id_idx" ON "public"."cast_climb_guesses" USING btree ("puzzle_id");
CREATE INDEX "cast_climb_guesses_user_puzzle_idx" ON "public"."cast_climb_guesses" USING btree ("user_id", "puzzle_id");

-- Row Level Security (RLS) policies
ALTER TABLE "public"."cast_climb_puzzles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cast_climb_guesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cast_climb_user_stats" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cast_climb_puzzles (readable by authenticated users)
CREATE POLICY "cast_climb_puzzles_select_policy" ON "public"."cast_climb_puzzles"
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for cast_climb_guesses (users can CRUD their own guesses)
CREATE POLICY "cast_climb_guesses_select_policy" ON "public"."cast_climb_guesses"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cast_climb_guesses_insert_policy" ON "public"."cast_climb_guesses"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cast_climb_guesses_update_policy" ON "public"."cast_climb_guesses"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cast_climb_guesses_delete_policy" ON "public"."cast_climb_guesses"
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cast_climb_user_stats (users can CRUD their own stats)
CREATE POLICY "cast_climb_user_stats_select_policy" ON "public"."cast_climb_user_stats"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cast_climb_user_stats_insert_policy" ON "public"."cast_climb_user_stats"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cast_climb_user_stats_update_policy" ON "public"."cast_climb_user_stats"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cast_climb_user_stats_delete_policy" ON "public"."cast_climb_user_stats"
    FOR DELETE USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE "public"."cast_climb_puzzles" IS 'Daily Cast Climb puzzles with movie cast information';
COMMENT ON TABLE "public"."cast_climb_guesses" IS 'User guesses for Cast Climb puzzles with attempt tracking';  
COMMENT ON TABLE "public"."cast_climb_user_stats" IS 'User statistics and performance metrics for Cast Climb';

COMMENT ON COLUMN "public"."cast_climb_puzzles"."actors" IS 'JSON array of actor objects with name, character, and order';
COMMENT ON COLUMN "public"."cast_climb_guesses"."actors_revealed" IS 'Number of actors shown when this guess was made (1-4)';
COMMENT ON COLUMN "public"."cast_climb_user_stats"."perfect_games" IS 'Games won with only 1 guess (first actor revealed)';