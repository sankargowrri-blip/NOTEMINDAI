"use client";
import { useEffect, useRef } from "react";
import { analyticsApi } from "./api";

/**
 * Tracks active study time by monitoring user activity (mouse/keyboard).
 * Sends a log to the backend when the session ends or user is inactive.
 */
export function useStudyTracker(noteId?: number) {
  const startTime = useRef<number>(Date.now());
  const lastActivity = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Activity Listeners
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    // 2. Periodic Check & Sync
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const idleTime = (now - lastActivity.current) / 1000; // seconds

      // If idle for more than 5 minutes, sync what we have and reset start time
      if (idleTime > 300) {
        syncSession();
      }
    }, 60000); // Check every minute

    const syncSession = () => {
      const now = Date.now();
      const durationSeconds = (now - startTime.current) / 1000;
      const activeDurationMinutes = Math.min(durationSeconds / 60, 60); // Cap at 1 hour per sync

      if (activeDurationMinutes > 0.5) { // Only log if > 30 seconds
         analyticsApi.logStudySession(noteId || 0, activeDurationMinutes).catch(() => {});
      }

      startTime.current = now;
      lastActivity.current = now;
    };

    // 3. Cleanup on unmount
    return () => {
      syncSession();
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, [noteId]);
}
