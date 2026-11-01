import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.");

const adapter = new PrismaLibSql({ url, authToken });
const db = new PrismaClient({ adapter });

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260907);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const hours = (n: number) => n * 3600_000;

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const trackingCode = () => {
  const seg = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join("");
  return `FDY-${seg()}-${seg()}`;
};

type Plan = { status: string; staleH: number; slipH: number };

async function main() {
  await db.shipmentEvent.deleteMany();
  await db.shipment.deleteMany();
  await db.customer.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.warehouse.deleteMany();
  await db.driver.deleteMany();
  await db.vehicle.deleteMany();
  await db.user.deleteMany();

  const pw = await hashPassword("password123");

  const users = {
    admin: await db.user.create({
      data: { name: "Aarav Mehta", username: "admin", email: "admin@fedy.io", passwordHash: pw, role: "ADMIN" },
    }),
    dispatcher: await db.user.create({
      data: { name: "Priya Sharma", username: "priya", email: "priya@fedy.io", passwordHash: pw, role: "DISPATCHER" },
    }),
    dispatcher2: await db.user.create({
      data: { name: "Kabir Nair", username: "kabir", email: "kabir@fedy.io", passwordHash: pw, role: "DISPATCHER" },
    }),
    ravi: await db.user.create({
      data: { name: "Ravi Kumar", username: "ravi", email: "ravi@fedy.io", passwordHash: pw, role: "DRIVER" },
    }),
    imran: await db.user.create({
      data: { name: "Imran Khan", username: "imran", email: "imran@fedy.io", passwordHash: pw, role: "DRIVER" },
    }),
    deepa: await db.user.create({
      data: { name: "Deepa Iyer", username: "deepa", email: "deepa@fedy.io", passwordHash: pw, role: "DRIVER" },
    }),
  };

  const vehicles = {
    truckDel: await db.vehicle.create({ data: { plateNo: "DL01CAB4521", type: "Truck", capacityKg: 12000 } }),
    vanMum: await db.vehicle.create({ data: { plateNo: "MH02CDE7788", type: "Van", capacityKg: 1500 } }),
    truckBlr: await db.vehicle.create({ data: { plateNo: "KA05EFG1122", type: "Truck", capacityKg: 9000, status: "ON_ROUTE" } }),
    bikeHyd: await db.vehicle.create({ data: { plateNo: "TS09HIJ3344", type: "Bike", capacityKg: 30 } }),
    vanChn: await db.vehicle.create({ data: { plateNo: "TN01KLM9012", type: "Van", capacityKg: 1200, status: "MAINTENANCE" } }),
  };

  const drivers = {
    ravi: await db.driver.create({ data: { userId: users.ravi.id, phone: "+91 98110 22334", vehicleId: vehicles.truckBlr.id } }),
    imran: await db.driver.create({ data: { userId: users.imran.id, phone: "+91 90040 55661", vehicleId: vehicles.vanMum.id } }),
    deepa: await db.driver.create({ data: { userId: users.deepa.id, phone: "+91 97015 88992", vehicleId: vehicles.bikeHyd.id } }),
  };

  const warehouses = {
    del: await db.warehouse.create({
      data: {
        name: "Delhi National Hub", code: "DEL-N1", address: "Plot 44, Narexi Industrial Area", city: "Delhi", lat: 28.6098, lng: 77.2099,
        inventory: { create: [
          { sku: "BOX-M", name: "Medium cartons (pallet)", quantity: 340 },
          { sku: "BOX-L", name: "Large cartons (pallet)", quantity: 112 },
          { sku: "WRAP-B", name: "Bubble wrap rolls", quantity: 8, reorderAt: 15 },
          { sku: "PAL-STD", name: "Standard pallets", quantity: 260 },
        ] },
      },
    }),
    bom: await db.warehouse.create({
      data: {
        name: "Mumbai Regional DC", code: "BOM-R2", address: "Unit 7, Bhiwandi Logistics Park", city: "Mumbai", lat: 19.076, lng: 72.8777,
        inventory: { create: [
          { sku: "BOX-M", name: "Medium cartons (pallet)", quantity: 190 },
          { sku: "FRG-C", name: "Fragile crates", quantity: 14, reorderAt: 20 },
          { sku: "THRM-P", name: "Thermal packs", quantity: 76 },
        ] },
      },
    }),
    blr: await db.warehouse.create({
      data: {
        name: "Bengaluru South Hub", code: "BLR-S1", address: "Site 12, Peenya Phase 2", city: "Bengaluru", lat: 12.9716, lng: 77.5946,
        inventory: { create: [
          { sku: "BOX-M", name: "Medium cartons (pallet)", quantity: 410 },
          { sku: "BOX-S", name: "Small cartons (pallet)", quantity: 95 },
          { sku: "LBL-RT", name: "Barcode label rolls", quantity: 5, reorderAt: 30 },
        ] },
      },
    }),
    hyd: await db.warehouse.create({
      data: {
        name: "Hyderabad Cross-dock", code: "HYD-X3", address: "Shamshabad Freight Corridor", city: "Hyderabad", lat: 17.385, lng: 78.4867,
        inventory: { create: [
          { sku: "BOX-S", name: "Small cartons (pallet)", quantity: 150 },
          { sku: "TBR-20", name: "20L drums", quantity: 33 },
        ] },
      },
    }),
  };

  const customerSeeds: [string, string, string][] = [
    ["Ananya Desai", "ananya@brightlabs.in", "Pune"],
    ["Vikram Singh", "vikram@rathoretrades.com", "Jaipur"],
    ["Meera Krishnan", "meera@southsidekitchen.in", "Chennai"],
    ["Arjun Patel", "arjun@gujaratceramics.com", "Ahmedabad"],
    ["Sofia D'Cruz", "sofia@coastalgoods.co.in", "Goa"],
    ["Rohit Bansal", "rohit@bansal-electronics.in", "Lucknow"],
    ["Fatima Sheikh", "fatima@deccanfabric.com", "Hyderabad"],
    ["Karan Malhotra", "karan@northpeakoutdoors.in", "Chandigarh"],
    ["Divya Rao", "divya@sarangaorganics.com", "Bengaluru"],
    ["Sameer Joshi", "sameer@joshihardware.in", "Nagpur"],
    ["Nisha Verma", "nisha@vermamedisupplies.com", "Indore"],
    ["Tejas Gowda", "tejas@gowdagroproducts.in", "Mysuru"],
    ["Zoya Kapadia", "zoya@kapadiashipping.co.in", "Mumbai"],
    ["Manish Tiwari", "manish@tiwaribookdepot.com", "Patna"],
    ["Leela Panicker", "leela@panickeraid.in", "Kochi"],
  ];
  const customers = [];
  for (const [name, email, city] of customerSeeds) {
    customers.push(
      await db.customer.create({
        data: { name, email, phone: `+91 ${Math.floor(between(70000, 99999))} ${Math.floor(between(10000, 99999))}`, city },
      }),
    );
  }

  const warehouseList = Object.values(warehouses);
  const driverList = Object.values(drivers);
  const now = Date.now();

  const plans: Plan[] = [
    ...Array.from({ length: 26 }, () => ({ status: "DELIVERED", staleH: 0, slipH: between(-40, 14) })),
    ...Array.from({ length: 5 }, () => ({ status: "IN_TRANSIT", staleH: between(1, 10), slipH: between(24, 96) })),
    ...Array.from({ length: 3 }, () => ({ status: "OUT_FOR_DELIVERY", staleH: between(1, 5), slipH: between(6, 20) })),
    ...Array.from({ length: 3 }, () => ({ status: "PICKED_UP", staleH: between(2, 8), slipH: between(30, 72) })),
    ...Array.from({ length: 2 }, () => ({ status: "IN_TRANSIT", staleH: between(16, 26), slipH: between(-8, 8) })),
    ...Array.from({ length: 4 }, () => ({ status: "ASSIGNED", staleH: between(3, 12), slipH: between(48, 120) })),
    ...Array.from({ length: 3 }, () => ({ status: "CREATED", staleH: between(1, 10), slipH: between(60, 160) })),
    ...Array.from({ length: 3 }, () => ({ status: "EXCEPTION", staleH: between(2, 14), slipH: between(-20, 40) })),
    ...Array.from({ length: 2 }, () => ({ status: "CANCELLED", staleH: 0, slipH: 0 })),
  ];

  const streets = [
    "MG Road", "Station Rd", "Lake View Ln", "Industrial Estate Phase 2", "Gandhi Chowk",
    "Sector 17", "Harbour Drive", "Old City Bazaar", "Temple Street", "Ring Road 4",
  ];
  const activeOrder = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
  const exceptionNotes = [
    "Address not found — awaiting confirmation",
    "Vehicle breakdown on route",
    "Customer unavailable at delivery",
    "Damaged packaging at hub",
  ];

  let created = 0;
  for (const plan of plans) {
    const origin = pick(warehouseList);
    const customer = pick(customers);
    const createdAt = new Date(now - hours(between(6, 24 * 42)));
    const promised = new Date(
      plan.status === "DELIVERED" ? now - hours(between(8, 96)) : now + hours(plan.slipH),
    );
    const chain: { status: string; at: Date; note?: string }[] = [
      { status: "CREATED", at: createdAt },
    ];
    let t = createdAt;
    const upto =
      plan.status === "CREATED" ? 0
      : plan.status === "ASSIGNED" ? 1
      : plan.status === "PICKED_UP" ? 2
      : plan.status === "IN_TRANSIT" ? 3
      : plan.status === "OUT_FOR_DELIVERY" ? 4
      : plan.status === "EXCEPTION" ? Math.floor(between(1, 3))
      : 5; // DELIVERED
    for (let i = 0; i < upto; i++) {
      t = new Date(t.getTime() + hours(between(2, 18)));
      chain.push({ status: activeOrder[i], at: t });
    }
    if (plan.status === "DELIVERED") {
      const slip = plan.slipH; // >0 means late
      const finalAt = new Date(
        Math.min(t.getTime() + hours(between(2, 16)), now - hours(between(1, 6))),
      );
      chain.push({
        status: "DELIVERED",
        at: finalAt,
        note: slip > 0 ? "Delivered past promised window" : "Signed by consignee",
      });
    }
    if (plan.status === "CANCELLED") {
      chain.push({ status: "CANCELLED", at: new Date(createdAt.getTime() + hours(5)), note: "Cancelled on customer request" });
    }
    if (plan.status === "EXCEPTION") {
      chain.push({
        status: "EXCEPTION",
        at: new Date(t.getTime() + hours(between(4, 30))),
        note: pick(exceptionNotes),
      });
    }
    // make active shipments' last event stale by plan.staleH hours
    if (["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(plan.status)) {
      chain[chain.length - 1].at = new Date(now - hours(plan.staleH));
    }

    const driver = upto >= 1 && plan.status !== "CANCELLED" ? pick(driverList) : null;
    await db.shipment.create({
      data: {
        trackingCode: trackingCode(),
        customerId: customer.id,
        originId: origin.id,
        destinationAddress: `${Math.floor(between(1, 999))}, ${pick(streets)}, ${customer.city}`,
        destinationCity: customer.city,
        destLat: Number(between(8.5, 28.9).toFixed(4)),
        destLng: Number(between(72.8, 88.4).toFixed(4)),
        weightKg: Number(between(0.5, 800).toFixed(1)),
        status: plan.status as "CREATED",
        driverId: driver?.id,
        promisedDate: promised,
        createdAt,
        events: { create: chain.map((e) => ({ status: e.status as "CREATED", note: e.note, createdAt: e.at })) },
      },
    });
    created++;
  }

  console.log(
    `Seeded ${created} shipments, ${customers.length} customers, 4 warehouses, 5 vehicles, 3 drivers, 6 users`,
  );

  // Give each driver a plausible last-known position so live tracking has
  // something to show before anyone opens the driver app.
  const driverSpots: Record<string, { lat: number; lng: number }> = {
    ravi: { lat: 12.9716, lng: 77.5946 },
    imran: { lat: 19.076, lng: 72.8777 },
    deepa: { lat: 17.385, lng: 78.4867 },
  };
  for (const [username, spot] of Object.entries(driverSpots)) {
    const driver = await db.driver.findFirst({ where: { user: { username } } });
    if (!driver) continue;
    await db.driver.update({
      where: { id: driver.id },
      data: { lastLat: spot.lat, lastLng: spot.lng, locationAccuracy: 35, lastSeenAt: new Date(now - hours(0.2)) },
    });
    await db.shipment.updateMany({
      where: { driverId: driver.id, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      data: { currentLat: spot.lat, currentLng: spot.lng, locationUpdatedAt: new Date(now - hours(0.2)) },
    });
  }

  console.log("Logins — admin/password123 (ADMIN) · priya|kabir/password123 (DISPATCHER) · ravi|imran|deepa/password123 (DRIVER)");
  console.log("Demo tracking — /track shows a live example from the seeded network");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
