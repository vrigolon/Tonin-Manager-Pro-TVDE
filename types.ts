export interface Driver {
  id: string;
  name: string;
  nif: string;
  phone: string;
  email: string;
  vehicleId: string | null; // Assigned vehicle
  workModel?: 'Rent' | 'Percentage'; // New field: Rental or Split model
  driverPercentage?: number; // New field: e.g., 50, 60 if model is Percentage
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
  weeklyRent: number; // Cost in Euros
  fuelType: 'Diesel' | 'Gasoline' | 'Electric' | 'Hybrid';
}

export interface Debt {
  id: string;
  driverId: string;
  description: string;
  totalAmount: number;
  installments: number; // Number of weeks
  createdAt: string;
}

export interface WeeklyReport {
  id: string;
  driverId: string;
  vehicleId: string;
  weekStartDate: string; // ISO Date YYYY-MM-DD
  uberGrossEarnings: number; // Total faturação bruta Uber
  boltGrossEarnings: number; // Total faturação bruta Bolt
  rentDeduction: number; // Valor do aluguel cobrado nesta semana (pode ser pro-rata)
  fuelCost: number; // Combustível/Carregamento
  tollsCost: number; // Portagens (Via Verde)
  miscExpenses: number; // Lavagens, etc.
  debtPayment: number; // Valor da parcela da dívida paga nesta semana
  notes?: string;
}

export interface CalculatedReport extends WeeklyReport {
  driverName: string;
  vehicleModel: string;
  vehiclePlate: string;
  rentCost: number; // Alias for rentDeduction for display consistency
  netEarnings: number; // What the driver actually takes home (or owes)
  totalGrossEarnings: number; // Uber + Bolt
  workModel?: 'Rent' | 'Percentage';
  driverPercentage?: number;
}

export type ViewState = 'dashboard' | 'drivers' | 'vehicles' | 'reports' | 'entry' | 'debts';