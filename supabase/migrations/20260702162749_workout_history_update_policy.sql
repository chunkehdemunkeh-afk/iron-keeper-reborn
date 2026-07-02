-- workout_history has SELECT/INSERT/DELETE policies but no UPDATE policy,
-- so fields like avg_hr/max_hr/effort_rating can never be corrected after insert.
CREATE POLICY "Users can update their own workouts" ON public.workout_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
