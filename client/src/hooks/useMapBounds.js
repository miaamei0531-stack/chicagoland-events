// Implemented in M3 — tracks current Mapbox viewport bbox
import { useState } from 'react';

export function useMapBounds() {
  const [bounds, setBounds] = useState(null);
  return { bounds, setBounds };
}
