import React, { useState, useEffect } from 'react';
import { Driver, Vehicle, WeeklyReport, Debt } from '../types';
import { Save, AlertCircle, Banknote, CalendarClock, Percent, RefreshCw } from 'lucide-react';

interface Props {
  drivers: Driver[];
  vehicles: Vehicle[];
  debts: Debt[];
  onSubmit: (report: Omit<WeeklyReport, 'id'>) => void;
  initialData?: WeeklyReport | null; // For editing
  isEditing?: boolean;
}

export const FinancialEntryForm: React.FC<Props> = ({ drivers, vehicles, debts, onSubmit, initialData, isEditing = false }) => {
  const [driverId, setDriverId] = useState('');
  const [weekDate, setWeekDate] = useState('');
  const [uberGross, setUberGross] = useState('');
  const [boltGross, setBoltGross] = useState('');
  const [fuel, setFuel] = useState('');
  const [tolls, setTolls] = useState('');
  const [misc, setMisc] = useState('');
  const [debtPayment, setDebtPayment] = useState('0');
  const [rentAmount, setRentAmount] = useState('0');
  const [daysCharged, setDaysCharged] = useState(7);
  
  // Load initial data if editing
  useEffect(() => {
    if (initialData && isEditing) {
      setDriverId(initialData.driverId);
      setWeekDate(initialData.weekStartDate);
      setUberGross(initialData.uberGrossEarnings.toString());
      setBoltGross(initialData.boltGrossEarnings.toString());
      setFuel(initialData.fuelCost.toString());
      setTolls(initialData.tollsCost.toString());
      setMisc(initialData.miscExpenses.toString());
      setDebtPayment(initialData.debtPayment.toString());
      setRentAmount(initialData.rentDeduction.toString());
    }
  }, [initialData, isEditing]);

  // Auto-select vehicle based on driver
  const selectedDriver = drivers.find(d => d.id === driverId);
  const driverVehicle = selectedDriver ? vehicles.find(v => v.id === selectedDriver.vehicleId) : null;
  const isPercentageModel = selectedDriver?.workModel === 'Percentage';

  // Calculate active debt installments when driver changes (Only if NOT editing to avoid overwriting existing record values)
  useEffect(() => {
    if (!isEditing && selectedDriver) {
      const driverDebts = debts.filter(d => d.driverId === selectedDriver.id);
      const weeklyInstallmentTotal = driverDebts.reduce((acc, debt) => {
        return acc + (debt.totalAmount / debt.installments);
      }, 0);
      setDebtPayment(weeklyInstallmentTotal > 0 ? weeklyInstallmentTotal.toFixed(2) : '0');
    } else if (!isEditing) {
      setDebtPayment('0');
    }
  }, [driverId, debts, selectedDriver, isEditing]);

  // Calculate Rent Pro-rata (Only if NOT editing or if date changes significantly by user)
  useEffect(() => {
    if (isEditing) return; // Don't auto-calc rent in edit mode to preserve original record unless manually changed

    if (isPercentageModel) {
      setRentAmount('0');
      return;
    }

    if (driverVehicle && weekDate) {
      const start = new Date(weekDate);
      const dayOfWeek = start.getDay(); 
      const days = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      setDaysCharged(days);

      const dailyRent = driverVehicle.weeklyRent / 7;
      const calculatedRent = dailyRent * days;
      setRentAmount(calculatedRent.toFixed(2));
    } else if (driverVehicle) {
      setRentAmount(driverVehicle.weeklyRent.toFixed(2));
      setDaysCharged(7);
    } else {
      setRentAmount('0');
      setDaysCharged(0);
    }
  }, [weekDate, driverVehicle, isPercentageModel, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !driverVehicle || !weekDate) return;

    onSubmit({
      driverId,
      vehicleId: driverVehicle.id,
      weekStartDate: weekDate,
      uberGrossEarnings: parseFloat(uberGross) || 0,
      boltGrossEarnings: parseFloat(boltGross) || 0,
      rentDeduction: parseFloat(rentAmount) || 0,
      fuelCost: parseFloat(fuel) || 0,
      tollsCost: parseFloat(tolls) || 0,
      miscExpenses: parseFloat(misc) || 0,
      debtPayment: parseFloat(debtPayment) || 0,
    });

    if (!isEditing) {
      // Reset form only if creating new
      setUberGross('');
      setBoltGross('');
      setFuel('');
      setTolls('');
      setMisc('');
      setDebtPayment('0');
      alert('Registo salvo com sucesso!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${isEditing ? 'bg-amber-100' : 'bg-blue-100'}`}>
          {isEditing ? <RefreshCw className="w-6 h-6 text-amber-600" /> : <Save className="w-6 h-6 text-blue-600" />}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Registo Existente' : 'Novo Registo Semanal'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motorista</label>
            <select
              required
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={isEditing} // Lock driver on edit to maintain integrity
              className={`w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 ${isEditing ? 'bg-slate-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Selecione um motorista...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Week Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Início da Semana</label>
            <input
              type="date"
              required
              value={weekDate}
              onChange={(e) => setWeekDate(e.target.value)}
              className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {!isPercentageModel && !isEditing && weekDate && daysCharged < 7 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <CalendarClock size={12} />
                Semana parcial: Cobrando {daysCharged} dias.
              </p>
            )}
          </div>
        </div>

        {/* Vehicle Info Readonly */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-slate-500 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-slate-700">Viatura Associada: </span>
                {driverVehicle ? (
                  <span className="text-slate-600">
                    {driverVehicle.make} {driverVehicle.model} ({driverVehicle.plate})
                  </span>
                ) : (
                  <span className="text-amber-600 italic">Selecione um motorista com viatura atribuída.</span>
                )}
              </div>
            </div>
            
            {isPercentageModel ? (
              <div className="ml-8 text-sm flex items-center gap-2 text-purple-700 font-medium bg-purple-50 p-2 rounded border border-purple-100 inline-block w-fit">
                 <Percent size={14} />
                 Modo Percentagem: Motorista recebe {selectedDriver?.driverPercentage}% do lucro.
              </div>
            ) : (
              driverVehicle && (
                <div className="ml-8 text-sm text-slate-500">
                   Aluguer Base: €{driverVehicle.weeklyRent}/semana
                </div>
              )
            )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-md font-semibold text-slate-800 mb-4">Valores da Semana (€)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Rent */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isPercentageModel ? 'Aluguer Fixo (Desativado)' : `Aluguer a Cobrar`}
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                disabled={isPercentageModel}
                className={`w-full rounded-lg border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 ${isPercentageModel ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300'}`}
              />
            </div>

             <div className="hidden md:block"></div>

            {/* Gross Earnings Uber */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Faturação Uber (Bruto)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={uberGross}
                onChange={(e) => setUberGross(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Gross Earnings Bolt */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Faturação Bolt (Bruto)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={boltGross}
                onChange={(e) => setBoltGross(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-green-300 border p-2.5 text-sm focus:ring-green-500 focus:border-green-500 bg-green-50/50"
              />
            </div>

            {/* Fuel */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Combustível / Carga</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tolls */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Portagens (Via Verde)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tolls}
                onChange={(e) => setTolls(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Misc */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Outras Despesas</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={misc}
                onChange={(e) => setMisc(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Debt Payment */}
            <div className="md:col-span-2 bg-red-50 p-4 rounded-lg border border-red-100">
               <div className="flex items-center gap-2 mb-2">
                 <Banknote className="w-4 h-4 text-red-500" />
                 <label className="block text-sm font-medium text-red-800">Pagamento de Dívida / Parcela</label>
               </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={debtPayment}
                onChange={(e) => setDebtPayment(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border-red-200 border p-2.5 text-sm focus:ring-red-500 focus:border-red-500 bg-white"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!driverVehicle}
          className={`w-full font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isEditing ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {isEditing ? 'Atualizar Registo' : 'Salvar Registo e Processar Contas'}
        </button>
      </form>
    </div>
  );
};