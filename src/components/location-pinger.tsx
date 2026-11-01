"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pingLocationAction } from "@/lib/location-actions";
import { Button, cx } from "@/components/ui";

const DEMO = { lat: 28.6139, lng: 77.209 };
type Mode = "starting" | "live" | "demo" | "denied" | "error";

export function LocationPinger({ lastPingAt }: { lastPingAt?: string | null }) {
  const [mode, setMode] = useState<Mode>("starting");
  const [message, setMessage] = useState("Requesting location permission…");
  const [lastAt, setLastAt] = useState(lastPingAt ?? null);
  const watchId = useRef<number | null>(null);
  const demoId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSent = useRef(0);

  const clearWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const clearDemo = useCallback(() => {
    if (demoId.current != null) {
      clearInterval(demoId.current);
      demoId.current = null;
    }
  }, []);

  const send = useCallback(async (lat: number, lng: number, accuracy?: number) => {
    const result = await pingLocationAction(lat, lng, accuracy);
    if (result.ok) {
      setLastAt(result.at);
      return true;
    }
    setMode("error");
    setMessage(result.error);
    return false;
  }, []);

  const start = useCallback(() => {
    clearDemo();
    clearWatch();
    if (!("geolocation" in navigator)) {
      setMode("error");
      setMessage("This browser has no location support. Use demo location to continue.");
      return;
    }
    setMode("starting");
    setMessage("Requesting location permission…");
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        if (Date.now() - lastSent.current < 8_000) return;
        lastSent.current = Date.now();
        const { latitude, longitude, accuracy } = pos.coords;
        const ok = await send(latitude, longitude, accuracy);
        if (ok) {
          setMode("live");
          setMessage(`Sharing · ±${Math.round(accuracy)} m`);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setMode("denied");
          setMessage(
            "Location is required so dispatch can follow your stops. Allow it in the browser, then try again.",
          );
        } else {
          setMode("error");
          setMessage("Could not read GPS. Move somewhere with a clear view of the sky, or use demo location.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, [clearDemo, clearWatch, send]);

  const startDemo = useCallback(async () => {
    clearWatch();
    clearDemo();
    setMode("demo");
    setMessage("Demo location active · using a position in Delhi");
    lastSent.current = Date.now();
    await send(DEMO.lat, DEMO.lng, 25);
    demoId.current = setInterval(() => {
      void send(DEMO.lat, DEMO.lng, 25);
    }, 15_000);
  }, [clearDemo, clearWatch, send]);

  useEffect(() => {
    const timer = setTimeout(start, 0);
    return () => {
      clearTimeout(timer);
      clearWatch();
      clearDemo();
    };
  }, [start, clearWatch, clearDemo]);

  const statusColor =
    mode === "live"
      ? "text-emerald-600 dark:text-emerald-400"
      : mode === "demo"
        ? "text-amber-600 dark:text-amber-400"
        : mode === "denied" || mode === "error"
          ? "text-red-600 dark:text-red-400"
          : "text-muted";

  return (
    <div
      className={cx(
        "rounded-xl border bg-surface p-4",
        mode === "denied" || mode === "error" ? "border-red-500/40" : "border-line",
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            Live location
            {mode === "starting" && (
              <span className="size-3 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
            )}
          </p>
          <p className={cx("mt-0.5 text-xs", statusColor)}>{message}</p>
          {lastAt && mode !== "starting" && (
            <p className="mt-1 text-[11px] text-muted">
              Last ping{" "}
              {new Date(lastAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Kolkata",
              })}
            </p>
          )}
        </div>
      </div>

      {(mode === "denied" || mode === "error") && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={start}>
            Try again
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={startDemo}>
            Use demo location
          </Button>
        </div>
      )}

      {mode === "demo" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={start}>
            Use real GPS
          </Button>
        </div>
      )}
    </div>
  );
}
