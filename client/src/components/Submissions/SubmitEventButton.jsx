import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../services/supabase.js';
import SubmitEventForm from './SubmitEventForm.jsx';

export default function SubmitEventButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  async function handleClick() {
    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return;
    }
    setOpen(true);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleClick}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-10 flex items-center gap-2 bg-community text-white font-medium text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-green-700 transition-colors"
      >
        <span className="text-lg leading-none">+</span>
        Submit Event
      </button>

      {/* Slide-in form panel */}
      {open && (
        <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-white shadow-xl z-20 flex flex-col">
          <SubmitEventForm onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
