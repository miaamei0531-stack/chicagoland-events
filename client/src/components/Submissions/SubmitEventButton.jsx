import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../services/supabase.js';
import SubmitEventForm from './SubmitEventForm.jsx';

export default function SubmitEventButton({ inline = false }) {
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
      <button
        onClick={handleClick}
        className={
          inline
            ? 'w-full flex items-center justify-center gap-2 bg-community text-white font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors mb-1'
            : 'hidden'
        }
      >
        <span className="text-lg leading-none">+</span>
        Submit Event
      </button>

      {/* Slide-in form panel */}
      {open && (
        <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-xl z-50 flex flex-col">
          <SubmitEventForm onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
