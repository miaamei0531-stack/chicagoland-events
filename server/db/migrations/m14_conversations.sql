-- M14: Chat & Messaging
-- Run in Supabase SQL Editor

-- Conversations (DMs and group chats)
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,                                    -- NULL for DMs, required for groups
  is_group    BOOLEAN DEFAULT FALSE,
  is_public   BOOLEAN DEFAULT FALSE,                   -- public groups appear on event pages
  event_id    UUID REFERENCES events(id) ON DELETE SET NULL,  -- optional link to an event
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_members INTEGER DEFAULT 300,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()                -- updated on each new message (for inbox sort)
);

-- Conversation members
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member',               -- 'admin' | 'member'
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON conversations (created_by);
CREATE INDEX ON conversations (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX ON conversation_members (user_id);
CREATE INDEX ON messages (conversation_id, created_at);
CREATE INDEX ON messages (sender_id);

-- Trigger: update conversations.updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_conversation_ts
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- RPC: find existing DM between two users
CREATE OR REPLACE FUNCTION find_dm(p_user1 UUID, p_user2 UUID)
RETURNS TABLE(id UUID) LANGUAGE sql STABLE AS $$
  SELECT c.id
  FROM conversations c
  WHERE c.is_group = FALSE
    AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = p_user1)
    AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = p_user2)
  LIMIT 1;
$$;

-- Enable Supabase Realtime on messages table
-- Go to Supabase Dashboard → Database → Replication → enable messages table
-- OR run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
