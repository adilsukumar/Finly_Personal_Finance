import { setupPin, createBudgetMonth, isPinSet } from "./storage";

const SEED_PERSONAL    = "finly_seeded_v3";
const SEED_SHARED_ORIG = "finly_seeded_v3_shared";
const SEED_SHARED_V4   = "finly_seeded_v4_shared";  // adds paidBy fields
const SEED_PIN_V2      = "finly_pin_seeded_v3";      // pin reset to env var

const LS_TXS    = "finly_transactions";
const LS_MONTHS = "finly_budget_months";

function uid(prefix: string, i: number): string {
  return `seed_${prefix}_${i}`;
}

function clearAccount(accountType: "personal" | "shared") {
  const txs = JSON.parse(localStorage.getItem(LS_TXS) ?? "[]");
  localStorage.setItem(LS_TXS, JSON.stringify(txs.filter((t: any) => t.accountType !== accountType)));
  const months = JSON.parse(localStorage.getItem(LS_MONTHS) ?? "[]");
  localStorage.setItem(LS_MONTHS, JSON.stringify(months.filter((m: any) => m.accountType !== accountType)));
}

function pushTransactions(newTxs: any[]) {
  const existing: any[] = JSON.parse(localStorage.getItem(LS_TXS) ?? "[]");
  const ids = new Set(existing.map((t: any) => t.id));
  localStorage.setItem(LS_TXS, JSON.stringify([...newTxs.filter(t => !ids.has(t.id)), ...existing]));
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL seed  (March 2026, starting balance ₹5,037.62)
// ─────────────────────────────────────────────────────────────────────────────
async function seedPersonal() {
  if (localStorage.getItem(SEED_PERSONAL)) return;

  clearAccount("personal");
  const month = createBudgetMonth("personal", "March 2026", "2026-03-06", 5037.62);
  const mid = month.id;

  const expenses = [
    { date: "2026-03-06", amount: 50,      description: "Notebook",                                category: "stationary" },
    { date: "2026-03-06", amount: 130,     description: "Chole Bhature",                           category: "food" },
    { date: "2026-03-06", amount: 100,     description: "Snacks",                                  category: "food" },
    { date: "2026-03-07", amount: 360,     description: "Lunch",                                   category: "food" },
    { date: "2026-03-08", amount: 35,      description: "Cold Drink",                              category: "food" },
    { date: "2026-03-08", amount: 50,      description: "Snacks",                                  category: "food" },
    { date: "2026-03-09", amount: 498,     description: "Platinum Preppy Ink Pen",                 category: "stationary" },
    { date: "2026-03-09", amount: 293,     description: "Sunglasses - Gift",                       category: "gifts" },
    { date: "2026-03-09", amount: 130,     description: "Lunch",                                   category: "food" },
    { date: "2026-03-09", amount: 275,     description: "Shoes",                                   category: "utilities" },
    { date: "2026-03-09", amount: 20,      description: "Geetesh",                                 category: "gifts" },
    { date: "2026-03-10", amount: 902,     description: "Shampoo, Detergent, etc.",                category: "utilities" },
    { date: "2026-03-10", amount: 157.5,   description: "Shirt",                                   category: "utilities" },
    { date: "2026-03-10", amount: 92,      description: "Mosquito Repellent",                      category: "utilities" },
    { date: "2026-03-11", amount: 220,     description: "Lunch",                                   category: "food" },
    { date: "2026-03-11", amount: 18,      description: "Water Bottle",                            category: "food" },
    { date: "2026-03-11", amount: 1753,    description: "Train Ticket",                            category: "travel" },
    { date: "2026-03-12", amount: 110,     description: "Lunch",                                   category: "food" },
    { date: "2026-03-12", amount: 2310.17, description: "GPS Sensor (Pawsitive)",                  category: "hackathon" },
    { date: "2026-03-12", amount: 1730.43, description: "Gas Sensor (Pawsitive)",                  category: "hackathon" },
    { date: "2026-03-12", amount: 253.7,   description: "Heartrate, Pulse, Oxymeter (Pawsitive)",  category: "hackathon" },
    { date: "2026-03-12", amount: 457.62,  description: "Soldering Kit (Pawsitive)",               category: "hackathon" },
    { date: "2026-03-13", amount: 810,     description: "Train Ticket - Hackathon Team",           category: "hackathon" },
    { date: "2026-03-13", amount: 130,     description: "Snacks",                                  category: "food" },
    { date: "2026-03-13", amount: 999,     description: "Train Ticket - Hackathon Team",           category: "hackathon" },
  ];

  const incomes = [
    { date: "2026-03-11", amount: 2200,   description: "Train Ticket",                  category: "other_income", notes: "Mom Sent" },
    { date: "2026-03-13", amount: 1000,   description: "Sensors + Train",               category: "hackathon",    notes: "Mom Sent" },
    { date: "2026-03-13", amount: 555,    description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Kartikeya Shukla Sent" },
    { date: "2026-03-13", amount: 270,    description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Vaishnavi Nair Sent" },
    { date: "2026-03-13", amount: 268.5,  description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Snehal Dixit Sent" },
    { date: "2026-03-14", amount: 285,    description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Vaishnavi Nair Sent" },
    { date: "2026-03-15", amount: 2400,   description: "Travel Reimbursement",          category: "hackathon",    notes: "SASI Hackathon" },
  ];

  const txs: any[] = [];
  expenses.forEach((e, i) => txs.push({
    id: uid("p_exp", i), accountType: "personal", budgetMonthId: mid,
    date: e.date, amount: e.amount, description: e.description,
    category: e.category, type: "expense", notes: "",
    paidBy: "Adil Sukumar",
    createdAt: new Date(`${e.date}T10:00:00.000Z`).toISOString(),
  }));
  incomes.forEach((inc, i) => txs.push({
    id: uid("p_inc", i), accountType: "personal", budgetMonthId: mid,
    date: inc.date, amount: inc.amount, description: inc.description,
    category: inc.category, type: "income", notes: inc.notes ?? "",
    paidBy: "Adil Sukumar",
    createdAt: new Date(`${inc.date}T10:00:00.000Z`).toISOString(),
  }));

  pushTransactions(txs);
  localStorage.setItem(SEED_PERSONAL, "1");
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED seed v4  — clears old seed_s_ rows, inserts full data with paidBy
// ─────────────────────────────────────────────────────────────────────────────
async function seedSharedV4() {
  if (localStorage.getItem(SEED_SHARED_V4)) return;

  // Remove only the old seed-generated shared transactions (prefixed seed_s_)
  const allTxs: any[] = JSON.parse(localStorage.getItem(LS_TXS) ?? "[]");
  const cleaned = allTxs.filter((t: any) =>
    !(t.accountType === "shared" && typeof t.id === "string" && t.id.startsWith("seed_s_"))
  );
  localStorage.setItem(LS_TXS, JSON.stringify(cleaned));

  // Use the existing active shared month (or create one if missing)
  let months: any[] = JSON.parse(localStorage.getItem(LS_MONTHS) ?? "[]");
  let sharedMonth = months.find((m: any) => m.accountType === "shared" && m.active)
                 ?? months.find((m: any) => m.accountType === "shared");

  if (!sharedMonth) {
    sharedMonth = createBudgetMonth("shared", "March 2026", "2026-03-06", 0);
  }
  const mid = sharedMonth.id;

  // Each expense: { date, amount, description, category, paidBy }
  // "Adil Sukumar & Snehal Dixit" items shared 50/50 conceptually but stored as one entry
  const expenses: { date: string; amount: number; description: string; category: string; paidBy: string }[] = [
    // ── 6 Mar ────────────────────────────────────────────────────────────────
    { date: "2026-03-06", amount: 50,      description: "Notebook",                               category: "stationary", paidBy: "Adil Sukumar" },
    { date: "2026-03-06", amount: 130,     description: "Chole Bhature",                          category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-06", amount: 100,     description: "Snacks",                                 category: "food",       paidBy: "Adil Sukumar" },
    // ── 7 Mar ────────────────────────────────────────────────────────────────
    { date: "2026-03-07", amount: 360,     description: "Lunch",                                  category: "food",       paidBy: "Adil Sukumar" },
    // ── 8 Mar ────────────────────────────────────────────────────────────────
    { date: "2026-03-08", amount: 35,      description: "Cold Drink",                             category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-08", amount: 395,     description: "4 Pens",                                 category: "stationary", paidBy: "Adil Sukumar" },
    { date: "2026-03-08", amount: 45,      description: "Snacks",                                 category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-08", amount: 56,      description: "PopCorn",                                category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-08", amount: 20,      description: "Tedhe Medhe",                            category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-08", amount: 20,      description: "Cold Drink",                             category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-08", amount: 25,      description: "Pepsi Shared",                           category: "food",       paidBy: "Snehal Dixit" },
    // ── 9 Mar ────────────────────────────────────────────────────────────────
    { date: "2026-03-09", amount: 498,     description: "Platinum Preppy Ink Pen",                category: "stationary", paidBy: "Adil Sukumar" },
    { date: "2026-03-09", amount: 293,     description: "Sunglasses - Gift",                      category: "gifts",      paidBy: "Adil Sukumar" },
    { date: "2026-03-09", amount: 199,     description: "Shoes",                                  category: "gifts",      paidBy: "Adil Sukumar" },
    { date: "2026-03-09", amount: 325,     description: "Shoes",                                  category: "gifts",      paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 120,     description: "Lunch",                                  category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 130,     description: "Lunch",                                  category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-09", amount: 100,     description: "Pads",                                   category: "health",     paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 76,      description: "Pads",                                   category: "health",     paidBy: "Adil Sukumar" },
    { date: "2026-03-09", amount: 131,     description: "Extension Board",                        category: "utilities",  paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 348,     description: "Shampoo",                                category: "utilities",  paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 28,      description: "Kurkure",                                category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-09", amount: 20,      description: "Geetesh - Gift",                         category: "gifts",      paidBy: "Adil Sukumar" },
    // ── 10 Mar ───────────────────────────────────────────────────────────────
    { date: "2026-03-10", amount: 902,     description: "Shampoo, Detergent, etc.",               category: "utilities",  paidBy: "Adil Sukumar" },
    { date: "2026-03-10", amount: 92,      description: "Mosquito Repellent",                     category: "utilities",  paidBy: "Adil Sukumar" },
    { date: "2026-03-10", amount: 157.5,   description: "Shirt",                                  category: "utilities",  paidBy: "Adil Sukumar" },
    { date: "2026-03-10", amount: 157.5,   description: "Shirt",                                  category: "utilities",  paidBy: "Snehal Dixit" },
    { date: "2026-03-10", amount: 50,      description: "Chips",                                  category: "food",       paidBy: "Snehal Dixit" },
    // ── 11 Mar ───────────────────────────────────────────────────────────────
    { date: "2026-03-11", amount: 220,     description: "Lunch",                                  category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-11", amount: 70,      description: "Ice-Cream",                              category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-11", amount: 18,      description: "Water Bottle",                           category: "food",       paidBy: "Adil Sukumar" },
    // ── 12 Mar ───────────────────────────────────────────────────────────────
    { date: "2026-03-12", amount: 110,     description: "Lunch",                                  category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-12", amount: 70,      description: "Ice-Cream",                              category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-12", amount: 2310.17, description: "GPS Sensor (Pawsitive)",                 category: "others",     paidBy: "Adil Sukumar & Snehal Dixit" },
    { date: "2026-03-12", amount: 1730.43, description: "Gas Sensor (Pawsitive)",                 category: "others",     paidBy: "Adil Sukumar & Snehal Dixit" },
    { date: "2026-03-12", amount: 253.7,   description: "Heartrate, Pulse, Oxymeter (Pawsitive)", category: "others",     paidBy: "Adil Sukumar & Snehal Dixit" },
    { date: "2026-03-12", amount: 457.62,  description: "Soldering Kit (Pawsitive)",              category: "others",     paidBy: "Adil Sukumar & Snehal Dixit" },
    // ── 13 Mar ───────────────────────────────────────────────────────────────
    { date: "2026-03-13", amount: 810,     description: "Train Ticket - Hackathon Team",          category: "hackathon",  paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 130,     description: "Snacks",                                 category: "food",       paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 130,     description: "Snacks",                                 category: "food",       paidBy: "Snehal Dixit" },
    { date: "2026-03-13", amount: 999,     description: "Train Ticket - Hackathon Team",          category: "hackathon",  paidBy: "Adil Sukumar" },
  ];

  const incomes: { date: string; amount: number; description: string; category: string; notes: string; paidBy: string }[] = [
    { date: "2026-03-11", amount: 2200,  description: "Train Ticket",                  category: "other_income", notes: "Mom Sent",                    paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 1000,  description: "Sensors + Train",               category: "hackathon",    notes: "Mom Sent",                    paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 555,   description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Kartikeya Shukla Sent",       paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 270,   description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Vaishnavi Nair Sent",         paidBy: "Adil Sukumar" },
    { date: "2026-03-13", amount: 268.5, description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Snehal Dixit Sent",           paidBy: "Adil Sukumar" },
    { date: "2026-03-14", amount: 285,   description: "Train Ticket - Hackathon Team", category: "hackathon",    notes: "Vaishnavi Nair Sent",         paidBy: "Adil Sukumar" },
    { date: "2026-03-15", amount: 2400,  description: "Travel Reimbursement",          category: "hackathon",    notes: "SASI Hackathon",              paidBy: "Adil Sukumar & Snehal Dixit" },
  ];

  const txs: any[] = [];
  expenses.forEach((e, i) => txs.push({
    id: uid("s_exp", i), accountType: "shared", budgetMonthId: mid,
    date: e.date, amount: e.amount, description: e.description,
    category: e.category, type: "expense", notes: "",
    paidBy: e.paidBy,
    createdAt: new Date(`${e.date}T10:00:00.000Z`).toISOString(),
  }));
  incomes.forEach((inc, i) => txs.push({
    id: uid("s_inc", i), accountType: "shared", budgetMonthId: mid,
    date: inc.date, amount: inc.amount, description: inc.description,
    category: inc.category, type: "income", notes: inc.notes,
    paidBy: inc.paidBy,
    createdAt: new Date(`${inc.date}T10:00:00.000Z`).toISOString(),
  }));

  pushTransactions(txs);
  localStorage.setItem(SEED_SHARED_V4, "1");
}

// ─────────────────────────────────────────────────────────────────────────────
export async function runSeedIfNeeded(): Promise<void> {
  await seedPersonal();
  await seedSharedV4();

  const defaultPin = import.meta.env.VITE_DEFAULT_PIN;
  if (defaultPin && !localStorage.getItem(SEED_PIN_V2)) {
    await setupPin(defaultPin);
    localStorage.setItem(SEED_PIN_V2, "1");
  }
}
