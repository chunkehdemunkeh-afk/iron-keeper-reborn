-- Coach <-> athlete messaging. One implicit thread per coach_athletes pair;
-- either side can send. Scoped strictly to an existing roster link so a
-- message can't be sent to/received from someone outside the relationship.
CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_messages_thread ON public.coach_messages (coach_user_id, athlete_user_id, created_at);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages"
  ON public.coach_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_user_id OR auth.uid() = athlete_user_id);

-- Sender must be a participant in the thread, and the coach_athletes link
-- must actually exist (covers both directions: coach messaging an athlete,
-- or athlete messaging their coach).
CREATE POLICY "Thread participants can send messages"
  ON public.coach_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (auth.uid() = coach_user_id OR auth.uid() = athlete_user_id)
    AND EXISTS (
      SELECT 1 FROM public.coach_athletes ca
      WHERE ca.coach_user_id = coach_messages.coach_user_id
        AND ca.athlete_user_id = coach_messages.athlete_user_id
    )
  );

CREATE POLICY "Recipient can mark messages read"
  ON public.coach_messages FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = coach_user_id AND sender_id != auth.uid())
    OR (auth.uid() = athlete_user_id AND sender_id != auth.uid())
  )
  WITH CHECK (
    (auth.uid() = coach_user_id AND sender_id != auth.uid())
    OR (auth.uid() = athlete_user_id AND sender_id != auth.uid())
  );

-- RLS alone doesn't restrict which columns an UPDATE can touch — without this,
-- a recipient could rewrite `body`/`sender_id` on someone else's message while
-- only intending to flip `read`. Column-level privileges close that gap.
REVOKE UPDATE ON public.coach_messages FROM authenticated;
GRANT UPDATE (read) ON public.coach_messages TO authenticated;
