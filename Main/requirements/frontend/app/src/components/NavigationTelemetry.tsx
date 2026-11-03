import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createNavigationTracker } from '../services/navigationTelemetry';

export default function NavigationTelemetry() {
  const { pathname } = useLocation();
  const track = useRef(createNavigationTracker());
  useEffect(() => { track.current(pathname); }, [pathname]);
  return null;
}
