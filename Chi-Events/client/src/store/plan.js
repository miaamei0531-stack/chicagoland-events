import { create } from 'zustand';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export const usePlanStore = create((set) => ({
  isPlanOpen: false,
  selectedDate: todayStr(),
  dateEvents: [],          // events for the selected date
  dateEventsLoading: false,
  myDayEvents: [],         // events user added to "My Day"
  itinerary: null,
  planStep: 'browse',      // 'browse' | 'itinerary'

  openPlan: () => set({ isPlanOpen: true }),
  closePlan: () => set({ isPlanOpen: false, planStep: 'browse', itinerary: null }),
  togglePlan: () => set((s) => ({ isPlanOpen: !s.isPlanOpen, planStep: s.isPlanOpen ? 'browse' : s.planStep })),

  setSelectedDate: (date) => set({ selectedDate: date, planStep: 'browse', itinerary: null }),
  setDateEvents: (events) => set({ dateEvents: events, dateEventsLoading: false }),
  setDateEventsLoading: (v) => set({ dateEventsLoading: v }),

  addToMyDay: (event) => set((s) => {
    if (s.myDayEvents.find((e) => e.id === event.id)) return s;
    return { myDayEvents: [...s.myDayEvents, event], itinerary: null, planStep: 'browse' };
  }),
  removeFromMyDay: (eventId) => set((s) => ({
    myDayEvents: s.myDayEvents.filter((e) => e.id !== eventId),
    itinerary: null,
    planStep: 'browse',
  })),
  reorderMyDay: (events) => set({ myDayEvents: events }),
  clearMyDay: () => set({ myDayEvents: [], itinerary: null, planStep: 'browse' }),

  setItinerary: (itin) => set({ itinerary: itin, planStep: 'itinerary' }),
  startOver: () => set({ itinerary: null, planStep: 'browse' }),
}));
