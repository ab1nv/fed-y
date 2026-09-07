"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  color: "var(--ink)",
  fontSize: 12,
};

export function DeliveriesChart({ data }: { data: { day: string; delivered: number; late: number }[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Deliveries — last 14 days
      </h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--line)", opacity: 0.35 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
            <Bar dataKey="delivered" name="On time" fill="#22a06b" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Area type="monotone" dataKey="late" name="Late" stroke="#e5484d" fill="#e5484d" fillOpacity={0.12} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const DONUT_COLORS: Record<string, string> = {
  IN_TRANSIT: "#3b82f6",
  OUT_FOR_DELIVERY: "#8b5cf6",
  ASSIGNED: "#0ea5e9",
  PICKED_UP: "#6366f1",
  EXCEPTION: "#e5484d",
  DELIVERED: "#22a06b",
};

export function StatusDonut({ data }: { data: { status: string; n: number }[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Active pipeline mix
      </h2>
      <div className="flex items-center gap-2">
        <div className="h-52 w-1/2 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="n" nameKey="status" innerRadius="62%" outerRadius="95%" paddingAngle={2} strokeWidth={0}>
                {data.map((d) => (
                  <Cell key={d.status} fill={DONUT_COLORS[d.status] ?? "#a1a1aa"} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-1/2 space-y-1.5 text-xs">
          {data.map((d) => (
            <li key={d.status} className="flex items-center gap-2 text-muted">
              <span className="size-2 rounded-full" style={{ background: DONUT_COLORS[d.status] ?? "#a1a1aa" }} />
              <span className="flex-1 capitalize">{d.status.replaceAll("_", " ").toLowerCase()}</span>
              <span className="font-mono font-medium text-ink">{d.n}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
