export function osmUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
}

export function minutesAgo(date: Date, now = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
}
