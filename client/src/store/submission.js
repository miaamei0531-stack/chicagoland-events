import { create } from 'zustand';

const INITIAL_FORM = {
  title: '',
  category: [],
  description: '',
  start_datetime: '',
  end_datetime: '',
  is_recurring: false,
  recurrence_rule: '',
  address: '',
  coordinates: null,
  is_free: true,
  price_min: '',
  price_max: '',
  price_notes: '',
  official_url: '',
  contact_email: '',
};

export const useSubmissionStore = create((set) => ({
  step: 1,
  form: { ...INITIAL_FORM },

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  updateForm: (fields) => set((s) => ({ form: { ...s.form, ...fields } })),
  reset: () => set({ step: 1, form: { ...INITIAL_FORM } }),
}));
