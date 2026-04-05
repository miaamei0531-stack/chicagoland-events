import { create } from 'zustand';

export const useTripStore = create((set, get) => ({
  // Trip mode state
  tripMode: false,
  tripDate: null,        // 'YYYY-MM-DD'
  tripId: null,          // saved trip ID
  tripName: 'My Day Trip',
  tripEvents: [],        // [{ id, event_id, position, event: {...} }]
  routeMode: 'driving',  // 'driving' | 'walking'

  setTripMode: (on) => set({ tripMode: on }),
  setTripDate: (date) => set({ tripDate: date }),
  setTripId: (id) => set({ tripId: id }),
  setTripName: (name) => set({ tripName: name }),
  setTripEvents: (events) => set({ tripEvents: events }),
  setRouteMode: (mode) => set({ routeMode: mode }),

  addEvent: (tripEvent) =>
    set((s) => ({
      tripEvents: [...s.tripEvents, tripEvent].sort((a, b) => a.position - b.position),
    })),

  removeEvent: (eventId) =>
    set((s) => ({
      tripEvents: s.tripEvents.filter((te) => te.event_id !== eventId),
    })),

  reorder: (fromIndex, toIndex) =>
    set((s) => {
      const list = [...s.tripEvents];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { tripEvents: list.map((te, i) => ({ ...te, position: i })) };
    }),

  isInTrip: (eventId) => get().tripEvents.some((te) => te.event_id === eventId),

  reset: () => set({ tripMode: false, tripDate: null, tripId: null, tripName: 'My Day Trip', tripEvents: [] }),
}));
