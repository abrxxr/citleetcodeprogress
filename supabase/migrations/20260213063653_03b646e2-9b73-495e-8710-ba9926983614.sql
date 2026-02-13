
-- Fix: Allow all authenticated users to view weekly_entries (needed for leaderboard)
CREATE POLICY "Authenticated users can view all entries"
ON public.weekly_entries
FOR SELECT
TO authenticated
USING (true);
