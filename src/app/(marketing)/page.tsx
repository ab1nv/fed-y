import Header from "@/components/landing/header";
import Hero from "@/components/landing/hero";
import Problems from "@/components/landing/problems";
import Showcase from "@/components/landing/showcase";
import Spotlight from "@/components/landing/spotlight";
import Stats from "@/components/landing/stats";
import CtaFooter from "@/components/landing/footer";
import { db } from "@/lib/db";

export const revalidate = 300;

export default async function LandingPage() {
  const [shipments, drivers, warehouses, delivered, late] = await Promise.all([
    db.shipment.count(),
    db.driver.count(),
    db.warehouse.count(),
    db.shipmentEvent.count({ where: { status: "DELIVERED" } }),
    db.shipmentEvent.count({ where: { status: "DELIVERED", note: { contains: "past" } } }),
  ]);
  const onTime = delivered > 0 ? ((delivered - late) / delivered) * 100 : 0;

  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Problems />
        <Showcase />
        <Spotlight />
        <Stats
          stats={[
            { target: Number(onTime.toFixed(1)), dec: 1, suffix: "%", label: "On-time delivery" },
            { target: shipments, dec: 0, suffix: "", label: "Shipments booked" },
            { target: drivers, dec: 0, suffix: "", label: "Drivers on the app" },
            { target: warehouses, dec: 0, suffix: "", label: "Active hubs" },
          ]}
        />
        <CtaFooter />
      </main>
    </>
  );
}
