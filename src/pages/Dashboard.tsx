import React, { useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApp } from "@/contexts/AppContext";
import { Card, GlowingCard, Button } from "@/components/ui/PremiumComponents";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Wallet, Download, Plus, Users, TrendingUp, TrendingDown } from "lucide-react";
import { CategoryDonutChart, TopCategoriesBarChart, DailySpendingChart } from "@/components/charts/DashboardCharts";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { computeSummaryFromTxs, getTransactionsByMonth, getActiveBudgetMonth } from "@/lib/storage";
import jsPDF from "jspdf";
import { LIVVIC_REGULAR, LIVVIC_BOLD, LIVVIC_MEDIUM } from "@/lib/livvicFont";

function ChartGroup({ title, accent, summary }: { title: string; accent: string; summary: ReturnType<typeof computeSummaryFromTxs> }) {
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 px-1`}>
        <div className={`w-2 h-2 rounded-full`} style={{ background: accent }} />
        <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 border-white/5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Spending by Category</h3>
            <p className="text-xs text-muted-foreground">Where money goes</p>
          </div>
          <CategoryDonutChart data={summary.categoryBreakdown} />
        </Card>
        <Card className="p-5 border-white/5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Top Expenses</h3>
            <p className="text-xs text-muted-foreground">Largest categories</p>
          </div>
          <TopCategoriesBarChart data={summary.topExpenseCategories} />
        </Card>
        <Card className="p-5 border-white/5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Daily Spending</h3>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <DailySpendingChart data={summary.dailySpending} />
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { summary, activeBudgetMonth, activeAccount, currency, transactions, settings, ious } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isShared = activeAccount === "shared";

  const perPersonData = useMemo(() => {
    if (!isShared) return null;

    // Adil's data comes directly from personal account (source of truth)
    // Snehal's data comes from shared transactions filtered by paidBy
    const personalMonth = getActiveBudgetMonth("personal");
    const adilTxs: typeof transactions = personalMonth
      ? getTransactionsByMonth("personal", personalMonth.id)
      : [];

    const snehalTxs: typeof transactions = [];
    transactions.forEach((tx) => {
      const p = tx.paidBy ?? "";
      const isBoth = p.includes("&");
      if (isBoth) {
        snehalTxs.push({ ...tx, amount: tx.amount / 2 });
      } else if (p === "Snehal Dixit") {
        snehalTxs.push(tx);
      }
    });
    const adilInit = settings.sharedContribAdil ?? 0;
    const snehalInit = settings.sharedContribSnehal ?? 0;
    const adilIncome = adilTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const adilExpenses = adilTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const snehalIncome = snehalTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const snehalExpenses = snehalTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // Pending "i_owe_them" IOUs where Adil is the payer = money physically in his bank
    const adilPendingOwed = ious
      .filter(i => !i.settled && i.direction === "i_owe_them" && (i.paidBy === "Adil Sukumar" || !i.paidBy))
      .reduce((s, i) => s + i.amount, 0);

    // Pending "i_owe_them" IOUs where Snehal is the payer = money physically in her bank
    const snehalPendingOwed = ious
      .filter(i => !i.settled && i.direction === "i_owe_them" && i.paidBy === "Snehal Dixit")
      .reduce((s, i) => s + i.amount, 0);

    const adilNet = adilInit + adilIncome - adilExpenses + adilPendingOwed;
    const snehalNet = snehalInit + snehalIncome - snehalExpenses + snehalPendingOwed;
    const combinedNet = adilNet + snehalNet;

    return {
      adil: { income: adilIncome, expenses: adilExpenses },
      snehal: { income: snehalIncome, expenses: snehalExpenses },
      adilNet, snehalNet, combinedNet,
      adilSummary: computeSummaryFromTxs(adilTxs, adilInit),
      snehalSummary: computeSummaryFromTxs(snehalTxs, snehalInit),
    };
  }, [isShared, transactions, settings.sharedContribAdil, settings.sharedContribSnehal, ious]);

  const exportPDF = async () => {
    if (!summary) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 14;
      const contentW = W - M * 2;
      let y = M;

      // Strip any non-latin chars jsPDF can't render, replace currency symbol with text
      const safeCur = currency === "₹" ? "Rs." : currency;
      const fmt = (n: number) => `${safeCur} ${Math.abs(n).toFixed(2)}`;
      const safe = (s: string) => s.replace(/[^\x20-\x7E]/g, "");
      // Title-case each word, expand bare "Adil" to full name
      const cap = (s: string) =>
        safe(s)
          .replace(/\bAdil\b(?!\s+Sukumar)/g, "Adil Sukumar")
          .replace(/\b\w/g, c => c.toUpperCase());

      // ── DARK THEME CONSTANTS ─────────────────────────────────────
      const BG: [number,number,number]     = [18, 12, 40];
      const CARD: [number,number,number]   = [30, 22, 60];
      const HDR: [number,number,number]    = [60, 30, 130];
      const DIM: [number,number,number]    = [120, 100, 180];
      const TXT: [number,number,number]    = [220, 215, 240];
      const STRIPE: [number,number,number] = [28, 20, 55];
      const DIV: [number,number,number]    = [60, 45, 100];

      // ── Register Livvic font ──────────────────────────────────
      pdf.addFileToVFS("Livvic-Regular.ttf", LIVVIC_REGULAR);
      pdf.addFileToVFS("Livvic-Bold.ttf", LIVVIC_BOLD);
      pdf.addFileToVFS("Livvic-Medium.ttf", LIVVIC_MEDIUM);
      pdf.addFont("Livvic-Regular.ttf", "Livvic", "normal");
      pdf.addFont("Livvic-Bold.ttf", "Livvic", "bold");
      pdf.addFont("Livvic-Medium.ttf", "Livvic", "medium");

      const fillPageBg = () => { pdf.setFillColor(...BG); pdf.rect(0, 0, W, H, "F"); };
      fillPageBg();

      const checkPage = (needed = 10) => {
        if (y + needed > H - M) { pdf.addPage(); fillPageBg(); y = M; }
      };

      // sectionNeeded: estimate how many mm a section needs so we can push to next page
      const ensureSection = (needed: number) => {
        if (y + needed > H - M) { pdf.addPage(); fillPageBg(); y = M; }
      };

      const sectionTitle = (text: string) => {
        checkPage(14);
        pdf.setFillColor(...CARD);
        pdf.roundedRect(M, y, contentW, 9, 2, 2, "F");
        pdf.setFont("Livvic", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(180, 150, 255);
        pdf.text(safe(text), M + 3, y + 6.5);
        y += 13;
      };

      const kv = (label: string, value: string, vc: [number,number,number] = [220,215,240]) => {
        checkPage(7);
        pdf.setFont("Livvic", "normal"); pdf.setFontSize(9); pdf.setTextColor(...DIM);
        pdf.text(safe(label), M + 2, y);
        pdf.setFont("Livvic", "bold"); pdf.setTextColor(...vc);
        pdf.text(safe(value), W - M - 2, y, { align: "right" });
        y += 6;
      };

      const divider = () => {
        checkPage(5); pdf.setDrawColor(...DIV);
        pdf.line(M, y, W - M, y); y += 5;
      };

      // ── draw a horizontal bar chart inline ──────────────────────
      const drawBarChart = (
        items: { label: string; value: number; color: [number,number,number] }[],
        chartH: number
      ) => {
        if (!items.length) return;
        checkPage(chartH + 10);
        const maxVal = Math.max(...items.map(i => i.value), 1);
        const barH = Math.min(7, (chartH - items.length * 2) / items.length);
        const labelW = 52;
        const barAreaW = contentW - labelW - 22;
        items.forEach((item) => {
          checkPage(barH + 3);
          const barW = (item.value / maxVal) * barAreaW;
          pdf.setFont("Livvic", "normal"); pdf.setFontSize(7.5);
          pdf.setTextColor(...TXT);
          const truncLabel = item.label.length > 22 ? item.label.slice(0,21) : item.label;
          pdf.text(cap(truncLabel), M, y + barH - 1);
          pdf.setFillColor(...item.color);
          pdf.roundedRect(M + labelW, y, Math.max(barW, 1), barH, 1, 1, "F");
          pdf.setFont("Livvic", "bold"); pdf.setFontSize(7);
          pdf.setTextColor(...TXT);
          pdf.text(safe(fmt(item.value)), M + labelW + barAreaW + 1, y + barH - 1);
          y += barH + 3;
        });
        y += 3;
      };

      // ── draw a donut/pie chart ───────────────────────────────────
      const drawPieChart = (
        items: { label: string; value: number; color: [number,number,number] }[],
        cx: number, cy: number, r: number
      ) => {
        if (!items.length) return;
        const total = items.reduce((s, i) => s + i.value, 0);
        if (total === 0) return;
        let angle = -Math.PI / 2;
        items.forEach((item) => {
          const slice = (item.value / total) * 2 * Math.PI;
          const steps = Math.max(8, Math.round(slice * 12));
          const pts: [number, number][] = [[cx, cy]];
          for (let s = 0; s <= steps; s++) {
            const a = angle + (slice * s) / steps;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
          }
          pdf.setFillColor(...item.color);
          pdf.lines(
            pts.slice(1).map((p, i) => [p[0] - (i === 0 ? cx : pts[i][0]), p[1] - (i === 0 ? cy : pts[i][1])] as [number,number]),
            pts[0][0], pts[0][1], [1,1], "F"
          );
          angle += slice;
        });
        // dark hole for donut
        pdf.setFillColor(...BG);
        pdf.circle(cx, cy, r * 0.52, "F");
      };

      // ── PAGE 1 HEADER ────────────────────────────────────────────
      pdf.setFillColor(...HDR);
      pdf.rect(0, 0, W, 26, "F");
      pdf.setFont("Livvic", "bold"); pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Finly - Financial Report", M, 16);
      pdf.setFontSize(9); pdf.setTextColor(...DIM);
      pdf.text(
        `${safe(activeBudgetMonth?.label ?? "")} | ${activeAccount === "shared" ? "Shared" : "Personal"} | ${new Date().toLocaleDateString("en-IN")}`,
        W - M, 16, { align: "right" }
      );
      y = 34;

      // ── 1. SUMMARY ───────────────────────────────────────────────
      const totalAvail = summary.initialBalance + summary.totalIncome;
      const spendPct = totalAvail > 0 ? ((summary.totalExpenses / totalAvail) * 100).toFixed(1) : "0.0";
      const GREEN: [number,number,number] = [80, 220, 120];
      const RED: [number,number,number]   = [255, 90, 90];
      const DARK: [number,number,number]  = [220, 215, 240];
      const PURP: [number,number,number]  = [180, 140, 255];
      const TEAL: [number,number,number]  = [80, 210, 220];
      // push whole summary section to next page if it won't fit
      const summaryH = 13 + 5*6 + (isShared && perPersonData ? 5 + 4*6 + 5 + 4*6 : 0) + 5;
      ensureSection(Math.min(summaryH, H - M * 2 - 14));
      sectionTitle("1. Dashboard Summary");
      kv("Opening Balance", fmt(summary.initialBalance), DARK);
      kv("Total Income (incl. opening)", fmt(totalAvail), GREEN);
      kv("Total Expenses", fmt(summary.totalExpenses), RED);
      const curBal = isShared && perPersonData ? perPersonData.combinedNet : summary.currentBalance;
      kv("Current Balance", fmt(curBal), curBal >= 0 ? GREEN : RED);
      kv("Spend Rate", `${spendPct}%`, DARK);

      if (isShared && perPersonData) {
        divider();
        kv("Adil Sukumar - Contribution", fmt(settings.sharedContribAdil ?? 0), PURP);
        kv("Adil Sukumar - Income", fmt(perPersonData.adil.income), GREEN);
        kv("Adil Sukumar - Expenses", fmt(perPersonData.adil.expenses), RED);
        kv("Adil Sukumar - Net Balance", fmt(perPersonData.adilNet), perPersonData.adilNet >= 0 ? GREEN : RED);
        divider();
        kv("Snehal Dixit - Contribution", fmt(settings.sharedContribSnehal ?? 0), TEAL);
        kv("Snehal Dixit - Income", fmt(perPersonData.snehal.income), GREEN);
        kv("Snehal Dixit - Expenses", fmt(perPersonData.snehal.expenses), RED);
        kv("Snehal Dixit - Net Balance", fmt(perPersonData.snehalNet), perPersonData.snehalNet >= 0 ? GREEN : RED);
      }
      divider();

      // ── 2. CHARTS ────────────────────────────────────────────────
      const expenseCats = summary.categoryBreakdown.filter(c => c.type === "expense").sort((a,b) => b.amount - a.amount);
      const chartSectionH = 13 + expenseCats.length * 12 + 70 + 10;
      ensureSection(Math.min(chartSectionH, H - M * 2 - 14));
      sectionTitle("2. Spending by Category");
      const PALETTE: [number,number,number][] = [
        [255,80,80],[255,160,40],[255,220,40],[120,255,80],[40,220,160],
        [40,180,255],[100,100,255],[200,80,255],[255,80,200],[255,140,100],
        [80,255,200],[255,200,80],[160,255,120],[80,160,255],[220,100,255],
        [255,100,140],[100,220,200],
      ];
      const catIndexMap: Record<string,number> = {};
      let catIdx = 0;
      const getColor = (cat: string): [number,number,number] => {
        if (catIndexMap[cat] === undefined) catIndexMap[cat] = catIdx++ % PALETTE.length;
        return PALETTE[catIndexMap[cat]];
      };

      if (expenseCats.length > 0) {
        drawBarChart(
          expenseCats.map(c => ({ label: c.category.replace(/_/g," "), value: c.amount, color: getColor(c.category) })),
          expenseCats.length * 12
        );

        checkPage(70);
        const pieY = y + 35;
        drawPieChart(
          expenseCats.slice(0,8).map(c => ({ label: c.category.replace(/_/g," "), value: c.amount, color: getColor(c.category) })),
          M + 30, pieY, 28
        );
        let legY = pieY - 28;
        expenseCats.slice(0,8).forEach(c => {
          const col = getColor(c.category);
          pdf.setFillColor(...col);
          pdf.rect(M + 65, legY, 3, 3, "F");
          pdf.setFont("Livvic", "normal"); pdf.setFontSize(7.5);
          pdf.setTextColor(...TXT);
          pdf.text(`${cap(c.category.replace(/_/g," "))} - ${c.percentage.toFixed(1)}%`, M + 70, legY + 3);
          legY += 7;
        });
        y = Math.max(y, pieY + 30);
        y += 5;
      } else {
        pdf.setFont("Livvic","normal"); pdf.setFontSize(9); pdf.setTextColor(100,100,120);
        pdf.text("No expense data", M + 2, y); y += 8;
      }
      divider();

      // Daily spending bar chart with per-bar date labels on x-axis
      if (summary.dailySpending.length > 0) {
        const ds = summary.dailySpending;
        const dsMonthName = new Date(ds[0].date + "T00:00:00").toLocaleString("default", { month: "long" });
        const sparkH = 28;   // bar area height
        const labelH = 8;    // x-axis label row height
        const sectionH = 13 + sparkH + labelH + 5;
        ensureSection(sectionH);
        sectionTitle(`3. Daily Spending (${dsMonthName} Month)`);
        checkPage(sparkH + labelH + 5);

        const dsMax = Math.max(...ds.map(d => d.amount), 1);
        const n = ds.length;
        // fixed bar+gap slot width; if <30 bars, center the group
        const slotW = Math.min(contentW / 30, contentW / n);
        const bW = Math.max(1, slotW * 0.65);
        const gap = slotW - bW;
        const totalUsed = n * slotW - gap; // total width of all bars+gaps
        const startX = M + (contentW - totalUsed) / 2; // center when fewer bars

        // y-axis: 4 evenly spaced amount labels on the left
        const yAxisX = M - 1;
        const ySteps = 4;
        for (let s = 0; s <= ySteps; s++) {
          const val = (dsMax / ySteps) * s;
          const lineY = y + sparkH - (val / dsMax) * sparkH;
          // ghost gridline
          pdf.setDrawColor(...DIV); pdf.setLineWidth(0.1);
          pdf.line(M, lineY, W - M, lineY);
          // amount label
          pdf.setFont("Livvic", "normal"); pdf.setFontSize(5); pdf.setTextColor(...DIM);
          const label = val >= 1000 ? `${(val/1000).toFixed(1)}k` : `${Math.round(val)}`;
          pdf.text(label, yAxisX, lineY + 1, { align: "right" });
        }
        pdf.setLineWidth(0.2); // reset

        // draw y-axis ghost line at top
        pdf.setDrawColor(...DIV);
        pdf.line(M, y, W - M, y);

        ds.forEach((d, i) => {
          const bH = Math.max(0.5, (d.amount / dsMax) * sparkH);
          const bx = startX + i * slotW;
          // bar
          pdf.setFillColor(130, 80, 255);
          pdf.roundedRect(bx, y + sparkH - bH, bW, bH, 0.5, 0.5, "F");
          // date label under bar — show day number only ("03", "04" …)
          const dayLabel = d.date.slice(8); // "YYYY-MM-DD" → "DD"
          pdf.setFont("Livvic", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(...DIM);
          pdf.text(dayLabel, bx + bW / 2, y + sparkH + 5, { align: "center" });
        });

        // baseline
        pdf.setDrawColor(...DIV);
        pdf.line(M, y + sparkH, W - M, y + sparkH);

        y += sparkH + labelH + 2;
        divider();
      }

      // ── 4/5. SPENDING BREAKDOWN (Day / Week / Extra) ──────────
      const expenseTxs = transactions.filter(t => t.type === "expense");
      if (transactions.length > 0) {
        // Anchor day 1 = budget month start date
        const anchor = activeBudgetMonth?.startDate
          ? activeBudgetMonth.startDate
          : [...transactions].sort((a,b) => a.date.localeCompare(b.date))[0].date;
        const anchorMs = new Date(anchor + "T00:00:00").getTime();
        const dayOf = (dateStr: string) =>
          Math.floor((new Date(dateStr + "T00:00:00").getTime() - anchorMs) / 86400000) + 1;

        // Aggregate income + expense by day-index
        type DayBucket = { inc: number; exp: number; dates: string[] };
        const dayMap: Record<number, DayBucket> = {};
        transactions.forEach(tx => {
          const d = dayOf(tx.date);
          if (!dayMap[d]) dayMap[d] = { inc: 0, exp: 0, dates: [] };
          if (tx.type === "income") dayMap[d].inc += tx.amount;
          else                      dayMap[d].exp += tx.amount;
          if (!dayMap[d].dates.includes(tx.date)) dayMap[d].dates.push(tx.date);
        });
        const allDayNums = Object.keys(dayMap).map(Number).sort((a,b) => a-b);
        const totalDays  = allDayNums[allDayNums.length - 1] ?? 0;

        // Week buckets
        type Bucket = { inc: number; exp: number };
        const wk: Bucket[] = [{inc:0,exp:0},{inc:0,exp:0},{inc:0,exp:0},{inc:0,exp:0}];
        let extra: Bucket = { inc: 0, exp: 0 };
        allDayNums.forEach(d => {
          const b = dayMap[d];
          const target = d<=7 ? wk[0] : d<=14 ? wk[1] : d<=21 ? wk[2] : d<=28 ? wk[3] : extra;
          target.inc += b.inc; target.exp += b.exp;
        });
        const monthBucket: Bucket = {
          inc: transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0) + summary.initialBalance,
          exp: transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),
        };

        const secNum = summary.dailySpending.length > 0 ? "4" : "3";
        ensureSection(40);
        sectionTitle(`${secNum}. Spending Breakdown`);

        // Opening balance info row
        checkPage(7);
        pdf.setFont("Livvic", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(...DIM);
        pdf.text("Started this month with:", M + 2, y);
        pdf.setFont("Livvic", "bold"); pdf.setTextColor(180, 150, 255);
        pdf.text(safe(fmt(summary.initialBalance)), W - M - 2, y, { align: "right" });
        y += 8;

        // Column positions: Label | Date | [Wk] | Income | Expense | Net
        const BD = {
          label: M + 2,
          date:  M + 28,
          wk:    M + 52,
          inc:   M + 100,
          exp:   M + 138,
          net:   W - M - 1,
        };

        // Table header row
        const bdHeader = () => {
          checkPage(8);
          pdf.setFillColor(...CARD); pdf.rect(M, y, contentW, 7, "F");
          pdf.setFont("Livvic","bold"); pdf.setFontSize(7.5); pdf.setTextColor(180,150,255);
          pdf.text("Period",   BD.label, y+5);
          pdf.text("Date",     BD.date,  y+5);
          pdf.text("Week",     BD.wk,    y+5);
          pdf.text("Income",   BD.inc,   y+5);
          pdf.text("Expense",  BD.exp,   y+5);
          pdf.text("Net",      BD.net,   y+5, { align:"right" });
          y += 8;
        };

        // Single data row
        const bdRow = (label: string, date: string, wkTag: string, b: Bucket, idx: number) => {
          checkPage(7);
          if (idx % 2 === 0) { pdf.setFillColor(...STRIPE); pdf.rect(M, y-1, contentW, 6.5, "F"); }
          const net = b.inc - b.exp;
          pdf.setFont("Livvic","normal"); pdf.setFontSize(7.5); pdf.setTextColor(...TXT);
          pdf.text(label,  BD.label, y+4);
          pdf.text(date,   BD.date,  y+4);
          pdf.setTextColor(140,110,220); pdf.setFontSize(7);
          pdf.text(wkTag,  BD.wk,    y+4);
          pdf.setFont("Livvic","bold"); pdf.setFontSize(7.5);
          pdf.setTextColor(...GREEN);  pdf.text(b.inc > 0 ? safe(fmt(b.inc)) : "-", BD.inc,  y+4);
          pdf.setTextColor(...RED);    pdf.text(b.exp > 0 ? safe(fmt(b.exp)) : "-", BD.exp,  y+4);
          pdf.setTextColor(net>=0?GREEN[0]:RED[0], net>=0?GREEN[1]:RED[1], net>=0?GREEN[2]:RED[2]);
          pdf.text(safe(`${net>=0?"+":"-"}${fmt(net)}`), BD.net, y+4, { align:"right" });
          y += 6.5;
        };

        // Summary row (bold, slightly highlighted)
        const bdSummaryRow = (label: string, b: Bucket) => {
          checkPage(8);
          pdf.setFillColor(35, 25, 65); pdf.rect(M, y-1, contentW, 7, "F");
          const net = b.inc - b.exp;
          pdf.setFont("Livvic","bold"); pdf.setFontSize(8); pdf.setTextColor(200,180,255);
          pdf.text(label, BD.label, y+4.5);
          pdf.setTextColor(...GREEN);  pdf.text(b.inc > 0 ? safe(fmt(b.inc)) : "-", BD.inc,  y+4.5);
          pdf.setTextColor(...RED);    pdf.text(b.exp > 0 ? safe(fmt(b.exp)) : "-", BD.exp,  y+4.5);
          pdf.setTextColor(net>=0?GREEN[0]:RED[0], net>=0?GREEN[1]:RED[1], net>=0?GREEN[2]:RED[2]);
          pdf.text(safe(`${net>=0?"+":"-"}${fmt(net)}`), BD.net, y+4.5, { align:"right" });
          y += 8;
        };

        // Sub-section header
        const subHeader = (text: string) => {
          checkPage(10);
          pdf.setFillColor(22, 15, 50); pdf.rect(M, y, contentW, 6, "F");
          pdf.setFont("Livvic","bold"); pdf.setFontSize(8); pdf.setTextColor(140,110,220);
          pdf.text(text, M + 2, y + 4.5);
          y += 8;
        };

        // ── DAY-WISE
        subHeader("Day-Wise");
        bdHeader();
        allDayNums.forEach((d, idx) => {
          const wkTag = d<=7?"W1":d<=14?"W2":d<=21?"W3":d<=28?"W4":"Ex";
          bdRow(`Day ${String(d).padStart(2,"0")}`, dayMap[d].dates[0], `[${wkTag}]`, dayMap[d], idx);
        });
        divider();

        // ── WEEK-WISE
        subHeader("Week-Wise");
        bdHeader();
        const weeksPresent = totalDays<=7?1:totalDays<=14?2:totalDays<=21?3:4;
        for (let w = 0; w < weeksPresent; w++) {
          const s = w*7+1, e = Math.min((w+1)*7, totalDays);
          bdRow(`Week ${w+1}`, `Day ${s} – ${e}`, `[W${w+1}]`, wk[w], w);
        }
        divider();

        // ── MONTH TOTAL
        subHeader("Month Total");
        bdSummaryRow("Full Month", monthBucket);
        divider();

        // ── EXTRA DAYS (day 29+)
        if (extra.inc > 0 || extra.exp > 0) {
          subHeader(`Extra Days  (Day 29 – Day ${totalDays})`);
          bdHeader();
          bdRow(`Day 29–${totalDays}`, `${totalDays-28} extra day${totalDays-28>1?"s":""}`, "[Ex]", extra, 0);
          divider();
        }
      }

      // ── TRANSACTIONS TABLE ────────────────────────────────────────
      const hasBreakdown = transactions.length > 0;
      sectionTitle(`${summary.dailySpending.length > 0 ? (hasBreakdown ? "5" : "4") : (hasBreakdown ? "4" : "3")}. Transactions`);
      // Date(20) Desc(50) Cat(28) PaidBy(24) Type(14) Amt(28) Bal(28) — fits 196mm
      const TX = {
        date: M,
        desc: M + 21,
        cat:  M + 72,
        paid: M + 101,
        type: M + 126,
        amt:  M + 141,
        bal:  W - M,  // right-aligned
      };
      checkPage(10);
      pdf.setFillColor(...CARD);
      pdf.rect(M, y, contentW, 7, "F");
      pdf.setFont("Livvic","bold"); pdf.setFontSize(8); pdf.setTextColor(180, 150, 255);
      pdf.text("Date",        TX.date + 1, y + 5);
      pdf.text("Description", TX.desc + 1, y + 5);
      pdf.text("Category",    TX.cat  + 1, y + 5);
      pdf.text("Paid By",     TX.paid + 1, y + 5);
      pdf.text("Type",        TX.type + 1, y + 5);
      pdf.text("Amount",      TX.amt  + 1, y + 5);
      pdf.text("Balance",     TX.bal  - 1, y + 5, { align: "right" });
      y += 8;

      // compute running balance oldest→newest, then display newest→oldest
      const txSorted = [...transactions].sort((a,b) => a.date.localeCompare(b.date));
      let runBal = summary.initialBalance;
      const balMap: Record<string, number> = {};
      txSorted.forEach(tx => {
        runBal += tx.type === "income" ? tx.amount : -tx.amount;
        balMap[tx.id] = runBal;
      });

      txSorted.slice().reverse().forEach((tx, idx) => {
        checkPage(7);
        if (idx % 2 === 0) { pdf.setFillColor(...STRIPE); pdf.rect(M, y-1, contentW, 6.5, "F"); }
        pdf.setFont("Livvic","normal"); pdf.setFontSize(7.5); pdf.setTextColor(...TXT);
        pdf.text(tx.date,                                                    TX.date + 1, y + 4);
        pdf.text(cap(pdf.splitTextToSize(tx.description, 48)[0]),            TX.desc + 1, y + 4);
        pdf.text(cap(tx.category.replace(/_/g," ").slice(0,16)),             TX.cat  + 1, y + 4);
        pdf.text(cap((tx.paidBy ?? "").slice(0,16)),                         TX.paid + 1, y + 4);
        const isExp = tx.type === "expense";
        pdf.setTextColor(isExp?255:80, isExp?80:220, isExp?80:120);
        pdf.text(isExp ? "Expense" : "Income",                               TX.type + 1, y + 4);
        pdf.setFont("Livvic","bold");
        pdf.text(safe(`${isExp?"-":"+"}${fmt(tx.amount)}`),                  TX.amt  + 1, y + 4);
        const b = balMap[tx.id];
        pdf.setTextColor(b >= 0 ? 80 : 255, b >= 0 ? 220 : 80, b >= 0 ? 120 : 80);
        pdf.text(safe(fmt(b)),                                               TX.bal  - 1, y + 4, { align: "right" });
        y += 6.5;
      });
      divider();

      // ── IOUs ─────────────────────────────────────────────────────
      const pendingIOUs = ious.filter(i => !i.settled);
      const settledIOUs = ious.filter(i => i.settled);
      const iouSectionH = 13 + 3*6 + 2 + 7 + (pendingIOUs.length + settledIOUs.length) * 6.5;
      const hasDailySpending = summary.dailySpending.length > 0;
      const iouNum = (hasDailySpending ? 1 : 0) + (hasBreakdown ? 1 : 0) + 4;
      ensureSection(Math.min(iouSectionH, H - M * 2 - 14));
      sectionTitle(`${iouNum}. IOUs & Debts`);
      const theyOwe = pendingIOUs.filter(i=>i.direction==="they_owe_me").reduce((s,i)=>s+i.amount,0);
      const iOwe   = pendingIOUs.filter(i=>i.direction==="i_owe_them").reduce((s,i)=>s+i.amount,0);
      kv("Pending - They Owe Me", fmt(theyOwe), GREEN);
      kv("Pending - I Owe Them",  fmt(iOwe),   RED);
      kv("Net IOU Position", fmt(theyOwe - iOwe), (theyOwe-iOwe)>=0 ? GREEN : RED);
      y += 2;

      const IOU = { date: M, person: M+23, dir: M+59, desc: M+98, status: M+149, amt: W-M };
      checkPage(10);
      pdf.setFillColor(...CARD); pdf.rect(M, y, contentW, 7, "F");
      pdf.setFont("Livvic","bold"); pdf.setFontSize(8); pdf.setTextColor(180, 150, 255);
      pdf.text("Date",      IOU.date   + 1, y+5);
      pdf.text("Person",    IOU.person + 1, y+5);
      pdf.text("Direction", IOU.dir    + 1, y+5);
      pdf.text("Note",      IOU.desc   + 1, y+5);
      pdf.text("Status",    IOU.status + 1, y+5);
      pdf.text("Amount",    IOU.amt    - 1, y+5, { align: "right" });
      y += 8;

      [...pendingIOUs, ...settledIOUs].forEach((iou, idx) => {
        checkPage(7);
        if (idx%2===0) { pdf.setFillColor(...STRIPE); pdf.rect(M, y-1, contentW, 6.5, "F"); }
        const owed = iou.direction === "they_owe_me";
        pdf.setFont("Livvic","normal"); pdf.setFontSize(7.5); pdf.setTextColor(...TXT);
        pdf.text(iou.date,                                                   IOU.date   + 1, y+4);
        pdf.text(cap(iou.person.slice(0,14)),                                IOU.person + 1, y+4);
        pdf.setTextColor(owed ? 80 : 255, owed ? 220 : 80, owed ? 120 : 80);
        pdf.text(owed ? "They Owe Me" : "I Owe Them",                        IOU.dir    + 1, y+4);
        pdf.setTextColor(...TXT);
        pdf.text(cap(pdf.splitTextToSize(iou.description||"-", 48)[0]),      IOU.desc   + 1, y+4);
        pdf.setTextColor(iou.settled ? 80 : 255, iou.settled ? 220 : 200, iou.settled ? 120 : 60);
        pdf.text(iou.settled ? "Settled" : "Pending",                        IOU.status + 1, y+4);
        pdf.setFont("Livvic","bold");
        pdf.setTextColor(owed ? 80 : 255, owed ? 220 : 80, owed ? 120 : 80);
        pdf.text(safe(`${owed?"+":"-"}${fmt(iou.amount)}`),                  IOU.amt    - 1, y+4, { align: "right" });
        y += 6.5;
      });

      // ── FOOTER on every page ─────────────────────────────────────
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFillColor(...CARD); pdf.rect(0, H-10, W, 10, "F");
        pdf.setFont("Livvic","normal"); pdf.setFontSize(7); pdf.setTextColor(...DIM);
        pdf.text("Generated by Finly - Made by Adil Sukumar", M, H-3);
        pdf.text(`Page ${p} of ${totalPages}`, W-M, H-3, { align: "right" });
      }

      pdf.save(`Finly_${activeAccount}_${activeBudgetMonth?.label?.replace(/ /g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("PDF export failed. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };
  
    if (!summary || !activeBudgetMonth) {
    return (
      <Layout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalAvailable = summary.initialBalance + summary.totalIncome;
  const spendPercentage =
    totalAvailable > 0 ? Math.min(100, Math.round((summary.totalExpenses / totalAvailable) * 100)) : 0;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Overview</h2>
          <p className="text-muted-foreground mt-1">Here's your financial status for {activeBudgetMonth.label}</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={exportPDF} isLoading={isExporting} className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none">
            Add Transaction
          </Button>
        </div>
      </div>

      <div id="dashboard-content" className="space-y-6 bg-background rounded-3xl p-2 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden group border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-muted-foreground">Initial Balance</p>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.initialBalance).replace("₹", currency)}
            </h3>
          </Card>

          <Card className="relative overflow-hidden group border-success/20">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-success">Total Income</p>
              <ArrowDownRight className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(totalAvailable).replace("₹", currency)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">incl. {currency}{summary.initialBalance.toFixed(2)} opening</p>
          </Card>

          <Card className="relative overflow-hidden group border-destructive/20">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-destructive">Total Expenses</p>
              <ArrowUpRight className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.totalExpenses).replace("₹", currency)}
            </h3>
          </Card>

          <GlowingCard className="relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-white/70">Current Balance</p>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {isShared && perPersonData
                ? `${currency}${perPersonData.combinedNet.toFixed(2)}`
                : formatCurrency(summary.currentBalance).replace("₹", currency)}
            </h3>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Spend Rate</span>
                <span className="text-white">{spendPercentage}%</span>
              </div>
              <div className="w-full bg-black/50 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    spendPercentage > 90 ? "bg-destructive" : spendPercentage > 75 ? "bg-warning" : "bg-primary"
                  }`}
                  style={{ width: `${spendPercentage}%` }}
                />
              </div>
            </div>
          </GlowingCard>
        </div>

        {isShared && perPersonData && (
          <Card className="border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">Per-Person Breakdown This Month</h3>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-2 px-1">
              <div />
              <div className="text-center"><span className="text-xs font-semibold text-primary uppercase tracking-wider">Adil Sukumar</span></div>
              <div className="text-center"><span className="text-xs font-semibold text-accent uppercase tracking-wider">Snehal Dixit</span></div>
              <div className="text-center"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combined</span></div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-sm text-success font-medium"><TrendingUp className="w-3.5 h-3.5 shrink-0" /> Income</div>
              <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center"><p className="text-sm font-bold text-success">{currency}{perPersonData.adil.income.toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center"><p className="text-sm font-bold text-success">{currency}{perPersonData.snehal.income.toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center"><p className="text-sm font-bold text-success">{currency}{(perPersonData.adil.income + perPersonData.snehal.income).toFixed(2)}</p></div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-sm text-destructive font-medium"><TrendingDown className="w-3.5 h-3.5 shrink-0" /> Expenses</div>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-center"><p className="text-sm font-bold text-destructive">{currency}{perPersonData.adil.expenses.toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-center"><p className="text-sm font-bold text-destructive">{currency}{perPersonData.snehal.expenses.toFixed(2)}</p></div>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-center"><p className="text-sm font-bold text-destructive">{currency}{(perPersonData.adil.expenses + perPersonData.snehal.expenses).toFixed(2)}</p></div>
            </div>
            {(() => {
              const { adilNet, snehalNet, combinedNet } = perPersonData;
              const netColor = (v: number) => v >= 0 ? "text-primary" : "text-destructive";
              const netBg = (v: number) => v >= 0 ? "bg-primary/8 border-primary/20" : "bg-destructive/8 border-destructive/20";
              return (
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex items-center gap-1.5 text-sm text-white/60 font-medium leading-tight"><Wallet className="w-3.5 h-3.5 shrink-0 text-primary" /><span>Net Balance<br />Available</span></div>
                  {[adilNet, snehalNet, combinedNet].map((v, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-center ${netBg(v)}`}>
                      <p className={`text-sm font-bold ${netColor(v)}`}>{v >= 0 ? "+" : "-"}{currency}{Math.abs(v).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        )}

        {isShared && perPersonData ? (
          <div className="space-y-8">
            <ChartGroup title="Combined" accent="hsl(240,5%,60%)" summary={summary} />
            <ChartGroup title="Adil Sukumar" accent="hsl(260,100%,65%)" summary={perPersonData.adilSummary} />
            <ChartGroup title="Snehal Dixit" accent="hsl(190,100%,50%)" summary={perPersonData.snehalSummary} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 border-white/5">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">Spending by Category</h3>
                <p className="text-sm text-muted-foreground">Where your money goes</p>
              </div>
              <CategoryDonutChart data={summary.categoryBreakdown} />
            </Card>
            <Card className="p-5 border-white/5">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">Top Expenses</h3>
                <p className="text-sm text-muted-foreground">Largest spending categories</p>
              </div>
              <TopCategoriesBarChart data={summary.topExpenseCategories} />
            </Card>
            <Card className="p-5 border-white/5">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">Daily Spending</h3>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </div>
              <DailySpendingChart data={summary.dailySpending} />
            </Card>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 md:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  );
}
