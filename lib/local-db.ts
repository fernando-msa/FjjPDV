import { openDB, type DBSchema } from "idb";
import type { CashMovement, CashSession, PendingSyncJob, PdvSnapshot, Product, Sale } from "./types";

const DB_NAME = "fjj-pdv";
const DB_VERSION = 1;

interface PdvDatabase extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
  };
  movements: {
    key: string;
    value: CashMovement;
  };
  sessions: {
    key: string;
    value: CashSession;
  };
  queue: {
    key: string;
    value: PendingSyncJob;
  };
}

async function openPdvDb() {
  return openDB<PdvDatabase>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("products", { keyPath: "id" });
      database.createObjectStore("sales", { keyPath: "id" });
      database.createObjectStore("movements", { keyPath: "id" });
      database.createObjectStore("sessions", { keyPath: "id" });
      database.createObjectStore("queue", { keyPath: "id" });
    }
  });
}

export async function saveSnapshot(snapshot: PdvSnapshot) {
  const db = await openPdvDb();
  const tx = db.transaction(["products", "sales", "movements", "sessions", "queue"], "readwrite");

  await Promise.all([
    Promise.all(snapshot.products.map((product) => tx.objectStore("products").put(product))),
    Promise.all(snapshot.sales.map((sale) => tx.objectStore("sales").put(sale))),
    Promise.all(snapshot.movements.map((movement) => tx.objectStore("movements").put(movement))),
    Promise.all(snapshot.sessions.map((session) => tx.objectStore("sessions").put(session))),
    Promise.all(snapshot.queue.map((job) => tx.objectStore("queue").put(job)))
  ]);

  await tx.done;
}

export async function loadSnapshot(): Promise<PdvSnapshot> {
  const db = await openPdvDb();

  const [products, sales, movements, sessions, queue] = await Promise.all([
    db.getAll("products"),
    db.getAll("sales"),
    db.getAll("movements"),
    db.getAll("sessions"),
    db.getAll("queue")
  ]);

  return { products, sales, movements, sessions, queue };
}

export async function upsertSales(sales: Sale[]) {
  const db = await openPdvDb();
  const tx = db.transaction("sales", "readwrite");

  await Promise.all(sales.map((sale) => tx.objectStore("sales").put(sale)));
  await tx.done;
}

export async function upsertMovements(movements: CashMovement[]) {
  const db = await openPdvDb();
  const tx = db.transaction("movements", "readwrite");

  await Promise.all(movements.map((movement) => tx.objectStore("movements").put(movement)));
  await tx.done;
}

export async function upsertSessions(sessions: CashSession[]) {
  const db = await openPdvDb();
  const tx = db.transaction("sessions", "readwrite");

  await Promise.all(sessions.map((session) => tx.objectStore("sessions").put(session)));
  await tx.done;
}

export async function upsertProducts(products: Product[]) {
  const db = await openPdvDb();
  const tx = db.transaction("products", "readwrite");

  await Promise.all(products.map((product) => tx.objectStore("products").put(product)));
  await tx.done;
}

export async function upsertQueue(queue: PendingSyncJob[]) {
  const db = await openPdvDb();
  const tx = db.transaction("queue", "readwrite");

  await Promise.all(queue.map((job) => tx.objectStore("queue").put(job)));
  await tx.done;
}
