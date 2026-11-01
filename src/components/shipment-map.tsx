"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

export type MapPoint = {
  id: string;
  code: string;
  status: string;
  lat: number;
  lng: number;
  label: string;
  live: boolean;
};

function Fit({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [30, 30], maxZoom: 11 },
    );
  }, [map, points]);
  return null;
}

export default function ShipmentMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="h-[360px] w-full overflow-hidden rounded-xl border border-line">
      <MapContainer
        center={[21.1458, 79.0882]}
        zoom={4}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={p.live ? 10 : 7}
            pathOptions={{
              color: p.live ? "#ffb800" : "#3b82f6",
              fillColor: p.live ? "#ffb800" : "#3b82f6",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-mono font-semibold">{p.code}</p>
                <p>{p.label}</p>
                <p className="text-muted">{p.status.replaceAll("_", " ").toLowerCase()}</p>
              </div>
            </Popup>
            <Tooltip>{p.code}</Tooltip>
          </CircleMarker>
        ))}
        <Fit points={points} />
      </MapContainer>
    </div>
  );
}
