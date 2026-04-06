const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');

// All routes require auth
router.use(checkAuth);

// ── POST /api/v1/conversations ─────────────────────────────────
// Create a DM or group chat
// Body: { member_ids: UUID[], name?, is_group?, is_public?, event_id? }
router.post('/', async (req, res) => {
  const { member_ids = [], name, is_group = false, is_public = false, event_id } = req.body;
  const creator_id = req.user.id;

  if (!member_ids.length) {
    return res.status(400).json({ error: 'At least one other member is required' });
  }
  if (is_group && !name?.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  // For DMs: check if a DM between these two users already exists
  if (!is_group && member_ids.length === 1) {
    const other_id = member_ids[0];
    const { data: existing } = await supabase.rpc('find_dm', {
      p_user1: creator_id,
      p_user2: other_id,
    });
    if (existing?.length > 0) {
      return res.json({ id: existing[0].id, existing: true });
    }
  }

  // Create conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      name: is_group ? name.trim() : null,
      is_group,
      is_public: is_group ? is_public : false,
      event_id: event_id || null,
      created_by: creator_id,
    })
    .select('id')
    .single();

  if (convError) return res.status(500).json({ error: convError.message });

  // Add all members (creator + invited)
  const allMembers = [
    { conversation_id: conv.id, user_id: creator_id, role: 'admin' },
    ...member_ids.map((uid) => ({ conversation_id: conv.id, user_id: uid, role: 'member' })),
  ];

  const { error: membersError } = await supabase
    .from('conversation_members')
    .insert(allMembers);

  if (membersError) return res.status(500).json({ error: membersError.message });

  res.status(201).json({ id: conv.id, existing: false });
});

// ── GET /api/v1/conversations ──────────────────────────────────
// List current user's conversations sorted by latest message
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      conversation:conversations(
        id, name, is_group, is_public, event_id, updated_at,
        created_by,
        members:conversation_members(
          user:users(id, display_name, avatar_url)
        )
      )
    `)
    .eq('user_id', req.user.id)
    .order('joined_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Fetch last message for each conversation
  const convIds = data.map((r) => r.conversation?.id).filter(Boolean);
  let lastMessages = {};
  if (convIds.length) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, body, created_at, sender:users(display_name)')
      .in('conversation_id', convIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (msgs) {
      msgs.forEach((m) => {
        if (!lastMessages[m.conversation_id]) {
          lastMessages[m.conversation_id] = m;
        }
      });
    }
  }

  const conversations = data
    .map((r) => r.conversation)
    .filter(Boolean)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .map((conv) => ({
      ...conv,
      last_message: lastMessages[conv.id] || null,
    }));

  res.json(conversations);
});

// ── GET /api/v1/conversations/:id ─────────────────────────────
// Get conversation details + members (must be a member)
router.get('/:id', async (req, res) => {
  // Check membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!membership) return res.status(403).json({ error: 'Not a member of this conversation' });

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, name, is_group, is_public, event_id, created_by, created_at,
      members:conversation_members(
        role, joined_at,
        user:users(id, display_name, avatar_url)
      ),
      event:events(id, title)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Conversation not found' });

  // Compute is_locked for DMs
  let is_locked = false;
  if (!data.is_group) {
    const otherId = data.members?.find((m) => m.user?.id !== req.user.id)?.user?.id;
    if (otherId) {
      const { count: otherCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', req.params.id)
        .eq('sender_id', otherId)
        .eq('is_deleted', false);

      if (!otherCount) {
        const { count: myCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', req.params.id)
          .eq('sender_id', req.user.id)
          .eq('is_deleted', false);
        is_locked = myCount >= 1;
      }
    }
  }

  res.json({ ...data, my_role: membership.role, is_locked });
});

// ── GET /api/v1/conversations/:id/messages ────────────────────
// Paginated message history (must be a member)
router.get('/:id/messages', async (req, res) => {
  const { limit = 50, before } = req.query;

  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!membership) return res.status(403).json({ error: 'Not a member' });

  let query = supabase
    .from('messages')
    .select('id, body, created_at, is_deleted, sender:users(id, display_name, avatar_url)')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data.reverse()); // return oldest-first
});

// ── POST /api/v1/conversations/:id/messages ───────────────────
// Send a message (must be a member)
router.post('/:id/messages', async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body is required' });

  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!membership) return res.status(403).json({ error: 'Not a member' });

  // DM-only safety checks
  const { data: conv } = await supabase
    .from('conversations')
    .select('is_group, conversation_members(user_id)')
    .eq('id', req.params.id)
    .single();

  if (conv && !conv.is_group) {
    const otherId = conv.conversation_members?.find((m) => m.user_id !== req.user.id)?.user_id;

    if (otherId) {
      // Block check
      const { data: block } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${req.user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${req.user.id})`)
        .limit(1);
      if (block?.length) return res.status(403).json({ error: 'blocked' });

      // 1-message limit: has the other person ever replied?
      const { count: otherCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', req.params.id)
        .eq('sender_id', otherId)
        .eq('is_deleted', false);

      if (!otherCount) {
        // Other person hasn't replied — count how many I've already sent
        const { count: myCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', req.params.id)
          .eq('sender_id', req.user.id)
          .eq('is_deleted', false);

        if (myCount >= 1) {
          return res.status(403).json({ error: 'awaiting_reply', locked: true });
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: req.params.id,
      sender_id: req.user.id,
      body: body.trim(),
    })
    .select('id, body, created_at, sender:users(id, display_name, avatar_url)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── POST /api/v1/conversations/:id/members ────────────────────
// Add a member (admin only). Body: { user_id }
router.post('/:id/members', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const { data: membership } = await supabase
    .from('conversation_members')
    .select('role')
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!membership || membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add members' });
  }

  // Check member count
  const { count } = await supabase
    .from('conversation_members')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', req.params.id);

  const { data: conv } = await supabase
    .from('conversations')
    .select('max_members')
    .eq('id', req.params.id)
    .single();

  if (count >= (conv?.max_members || 300)) {
    return res.status(400).json({ error: 'Group is at maximum capacity' });
  }

  const { error } = await supabase
    .from('conversation_members')
    .insert({ conversation_id: req.params.id, user_id, role: 'member' });

  if (error?.code === '23505') return res.status(409).json({ error: 'User is already a member' });
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// ── DELETE /api/v1/conversations/:id/members/me ───────────────
// Leave a conversation
router.delete('/:id/members/me', async (req, res) => {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
