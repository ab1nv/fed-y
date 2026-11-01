"use client";

import { useEffect, useRef, useState } from "react";
import { pingLocationAction } from "@/lib/location-actions";
import { Button, cx } from "@/components/ui";

type Status = "idle" | "asking" | "live" | "error";

export function LocationPinger({ lastPingAt }: { lastPingAt?: string | null }) {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [lastAt, setLastAt] = useState(lastPingAt ?? null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  function stop() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSharing(false);
    setStatus("idle");
    setMessage("");
  }

  function start() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("This browser has no location support. Use a phone or desktop Chrome.");
      return;
    }
    setSharing(true);
    setStatus("asking");
    setMessage("Waiting for permission…");

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        // Client-side throttle: GPS can fire several times a second.
        if (Date.now() - lastSent.current < 8_000) return;
        lastSent.current = Date.now();
        const { latitude, longitude, accuracy } = pos.coords;
        const result = await pingLocationAction(latitude, longitude, accuracy);
        if (result.ok) {
          setStatus("live");
          setLastAt(result.at);
          setMessage(`±${Math.round(accuracy)} m`);
        } else {
          setStatus("error");
          setMessage(result.error);
        }
      },
      (err) => {
        setStatus("error");
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location blocked. Allow it in the browser, then try again."
            : "Could not read GPS. Move somewhere with a clear view of the sky.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Live location</p>
          <p className="mt-0.5 text-xs text-muted">
            {status === "live" ? (
              <span className="text-emerald-600 dark:text-emerald-400">Sharing · {message}</span>
            ) : status === "error" ? (
              <span className="text-red-600 dark:text-red-400">{message}</span>
            ) : lastAt ? (
              <>Last ping {new Date(lastAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</>
            ) : (
              "Off — customers cannot see where their parcel is"
            )}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={sharing ? "secondary" : "primary"}
          className={cx("min-h-10 shrink-0", sharing && "border-red-500/40 text-red-600 dark:text-red-400")}
          onClick={sharing ? stop : start}
        >
          {sharing ? "Stop sharing" : "Share location"}
        </Button>
      </div>
    </div>
  );
}
