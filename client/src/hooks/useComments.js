import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';

export function useComments(eventId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await api.getComments(eventId);
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchComments();

    // Supabase Realtime — subscribe to new comments for this event
    const channel = supabase
      .channel(`comments:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Re-fetch on new insert to get the joined user data
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchComments]);

  return { comments, loading, error, refetch: fetchComments };
}
