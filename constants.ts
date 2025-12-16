import { Driver, Vehicle, WeeklyReport, Debt } from './types';

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', make: 'Renault', model: 'Zoe', plate: 'AA-00-BB', weeklyRent: 200, fuelType: 'Electric' },
  { id: 'v2', make: 'Peugeot', model: '308 SW', plate: 'CC-11-DD', weeklyRent: 180, fuelType: 'Diesel' },
  { id: 'v3', make: 'Tesla', model: 'Model 3', plate: 'EE-22-FF', weeklyRent: 350, fuelType: 'Electric' },
  { id: 'v4', make: 'Toyota', model: 'Corolla', plate: 'GG-33-HH', weeklyRent: 220, fuelType: 'Hybrid' },
];

export const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'João Silva', nif: '123456789', phone: '912345678', email: 'joao@uberpt.com', vehicleId: 'v1' },
  { id: 'd2', name: 'Maria Santos', nif: '987654321', phone: '965432198', email: 'maria@uberpt.com', vehicleId: 'v2' },
  { id: 'd3', name: 'António Costa', nif: '456123789', phone: '932165487', email: 'antonio@uberpt.com', vehicleId: 'v3' },
];

export const MOCK_DEBTS: Debt[] = [
  { id: 'deb1', driverId: 'd1', description: 'Franquia Seguro - Acidente Jan', totalAmount: 500, installments: 10, createdAt: '2023-10-01' }
];

export const MOCK_REPORTS: WeeklyReport[] = [
  { 
    id: 'r1', 
    driverId: 'd1', 
    vehicleId: 'v1', 
    weekStartDate: '2023-10-23', 
    uberGrossEarnings: 800,
    boltGrossEarnings: 400,
    rentDeduction: 200,
    fuelCost: 40, 
    tollsCost: 15, 
    miscExpenses: 10,
    debtPayment: 50
  },
  { 
    id: 'r2', 
    driverId: 'd2', 
    vehicleId: 'v2', 
    weekStartDate: '2023-10-23', 
    uberGrossEarnings: 950, 
    boltGrossEarnings: 0,
    rentDeduction: 180,
    fuelCost: 120, 
    tollsCost: 35, 
    miscExpenses: 0,
    debtPayment: 0
  },
  { 
    id: 'r3', 
    driverId: 'd3', 
    vehicleId: 'v3', 
    weekStartDate: '2023-10-23', 
    uberGrossEarnings: 1000, 
    boltGrossEarnings: 800,
    rentDeduction: 350,
    fuelCost: 60, 
    tollsCost: 50, 
    miscExpenses: 20,
    debtPayment: 0
  },
  { 
    id: 'r4', 
    driverId: 'd1', 
    vehicleId: 'v1', 
    weekStartDate: '2023-10-30', 
    uberGrossEarnings: 700, 
    boltGrossEarnings: 400,
    rentDeduction: 200,
    fuelCost: 35, 
    tollsCost: 10, 
    miscExpenses: 5,
    debtPayment: 50
  },
];

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
};