import React, { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useApp } from "@/contexts/AppContext";
import { Card, GlowingCard } from "@/components/ui/PremiumComponents";
import { TopCategoriesBarChart } from "@/components/charts/DashboardCharts";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import { getCategoryColor, getCategoryIcon } from "@/lib/categories";
import { Activity, PieChart as PieChartIcon } from "lucide-react";

export default function Analytics() {
  const { summary, activeAccount, currency, allBudgetMonths, transactions } = useApp();
  
  const heatmapData = useMemo(() => {
    if (!transactions.length) return [];
    
    // Group transactions by date
    const dailyExpenses: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 30 days with 0
    for(let i=0; i<30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      dailyExpenses[ds] = 0;
    }
    
    transactions.forEach(tx => {
      if (tx.type === "expense" && dailyExpenses[tx.date] !== undefined) {
        dailyExpenses[tx.date] += tx.amount;
      }
    });
    
    return Object.entries(dailyExpenses)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  if (!activeAccount || !summary) return <Layout><div /></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Deep Analytics</h2>
        <p className="text-muted-foreground mt-1">Detailed breakdown of your financial habits</p>
      </div>

      {/* Use the same inclusive totals as the Dashboard */}
      {(() => {
        const totalAvailable = summary.initialBalance + summary.totalIncome;
        const savingsRate = totalAvailable > 0
          ? ((summary.currentBalance / totalAvailable) * 100).toFixed(1)
          : "0.0";
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-5 border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Income</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalAvailable).replace('₹', currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">incl. ₹{summary.initialBalance.toFixed(2)} opening</p>
            </Card>
            <Card className="p-5 border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(summary.totalExpenses).replace('₹', currency)}</p>
            </Card>
            <Card className="p-5 border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Net Balance</p>
              <p className={`text-xl font-bold ${summary.currentBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(summary.currentBalance).replace('₹', currency)}
              </p>
            </Card>
            <Card className="p-5 border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Savings Rate</p>
              <p className={`text-xl font-bold ${parseFloat(savingsRate) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {savingsRate}%
              </p>
            </Card>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GlowingCard className="h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Income vs Expenses (Monthly Trend)</h3>
          {summary.incomeVsExpenseByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={summary.incomeVsExpenseByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(240, 5%, 50%)" tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(240, 5%, 50%)" tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(val).replace('₹', currency)} />
                <Tooltip 
                  cursor={{fill: 'hsl(240, 10%, 15%)'}}
                  contentStyle={{ backgroundColor: 'hsl(240, 10%, 5%)', borderColor: 'hsl(240, 10%, 15%)', borderRadius: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="hsl(150, 80%, 45%)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(340, 90%, 60%)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Not enough monthly data</div>
          )}
        </GlowingCard>

        <Card className="h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-6">Top Spending Categories</h3>
          <TopCategoriesBarChart data={summary.topExpenseCategories} />
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Heatmap (30 days)</h3>
          <div className="grid grid-cols-6 gap-2">
            {heatmapData.map((d, i) => {
               const max = Math.max(...heatmapData.map(x => x.amount), 1);
               const intensity = d.amount / max;
               return (
                 <div 
                   key={d.date} 
                   className="aspect-square rounded-md bg-destructive transition-all hover:scale-110 cursor-help relative group"
                   style={{ opacity: intensity === 0 ? 0.1 : 0.3 + (intensity * 0.7) }}
                 >
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/90 text-xs text-white p-2 rounded z-50 whitespace-nowrap pointer-events-none">
                     {d.date}: {currency}{d.amount.toFixed(2)}
                   </div>
                 </div>
               )
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-4">
            <span>Older</span>
            <span>Recent</span>
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
             <PieChartIcon className="w-5 h-5 text-muted-foreground" />
           </div>
           
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
             <div className="space-y-3">
                {summary.categoryBreakdown.map(stat => {
                  const icon = getCategoryIcon(stat.category);
                  const color = getCategoryColor(stat.category);
                  const isExpense = stat.type === "expense";
                  
                  return (
                    <div key={stat.category} className="bg-background/50 p-3 rounded-xl border border-white/5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-black/40" style={{ color }}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm text-white capitalize">{stat.category.replace('_', ' ')}</span>
                          <span className="text-xs text-muted-foreground">{stat.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${isExpense ? 'bg-destructive/70' : 'bg-success/70'}`} style={{ width: `${stat.percentage}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className={`text-sm font-bold ${isExpense ? 'text-white' : 'text-success'}`}>
                          {formatCurrency(stat.amount).replace('₹', currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">{stat.count} txns</div>
                      </div>
                    </div>
                  );
                })}
             </div>
           </div>
        </Card>
      </div>
    </Layout>
  );
}
