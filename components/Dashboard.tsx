import React from 'react';
import { CalculatedReport } from '../types';
import { formatCurrency } from '../constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Wallet, Car, Users } from 'lucide-react';

interface DashboardProps {
  reports: CalculatedReport[];
  totalDrivers: number;
  totalVehicles: number;
}

interface ChartDataItem {
  name: string;
  Faturação: number;
  Despesas: number;
  Lucro: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export const Dashboard: React.FC<DashboardProps> = ({ reports, totalDrivers, totalVehicles }) => {
  // Aggregate data for totals
  const totalGross = reports.reduce((acc, r) => acc + r.totalGrossEarnings, 0);
  const totalNet = reports.reduce((acc, r) => acc + r.netEarnings, 0);
  const totalExpenses = reports.reduce((acc, r) => acc + r.fuelCost + r.tollsCost + r.rentCost + r.miscExpenses + (r.debtPayment || 0), 0);

  // Prepare chart data (Group by week)
  const chartDataRaw = reports.reduce((acc, curr) => {
    const week = curr.weekStartDate;
    if (!acc[week]) {
      acc[week] = { name: week, Faturação: 0, Despesas: 0, Lucro: 0 };
    }
    acc[week].Faturação += curr.totalGrossEarnings;
    acc[week].Despesas += (curr.fuelCost + curr.tollsCost + curr.rentCost + curr.miscExpenses + (curr.debtPayment || 0));
    acc[week].Lucro += curr.netEarnings;
    return acc;
  }, {} as Record<string, ChartDataItem>);

  const chartData = Object.values(chartDataRaw).sort((a: ChartDataItem, b: ChartDataItem) => a.name.localeCompare(b.name));

  // Expense breakdown
  const expenseBreakdown = [
    { name: 'Aluguer', value: reports.reduce((acc, r) => acc + r.rentCost, 0) },
    { name: 'Combustível', value: reports.reduce((acc, r) => acc + r.fuelCost, 0) },
    { name: 'Portagens', value: reports.reduce((acc, r) => acc + r.tollsCost, 0) },
    { name: 'Outros/Dívidas', value: reports.reduce((acc, r) => acc + r.miscExpenses + (r.debtPayment || 0), 0) },
  ];

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral da Frota</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturação Total" 
          value={formatCurrency(totalGross)} 
          icon={TrendingUp} 
          colorClass="bg-blue-500 text-blue-600" 
        />
        <StatCard 
          title="Lucro Líquido (Frota)" 
          value={formatCurrency(totalNet)} 
          icon={Wallet} 
          colorClass="bg-emerald-500 text-emerald-600" 
        />
        <StatCard 
          title="Veículos Ativos" 
          value={totalVehicles} 
          icon={Car} 
          colorClass="bg-purple-500 text-purple-600" 
        />
        <StatCard 
          title="Motoristas" 
          value={totalDrivers} 
          icon={Users} 
          colorClass="bg-orange-500 text-orange-600" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Desempenho Financeiro por Semana</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(val) => `€${val}`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="Faturação" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Distribuição de Despesas</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};