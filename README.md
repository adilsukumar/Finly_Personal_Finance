# Finly — Personal Finance Tracker

A sleek, dark-themed personal finance tracker built with React + Vite. Track expenses, income, shared costs, IOUs, and export detailed PDF reports.

**Live App → [finly-personal-finance.vercel.app](https://finly-personal-finance.vercel.app)**

---

## Features

- **Personal & Shared accounts** — separate workspaces for solo and shared expenses
- **Budget months** — create monthly budgets with opening balances
- **Transactions** — log income and expenses with categories, descriptions, and paid-by tracking
- **Analytics** — spending by category (donut + bar charts), daily spending chart, top expenses
- **IOUs & Debts** — track who owes who, mark as settled
- **PDF Export** — full dark-themed report with:
  - Summary, category charts, daily spending bar chart
  - Spending breakdown (day-wise, week-wise, month total)
  - Full transaction table with running balance
  - IOUs section
- **PIN lock** — simple PIN protection on app open
- **Per-person breakdown** — in shared mode, see Adil vs Snehal income/expenses/net separately

---

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Radix UI + shadcn/ui components
- Recharts (charts)
- jsPDF (PDF export)
- Framer Motion
- Wouter (routing)
- localStorage (data persistence)

---

## Running Locally

```bash
git clone https://github.com/adilsukumar/Finly_Personal_Finance.git
cd Finly_Personal_Finance
npm install
cp .env.example .env   # set your PIN in .env
npm run dev
```

App runs at `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_DEFAULT_PIN` | PIN code to lock the app (default: set in `.env`) |

---

## Data & Privacy

All data is stored in your **browser's localStorage** — nothing is sent to any server. Data is tied to the browser you use, so switching browsers means starting fresh. To migrate data between browsers, use the DevTools console export/import method.

---

*Made by Adil Sukumar*
