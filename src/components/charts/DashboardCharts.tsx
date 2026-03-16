import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import type { Summary } from "@/lib/storage";
import { formatCompactCurrency } from "@/lib/utils";
import { getCategoryColor, getCategoryById } from "@/lib/categories";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-white/10 p-3 rounded-xl shadow-2xl z-50">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-semibold text-white ml-auto">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyTrendChart({ data }: { data: Summary['monthlyTrend'] }) {
  if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(150, 80%, 45%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(150, 80%, 45%)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(340, 90%, 60%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(340, 90%, 60%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" vertical={false} />
          <XAxis dataKey="month" stroke="hsl(240, 5%, 50%)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(240, 5%, 50%)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(val)} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="income" name="Income" stroke="hsl(150, 80%, 45%)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
          <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(340, 90%, 60%)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonutChart({ data }: { data: Summary['categoryBreakdown'] }) {
  const expenses = data?.filter(d => d.type === 'expense') || [];
  if (expenses.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expenses yet</div>;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={expenses}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={110}
            paddingAngle={5}
            dataKey="amount"
            nameKey="category"
            stroke="none"
          >
            {expenses.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0];
              const cat = getCategoryById(entry.name as string);
              const label = cat?.name ?? entry.name;
              return (
                <div className="bg-background border border-white/10 p-3 rounded-xl shadow-2xl z-50">
                  <p className="text-white font-medium mb-1">{cat?.icon} {label}</p>
                  <p className="text-sm text-muted-foreground">
                    Amount: <span className="font-semibold text-white">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(entry.value))}
                    </span>
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopCategoriesBarChart({ data }: { data: Summary['topExpenseCategories'] }) {
  if (!data || data.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>;

  const enriched = data.map(entry => ({
    ...entry,
    label: (() => {
      const cat = getCategoryById(entry.category);
      return cat ? `${cat.icon} ${cat.name}` : entry.category;
    })(),
    color: getCategoryColor(entry.category),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={enriched} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 15%)" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="hsl(240, 5%, 50%)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(val)} />
          <YAxis
            dataKey="label"
            type="category"
            stroke="hsl(240, 5%, 70%)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-background border border-white/10 p-3 rounded-xl shadow-2xl z-50">
                  <p className="text-white font-medium mb-1">{label}</p>
                  <p className="text-sm text-muted-foreground">
                    Amount: <span className="font-semibold text-white">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(payload[0].value))}
                    </span>
                  </p>
                </div>
              );
            }}
            cursor={{ fill: 'hsl(240, 10%, 15%)' }}
          />
          <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
            {enriched.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailySpendingChart({ data }: { data: Summary['dailySpending'] }) {
  if (!data || data.length === 0) return <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data available</div>;
  
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(260, 100%, 65%)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(260, 100%, 65%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="hsl(240, 5%, 50%)" fontSize={10} tickFormatter={(val) => val.slice(5)} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(240, 5%, 50%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactCurrency(val)} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="amount" name="Spent" stroke="hsl(260, 100%, 65%)" strokeWidth={2} fillOpacity={1} fill="url(#colorDaily)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
