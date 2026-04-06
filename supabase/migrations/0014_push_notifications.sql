-- Enable push notifications per account (default on)
ALTER TABLE accounts ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Store push subscriptions per user per device
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role needs access from cron
CREATE POLICY "Service role reads all subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.role() = 'service_role');
