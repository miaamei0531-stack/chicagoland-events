import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';

export function useMessages(conversationId, token) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !token) return;

    setLoading(true);
    api.getMessages(conversationId, token)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new;
          // Fetch sender details then append
          supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .eq('id', msg.sender_id)
            .single()
            .then(({ data: sender }) => {
              setMessages((prev) => [...prev, { ...msg, sender }]);
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, token]);

  return { messages, loading, setMessages };
}
