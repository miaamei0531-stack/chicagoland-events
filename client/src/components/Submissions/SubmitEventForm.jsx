import { useState } from 'react';
import { supabase } from '../../services/supabase.js';
import StepBasicInfo from './StepBasicInfo.jsx';
import StepWhen from './StepWhen.jsx';
import StepWhere from './StepWhere.jsx';
import StepDetails from './StepDetails.jsx';
import StepReview from './StepReview.jsx';

const STEPS = ['Basic Info', 'When', 'Where', 'Details', 'Review'];

const INITIAL = {
  title: '', category: [], description: '',
  start_datetime: '', end_datetime: '', is_recurring: false, recurrence_rule: '',
  address: '', venue_name: '', coordinates: null, coords_preview: null,
  is_free: true, price_min: '', price_max: '', price_notes: '', official_url: '', contact_email: '',
};

function validate(step, data) {
  if (step === 1 && !data.title.trim()) return 'Title is required';
  if (step === 1 && !data.category.length) return 'Select at least one category';
  if (step === 2 && !data.start_datetime) return 'Start date & time is required';
  if (step === 3 && !data.coordinates) return 'Confirm your location before continuing';
  return null;
}

export default function SubmitEventForm({ onClose, initialData = null, submissionId = null }) {
  const isEditMode = !!submissionId;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialData ? { ...INITIAL, ...initialData } : INITIAL);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState(null);

  function updateForm(fields) {
    setForm((f) => ({ ...f, ...fields }));
  }

  function next() {
    const err = validate(step, form);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => s + 1);
  }

  function back() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const url = isEditMode
        ? `${import.meta.env.VITE_API_BASE_URL}/submissions/${submissionId}`
        : `${import.meta.env.VITE_API_BASE_URL}/submissions`;

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          price_min: form.price_min ? parseFloat(form.price_min) : null,
          price_max: form.price_max ? parseFloat(form.price_max) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setResultId(isEditMode ? submissionId : data.submission_id);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-community" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Submitted!</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          {isEditMode
            ? 'Your event has been resubmitted and is pending review.'
            : "We'll review your event within 48 hours. You can track its status in My Submissions."}
        </p>
        <p className="text-xs text-gray-400">ID: {resultId}</p>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-community text-white text-sm font-medium rounded-lg hover:bg-green-700"
        >
          Back to Map
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800">{isEditMode ? 'Edit & Resubmit Event' : 'Submit an Event'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      {/* Step progress */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done ? 'bg-community text-white' : active ? 'bg-official text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-100 mx-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
        )}
        {step === 1 && <StepBasicInfo data={form} onChange={updateForm} />}
        {step === 2 && <StepWhen data={form} onChange={updateForm} />}
        {step === 3 && <StepWhere data={form} onChange={updateForm} />}
        {step === 4 && <StepDetails data={form} onChange={updateForm} />}
        {step === 5 && <StepReview data={form} submitting={submitting} onSubmit={handleSubmit} />}
      </div>

      {/* Footer nav */}
      {step < 5 && (
        <div className="flex gap-2 px-4 py-3 border-t">
          {step > 1 && (
            <button
              onClick={back}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-2 text-sm bg-official text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
