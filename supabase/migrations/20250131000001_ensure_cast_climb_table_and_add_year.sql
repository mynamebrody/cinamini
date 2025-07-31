-- Ensure Cast Climb tables exist and add guess_film_year column
-- This migration handles the case where cast_climb_guesses table might not exist on remote

-- Create cast_climb_guesses table if it doesn't exist
DO $$
BEGIN
    -- Check if cast_climb_guesses table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'cast_climb_guesses') THEN
        
        -- Create the table with all required columns including guess_film_year
        CREATE TABLE "public"."cast_climb_guesses" (
            "id" uuid DEFAULT gen_random_uuid() NOT NULL,
            "user_id" uuid NOT NULL,
            "puzzle_id" uuid NOT NULL,
            "guess_film_id" integer NOT NULL,
            "guess_film_title" character varying NOT NULL,
            "guess_film_year" character varying, -- Include the year column from the start
            "is_correct" boolean NOT NULL,
            "actors_revealed" integer NOT NULL,
            "solve_time_ms" integer,
            "attempt_number" integer NOT NULL,
            "created_at" timestamp with time zone DEFAULT now(),
            CONSTRAINT "cast_climb_guesses_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "cast_climb_guesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
            CONSTRAINT "cast_climb_guesses_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "public"."cast_climb_puzzles"("id") ON DELETE CASCADE
        );

        -- Add indexes
        CREATE INDEX "cast_climb_guesses_user_id_idx" ON "public"."cast_climb_guesses" USING btree ("user_id");
        CREATE INDEX "cast_climb_guesses_puzzle_id_idx" ON "public"."cast_climb_guesses" USING btree ("puzzle_id");
        CREATE INDEX "cast_climb_guesses_user_puzzle_idx" ON "public"."cast_climb_guesses" USING btree ("user_id", "puzzle_id");

        -- Enable RLS
        ALTER TABLE "public"."cast_climb_guesses" ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "cast_climb_guesses_select_policy" ON "public"."cast_climb_guesses"
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "cast_climb_guesses_insert_policy" ON "public"."cast_climb_guesses"
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "cast_climb_guesses_update_policy" ON "public"."cast_climb_guesses"
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "cast_climb_guesses_delete_policy" ON "public"."cast_climb_guesses"
            FOR DELETE USING (auth.uid() = user_id);

        -- Add comments
        COMMENT ON TABLE "public"."cast_climb_guesses" IS 'User guesses for Cast Climb puzzles with attempt tracking';
        COMMENT ON COLUMN "public"."cast_climb_guesses"."actors_revealed" IS 'Number of actors shown when this guess was made (1-4)';
        COMMENT ON COLUMN "public"."cast_climb_guesses"."guess_film_year" IS 'Release year of the guessed film for display purposes';
        
        RAISE NOTICE 'Created cast_climb_guesses table with guess_film_year column';
        
    ELSE
        -- Table exists, check if guess_film_year column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'cast_climb_guesses' 
                       AND column_name = 'guess_film_year') THEN
            
            -- Add the column
            ALTER TABLE "public"."cast_climb_guesses" 
            ADD COLUMN "guess_film_year" character varying;
            
            -- Add comment
            COMMENT ON COLUMN "public"."cast_climb_guesses"."guess_film_year" IS 'Release year of the guessed film for display purposes';
            
            RAISE NOTICE 'Added guess_film_year column to existing cast_climb_guesses table';
        ELSE
            RAISE NOTICE 'guess_film_year column already exists in cast_climb_guesses table';
        END IF;
    END IF;
END $$;

-- Ensure cast_climb_puzzles table exists (referenced by foreign key)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'cast_climb_puzzles') THEN
        
        CREATE TABLE "public"."cast_climb_puzzles" (
            "id" uuid DEFAULT gen_random_uuid() NOT NULL,
            "puzzle_date" date,
            "puzzle_number" integer NOT NULL,
            "film_id" integer NOT NULL,
            "film_title" character varying NOT NULL,
            "film_poster_url" text,
            "film_release_year" integer,
            "actors" jsonb NOT NULL,
            "total_actors" integer NOT NULL DEFAULT 4,
            "difficulty_level" integer DEFAULT 1,
            "fun_fact" text,
            "created_at" timestamp with time zone DEFAULT now(),
            CONSTRAINT "cast_climb_puzzles_pkey" PRIMARY KEY ("id")
        );

        -- Add indexes
        CREATE INDEX "cast_climb_puzzles_puzzle_date_idx" ON "public"."cast_climb_puzzles" USING btree ("puzzle_date");

        -- Enable RLS
        ALTER TABLE "public"."cast_climb_puzzles" ENABLE ROW LEVEL SECURITY;

        -- Create RLS policy
        CREATE POLICY "cast_climb_puzzles_select_policy" ON "public"."cast_climb_puzzles"
            FOR SELECT USING (auth.role() = 'authenticated');

        -- Add comment
        COMMENT ON TABLE "public"."cast_climb_puzzles" IS 'Daily Cast Climb puzzles with movie cast information';
        COMMENT ON COLUMN "public"."cast_climb_puzzles"."actors" IS 'JSON array of actor objects with name, character, and order';
        
        RAISE NOTICE 'Created cast_climb_puzzles table';
    END IF;
END $$;

-- Ensure cast_climb_user_stats table exists  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'cast_climb_user_stats') THEN
        
        CREATE TABLE "public"."cast_climb_user_stats" (
            "user_id" uuid NOT NULL,
            "games_played" integer DEFAULT 0,
            "games_won" integer DEFAULT 0,
            "current_streak" integer DEFAULT 0,
            "longest_streak" integer DEFAULT 0,
            "total_guesses" integer DEFAULT 0,
            "perfect_games" integer DEFAULT 0,
            "average_actors_revealed" numeric(3,2),
            "average_solve_time_ms" integer,
            "best_solve_time_ms" integer,
            "last_played_date" date,
            "updated_at" timestamp with time zone DEFAULT now(),
            CONSTRAINT "cast_climb_user_stats_pkey" PRIMARY KEY ("user_id"),
            CONSTRAINT "cast_climb_user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
        );

        -- Enable RLS
        ALTER TABLE "public"."cast_climb_user_stats" ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "cast_climb_user_stats_select_policy" ON "public"."cast_climb_user_stats"
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "cast_climb_user_stats_insert_policy" ON "public"."cast_climb_user_stats"
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "cast_climb_user_stats_update_policy" ON "public"."cast_climb_user_stats"
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "cast_climb_user_stats_delete_policy" ON "public"."cast_climb_user_stats"
            FOR DELETE USING (auth.uid() = user_id);

        -- Add comment
        COMMENT ON TABLE "public"."cast_climb_user_stats" IS 'User statistics and performance metrics for Cast Climb';
        COMMENT ON COLUMN "public"."cast_climb_user_stats"."perfect_games" IS 'Games won with only 1 guess (first actor revealed)';
        
        RAISE NOTICE 'Created cast_climb_user_stats table';
    END IF;
END $$;