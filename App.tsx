import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Car, FileText, PlusCircle, Menu, X, Database, Banknote, Loader2, Save, Percent, Pencil, Trash2, RefreshCw, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { Driver, Vehicle, WeeklyReport, CalculatedReport, ViewState, Debt } from './types';
import { Dashboard } from './components/Dashboard';
import { FinancialEntryForm } from './components/FinancialEntryForm';
import { ReportList } from './components/ReportList';
import { supabase } from './services/supabase';
import { formatCurrency } from './constants';

function App() {
  // State management
  const [view, setView] = useState<ViewState>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filterDriverId, setFilterDriverId] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // UI State for Forms
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  // Edit State for Reports
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);

  // Edit State for Debts
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  
  // Debt Confirmation State (Add/Edit)
  const [pendingDebt, setPendingDebt] = useState<{
    id?: string; // Optional ID if editing
    driverId: string;
    description: string;
    totalAmount: number;
    installments: number;
  } | null>(null);

  // DELETE Confirmation State (Global)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'report' | 'debt' | 'driver' | 'vehicle' | null;
    id: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: ''
  });
  
  // Data State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // Computed state for reports with enriched vehicle/driver data and calculations
  const [calculatedReports, setCalculatedReports] = useState<CalculatedReport[]>([]);

  // Form states for edits
  const [formWorkModel, setFormWorkModel] = useState<string>('Rent');

  // Fetch Data from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Drivers
      const { data: driversData } = await supabase.from('drivers').select('*');
      if (driversData) {
        // Map snake_case to camelCase
        const mappedDrivers = driversData.map((d: any) => ({
          id: d.id,
          name: d.name,
          nif: d.nif,
          phone: d.phone,
          email: d.email,
          vehicleId: d.vehicle_id,
          workModel: d.work_model || 'Rent', // Default to Rent if null
          driverPercentage: d.driver_percentage || 0
        }));
        setDrivers(mappedDrivers);
      }

      // 2. Fetch Vehicles
      const { data: vehiclesData } = await supabase.from('vehicles').select('*');
      if (vehiclesData) {
        const mappedVehicles = vehiclesData.map((v: any) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          plate: v.plate,
          weeklyRent: v.weekly_rent,
          fuelType: v.fuel_type
        }));
        setVehicles(mappedVehicles);
      }

      // 3. Fetch Reports
      const { data: reportsData } = await supabase.from('weekly_reports').select('*');
      if (reportsData) {
        const mappedReports = reportsData.map((r: any) => ({
          id: r.id,
          driverId: r.driver_id,
          vehicleId: r.vehicle_id,
          weekStartDate: r.week_start_date,
          uberGrossEarnings: r.uber_gross_earnings,
          boltGrossEarnings: r.bolt_gross_earnings,
          rentDeduction: r.rent_deduction,
          fuelCost: r.fuel_cost,
          tollsCost: r.tolls_cost,
          miscExpenses: r.misc_expenses,
          debtPayment: r.debt_payment,
          notes: r.notes
        }));
        setReports(mappedReports);
      }

      // 4. Fetch Debts
      const { data: debtsData } = await supabase.from('debts').select('*');
      if (debtsData) {
        const mappedDebts = debtsData.map((d: any) => ({
          id: d.id,
          driverId: d.driver_id,
          description: d.description,
          totalAmount: d.total_amount,
          installments: d.installments,
          createdAt: d.created_at ? d.created_at.split('T')[0] : ''
        }));
        setDebts(mappedDebts);
      }

    } catch (error) {
      console.error("Erro ao carregar dados do Supabase:", error);
      alert("Erro ao conectar ao banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate whenever raw data changes
  useEffect(() => {
    const calculated = reports.map(report => {
      const driver = drivers.find(d => d.id === report.driverId);
      const vehicle = vehicles.find(v => v.id === report.vehicleId);
      
      const rentCost = report.rentDeduction !== undefined ? report.rentDeduction : (vehicle ? vehicle.weeklyRent : 0);
      const debtPayment = report.debtPayment || 0;
      const boltEarnings = report.boltGrossEarnings || 0;
      const totalGrossEarnings = report.uberGrossEarnings + boltEarnings;
      const operationalExpenses = report.fuelCost + report.tollsCost + report.miscExpenses;

      let netEarnings = 0;

      // CALCULATION LOGIC BASED ON WORK MODEL
      if (driver && driver.workModel === 'Percentage' && driver.driverPercentage) {
        const profitBase = totalGrossEarnings - operationalExpenses;
        const driverShare = profitBase * (driver.driverPercentage / 100);
        netEarnings = driverShare - debtPayment;
      } else {
        netEarnings = totalGrossEarnings - operationalExpenses - rentCost - debtPayment;
      }

      return {
        ...report,
        boltGrossEarnings: boltEarnings,
        rentDeduction: rentCost,
        debtPayment,
        driverName: driver ? driver.name : 'Desconhecido',
        vehicleModel: vehicle ? vehicle.model : 'N/A',
        vehiclePlate: vehicle ? vehicle.plate : 'N/A',
        rentCost,
        totalGrossEarnings,
        netEarnings,
        workModel: driver?.workModel,
        driverPercentage: driver?.driverPercentage
      };
    });
    setCalculatedReports(calculated);
  }, [reports, drivers, vehicles]);

  // Filtering Logic
  const filteredReports = calculatedReports.filter(report => {
    const matchDriver = filterDriverId ? report.driverId === filterDriverId : true;
    const matchVehicle = filterVehicleId ? report.vehicleId === filterVehicleId : true;
    const matchStart = filterStartDate ? report.weekStartDate >= filterStartDate : true;
    const matchEnd = filterEndDate ? report.weekStartDate <= filterEndDate : true;
    return matchDriver && matchVehicle && matchStart && matchEnd;
  });

  // --- DELETE LOGIC (CENTRALIZED) ---

  const requestDelete = (type: 'report' | 'debt' | 'driver' | 'vehicle', id: string) => {
    let title = '';
    let message = '';

    switch(type) {
      case 'report':
        title = 'Excluir Relatório';
        message = 'Tem a certeza que deseja eliminar este relatório? Esta ação não pode ser desfeita e afetará os cálculos financeiros.';
        break;
      case 'debt':
        title = 'Excluir Dívida';
        message = 'Tem certeza que deseja eliminar esta dívida permanentemente? O histórico de pagamentos será mantido nos relatórios já criados.';
        break;
      case 'driver':
        title = 'Excluir Motorista';
        message = 'ATENÇÃO: Excluir um motorista pode causar inconsistência nos relatórios financeiros existentes. Deseja continuar?';
        break;
      case 'vehicle':
        title = 'Excluir Viatura';
        message = 'ATENÇÃO: Excluir uma viatura pode causar inconsistência nos relatórios. Deseja continuar?';
        break;
    }

    setDeleteConfirmation({
      isOpen: true,
      type,
      id,
      title,
      message
    });
  };

  const processDelete = async () => {
    const { type, id } = deleteConfirmation;
    if (!type || !id) return;

    // Close modal immediately
    setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });

    // Handle logic based on type
    try {
      if (type === 'debt') {
        // Optimistic UI Update
        const original = [...debts];
        setDebts(prev => prev.filter(d => d.id !== id));
        
        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (error) {
          setDebts(original);
          alert('Erro ao excluir dívida: ' + error.message);
        }
      } 
      else if (type === 'report') {
        // Optimistic UI Update
        const originalReports = [...reports];
        const originalCalculated = [...calculatedReports];
        setReports(prev => prev.filter(r => r.id !== id));
        setCalculatedReports(prev => prev.filter(r => r.id !== id));

        const { error } = await supabase.from('weekly_reports').delete().eq('id', id);
        if (error) {
          setReports(originalReports);
          setCalculatedReports(originalCalculated);
          alert('Erro ao excluir relatório: ' + error.message);
        }
      }
      else if (type === 'driver') {
        const { error } = await supabase.from('drivers').delete().eq('id', id);
        if (error) {
          alert('Erro ao excluir motorista. Verifique se existem relatórios associados.');
        } else {
          await fetchData();
        }
      }
      else if (type === 'vehicle') {
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) {
          alert('Erro ao excluir viatura. Verifique se existem motoristas associados.');
        } else {
          await fetchData();
        }
      }
    } catch (err) {
      console.error("Critical delete error:", err);
      alert("Ocorreu um erro inesperado ao tentar excluir.");
      await fetchData(); // Resync on crash
    }
  };

  // --- REPORT HANDLERS ---

  const handleAddOrUpdateReport = async (reportData: Omit<WeeklyReport, 'id'>) => {
    // Prepare payload for Supabase (snake_case)
    const dbPayload = {
      driver_id: reportData.driverId,
      vehicle_id: reportData.vehicleId,
      week_start_date: reportData.weekStartDate,
      uber_gross_earnings: reportData.uberGrossEarnings,
      bolt_gross_earnings: reportData.boltGrossEarnings,
      rent_deduction: reportData.rentDeduction,
      fuel_cost: reportData.fuelCost,
      tolls_cost: reportData.tollsCost,
      misc_expenses: reportData.miscExpenses,
      debt_payment: reportData.debtPayment
    };

    let error;
    
    if (editingReport) {
      // Update existing
      const { error: err } = await supabase
        .from('weekly_reports')
        .update(dbPayload)
        .eq('id', editingReport.id);
      error = err;
    } else {
      // Create new
      const { error: err } = await supabase
        .from('weekly_reports')
        .insert([dbPayload]);
      error = err;
    }

    if (error) {
      console.error("Erro ao salvar relatório:", error);
      alert("Erro ao salvar no banco de dados.");
      return;
    }

    alert(editingReport ? "Relatório atualizado com sucesso!" : "Relatório criado com sucesso!");
    setEditingReport(null);
    await fetchData();
    setView('reports'); 
  };

  const handleEditReport = (report: CalculatedReport) => {
    // Find original WeeklyReport object to pass to form
    const original = reports.find(r => r.id === report.id) || null;
    setEditingReport(original);
    setView('entry');
  };

  // --- DRIVER HANDLERS ---

  const handleAddOrUpdateDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const vehicleIdInput = formData.get('vehicleId') as string;
    const vehicleId = vehicleIdInput && vehicleIdInput !== "" ? vehicleIdInput : null;
    const workModel = formData.get('workModel') as string;
    const driverPercentage = parseFloat(formData.get('driverPercentage') as string) || 0;

    const dbPayload = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      nif: formData.get('nif') as string,
      vehicle_id: vehicleId,
      work_model: workModel,
      driver_percentage: driverPercentage
    };

    let error;
    if (editingDriver) {
       const { error: err } = await supabase
         .from('drivers')
         .update(dbPayload)
         .eq('id', editingDriver.id);
       error = err;
    } else {
       const { error: err } = await supabase
         .from('drivers')
         .insert([dbPayload]);
       error = err;
    }

    if (error) {
      console.error("Erro ao salvar motorista:", error);
      alert("Erro ao salvar motorista. Verifique os dados.");
      return;
    }

    alert(editingDriver ? "Motorista atualizado!" : "Motorista adicionado!");
    setIsAddingDriver(false);
    setEditingDriver(null);
    await fetchData();
  };

  const startEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setFormWorkModel(driver.workModel || 'Rent');
    setIsAddingDriver(true);
  };

  // --- VEHICLE HANDLERS ---

  const handleAddOrUpdateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dbPayload = {
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      plate: formData.get('plate') as string,
      weekly_rent: parseFloat(formData.get('weeklyRent') as string),
      fuel_type: formData.get('fuelType') as string
    };

    let error;
    if (editingVehicle) {
      const { error: err } = await supabase.from('vehicles').update(dbPayload).eq('id', editingVehicle.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('vehicles').insert([dbPayload]);
      error = err;
    }

    if (error) {
      console.error("Erro ao salvar viatura:", error);
      alert("Erro ao salvar viatura.");
      return;
    }

    alert(editingVehicle ? "Viatura atualizada!" : "Viatura adicionada!");
    setIsAddingVehicle(false);
    setEditingVehicle(null);
    await fetchData();
  };

  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsAddingVehicle(true);
  };

  // --- DEBT HANDLERS ---

  const startEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    // Optionally scroll to top or focus form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 1: Initiate Debt Creation/Update (Open Modal)
  const handleInitiateAddDebt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setPendingDebt({
      id: editingDebt?.id, // Includes ID if editing
      driverId: formData.get('driverId') as string,
      description: formData.get('description') as string,
      totalAmount: parseFloat(formData.get('totalAmount') as string),
      installments: parseInt(formData.get('installments') as string)
    });
  };

  // Step 2: Confirm and Save to DB
  const handleConfirmAddDebt = async () => {
    if (!pendingDebt) return;

    const dbPayload = {
      driver_id: pendingDebt.driverId,
      description: pendingDebt.description,
      total_amount: pendingDebt.totalAmount,
      installments: pendingDebt.installments
    };

    let error;
    if (pendingDebt.id) {
       // Update existing debt
       const { error: err } = await supabase
         .from('debts')
         .update(dbPayload)
         .eq('id', pendingDebt.id);
       error = err;
    } else {
       // Create new debt
       const { error: err } = await supabase
        .from('debts')
        .insert([dbPayload]);
       error = err;
    }

    if (error) {
      console.error("Erro ao salvar dívida:", error);
      alert("Erro ao salvar dívida: " + error.message);
    } else {
      alert(pendingDebt.id ? 'Dívida atualizada com sucesso!' : 'Dívida registada com sucesso!');
      await fetchData();
      setEditingDebt(null); // Clear edit mode
    }
    
    setPendingDebt(null); // Close modal
  };

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => {
        setView(target);
        setIsMobileMenuOpen(false);
        // Reset edit states when changing views
        setEditingReport(null);
        setEditingDriver(null);
        setEditingVehicle(null);
        setEditingDebt(null); // Reset debt edit
        setIsAddingDriver(false);
        setIsAddingVehicle(false);
        setPendingDebt(null);
        setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
      }}
      className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${
        view === target 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Carregando dados Tonin Manager Pro...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Tonin Manager Pro</h1>
              <p className="text-xs text-slate-400">Frota & Finanças</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem target="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem target="reports" icon={FileText} label="Relatórios Semanais" />
            <NavItem target="entry" icon={PlusCircle} label="Novo Registo" />
            <NavItem target="debts" icon={Banknote} label="Dívidas e Penhoras" />
            <div className="pt-6 pb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase px-3 mb-2">Administração</p>
              <NavItem target="drivers" icon={Users} label="Motoristas" />
              <NavItem target="vehicles" icon={Car} label="Viaturas" />
            </div>
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800">
             <div className="flex flex-col gap-4">
               <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-emerald-500/20">DB</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Conectado</span>
                    <span className="text-[10px] text-slate-400">Supabase Cloud</span>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Tonin Manager Pro</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 relative">
          
          {/* CONFIRMATION MODAL - ADD/EDIT DEBT */}
          {pendingDebt && (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[scaleIn_0.2s_ease-out]">
                <div className="flex flex-col items-center text-center mb-6">
                   <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                     <AlertCircle size={28} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">
                      {pendingDebt.id ? 'Confirmar Edição' : 'Confirmar Nova Dívida'}
                   </h3>
                   <p className="text-slate-500 text-sm mt-2">
                      {pendingDebt.id ? 'Confirme as alterações do plano de pagamento.' : 'Verifique os dados abaixo antes de criar o plano de pagamento.'}
                   </p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6 border border-slate-100">
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Motorista:</span>
                     <span className="font-medium text-slate-800">{drivers.find(d => d.id === pendingDebt.driverId)?.name}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Descrição:</span>
                     <span className="font-medium text-slate-800 truncate max-w-[150px]">{pendingDebt.description}</span>
                   </div>
                   <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                     <span className="text-slate-500">Valor Total:</span>
                     <span className="font-bold text-slate-900">{formatCurrency(pendingDebt.totalAmount)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Parcelas:</span>
                     <span className="font-medium text-slate-800">{pendingDebt.installments} semanas</span>
                   </div>
                   <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 mt-2">
                     <span className="text-xs font-semibold uppercase text-slate-500">Desconto Semanal</span>
                     <span className="font-bold text-red-600 text-lg">{formatCurrency(pendingDebt.totalAmount / pendingDebt.installments)}</span>
                   </div>
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={() => setPendingDebt(null)}
                     className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleConfirmAddDebt}
                     className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                   >
                     <CheckCircle size={18} />
                     Confirmar
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMATION MODAL - DELETE ACTIONS */}
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[scaleIn_0.2s_ease-out]">
                <div className="flex flex-col items-center text-center mb-6">
                   <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                     <Trash2 size={24} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900">{deleteConfirmation.title}</h3>
                   <p className="text-slate-500 text-sm mt-2">{deleteConfirmation.message}</p>
                </div>
                <div className="flex gap-3">
                   <button 
                     onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                     className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={processDelete}
                     className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                   >
                     Excluir
                   </button>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            
            {/* Header Title Dynamic */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {view === 'dashboard' && 'Visão Geral'}
                  {view === 'entry' && (editingReport ? 'Editar Relatório' : 'Lançamento Financeiro')}
                  {view === 'reports' && 'Relatórios Financeiros'}
                  {view === 'drivers' && 'Lista de Motoristas'}
                  {view === 'vehicles' && 'Frota de Veículos'}
                  {view === 'debts' && 'Gestão de Dívidas'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {view === 'dashboard' && 'Acompanhe o desempenho da sua frota em tempo real.'}
                  {view === 'reports' && 'Histórico de ganhos e despesas por motorista.'}
                  {view === 'debts' && 'Controle de valores em dívida e parcelamentos de motoristas.'}
                  {view === 'drivers' && 'Gerencie a sua equipe de motoristas.'}
                  {view === 'vehicles' && 'Gerencie a sua frota de veículos.'}
                </p>
              </div>
              
              {view === 'reports' && (
                <button 
                  onClick={() => {
                    setEditingReport(null);
                    setView('entry');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <PlusCircle size={18} />
                  Novo Registo
                </button>
              )}
            </div>

            {/* Views */}
            {view === 'dashboard' && (
              <Dashboard 
                reports={calculatedReports} 
                totalDrivers={drivers.length} 
                totalVehicles={vehicles.length} 
              />
            )}

            {view === 'entry' && (
              <>
                {editingReport && (
                   <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800">
                         <Pencil size={20} />
                         <span className="font-medium">Você está editando um relatório existente.</span>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingReport(null);
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800 underline"
                      >
                        Cancelar Edição
                      </button>
                   </div>
                )}
                <FinancialEntryForm 
                  drivers={drivers} 
                  vehicles={vehicles} 
                  debts={debts}
                  onSubmit={handleAddOrUpdateReport} 
                  initialData={editingReport}
                  isEditing={!!editingReport}
                />
              </>
            )}

            {view === 'reports' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                   <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold">
                      <Filter size={18} />
                      <h3>Filtrar Relatórios</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Motorista</label>
                        <select 
                           value={filterDriverId} 
                           onChange={(e) => setFilterDriverId(e.target.value)}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm"
                        >
                           <option value="">Todos</option>
                           {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Viatura</label>
                        <select 
                           value={filterVehicleId} 
                           onChange={(e) => setFilterVehicleId(e.target.value)}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm"
                        >
                           <option value="">Todas</option>
                           {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.make}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
                        <input 
                           type="date" 
                           value={filterStartDate}
                           onChange={(e) => setFilterStartDate(e.target.value)}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Data Fim</label>
                        <input 
                           type="date" 
                           value={filterEndDate}
                           onChange={(e) => setFilterEndDate(e.target.value)}
                           className="w-full rounded-lg border-slate-300 border p-2 text-sm"
                        />
                      </div>
                      <button 
                         onClick={() => {
                             setFilterDriverId('');
                             setFilterVehicleId('');
                             setFilterStartDate('');
                             setFilterEndDate('');
                         }}
                         className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-slate-200"
                      >
                         <X size={16} />
                         Limpar
                      </button>
                   </div>
                </div>

                <ReportList 
                  reports={filteredReports} 
                  onDelete={(id) => requestDelete('report', id)}
                  onEdit={handleEditReport}
                />
              </div>
            )}

            {view === 'drivers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold text-slate-800">Motoristas Registados</h3>
                   <button 
                     onClick={() => {
                       if (isAddingDriver) {
                         setIsAddingDriver(false);
                         setEditingDriver(null);
                       } else {
                         setEditingDriver(null);
                         setFormWorkModel('Rent');
                         setIsAddingDriver(true);
                       }
                     }}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isAddingDriver ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                   >
                     {isAddingDriver ? <X size={18} /> : <PlusCircle size={18} />}
                     {isAddingDriver ? 'Cancelar' : 'Adicionar Motorista'}
                   </button>
                </div>

                {isAddingDriver && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       {editingDriver ? <RefreshCw className="w-5 h-5 text-amber-600" /> : <Users className="w-5 h-5 text-blue-600" />}
                       {editingDriver ? 'Editar Motorista' : 'Dados do Novo Motorista'}
                    </h4>
                    <form onSubmit={handleAddOrUpdateDriver} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                       <div className="lg:col-span-1">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo</label>
                          <input name="name" defaultValue={editingDriver?.name} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="Ex: João Silva" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Telefone</label>
                          <input name="phone" defaultValue={editingDriver?.phone} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="912 345 678" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                          <input name="email" type="email" defaultValue={editingDriver?.email} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="email@exemplo.com" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">NIF</label>
                          <input name="nif" defaultValue={editingDriver?.nif} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="123456789" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Viatura Atribuída (Opcional)</label>
                          <select name="vehicleId" defaultValue={editingDriver?.vehicleId || ""} className="w-full rounded-lg border-slate-300 border p-2 text-sm">
                            <option value="">Nenhuma</option>
                            {vehicles.map(v => (
                              <option key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</option>
                            ))}
                          </select>
                       </div>
                       
                       {/* Work Model Selection */}
                       <div className="lg:col-span-3 border-t border-slate-100 mt-4 pt-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Modelo de Trabalho</label>
                              <select 
                                name="workModel" 
                                value={formWorkModel}
                                onChange={(e) => setFormWorkModel(e.target.value)}
                                className="w-full rounded-lg border-slate-300 border p-2 text-sm bg-slate-50"
                              >
                                <option value="Rent">Aluguer Fixo Semanal</option>
                                <option value="Percentage">Comissão (Percentagem)</option>
                              </select>
                           </div>
                           
                           {formWorkModel === 'Percentage' && (
                             <div className="animate-[fadeIn_0.2s_ease-out]">
                                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                                  <Percent size={12} />
                                  Percentagem do Motorista
                                </label>
                                <div className="relative">
                                  <input 
                                    name="driverPercentage" 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    defaultValue={editingDriver?.driverPercentage || "50"}
                                    required
                                    className="w-full rounded-lg border-blue-300 border p-2 text-sm pl-4" 
                                  />
                                  <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  O motorista recebe esta % do lucro após despesas (Combustível + Portagens).
                                </p>
                             </div>
                           )}
                         </div>
                       </div>

                       <div className="lg:col-span-3 mt-2">
                          <button type="submit" className={`w-full text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 ${editingDriver ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                            <Save size={16} />
                            {editingDriver ? 'Atualizar Motorista' : 'Guardar Motorista'}
                          </button>
                       </div>
                    </form>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Nome</th>
                        <th className="px-6 py-3">Viatura</th>
                        <th className="px-6 py-3">Modelo</th>
                        <th className="px-6 py-3 text-center">Acordo</th>
                        <th className="px-6 py-3">Telefone</th>
                        <th className="px-6 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.length === 0 ? (
                         <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum motorista encontrado no banco de dados.</td></tr>
                      ) : drivers.map(d => {
                        const v = vehicles.find(veh => veh.id === d.vehicleId);
                        return (
                          <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900">{d.name}</td>
                            <td className="px-6 py-4 text-slate-600">
                               {v ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{v.plate}</span> : 'Nenhuma'}
                            </td>
                            <td className="px-6 py-4">
                               {d.workModel === 'Percentage' ? (
                                 <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">Percentagem</span>
                               ) : (
                                 <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">Aluguer Fixo</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-center">
                               {d.workModel === 'Percentage' ? (
                                 <span className="font-bold text-slate-700">{d.driverPercentage}% / {100 - (d.driverPercentage || 0)}%</span>
                               ) : (
                                 <span className="text-slate-500">-</span>
                               )}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{d.phone}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => startEditDriver(d)} 
                                  className="p-1.5 hover:bg-amber-100 text-amber-600 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => requestDelete('driver', d.id)}
                                  className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'vehicles' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold text-slate-800">Frota Disponível</h3>
                   <button 
                     onClick={() => {
                        if (isAddingVehicle) {
                          setIsAddingVehicle(false);
                          setEditingVehicle(null);
                        } else {
                          setEditingVehicle(null);
                          setIsAddingVehicle(true);
                        }
                     }}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isAddingVehicle ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                   >
                     {isAddingVehicle ? <X size={18} /> : <PlusCircle size={18} />}
                     {isAddingVehicle ? 'Cancelar' : 'Adicionar Viatura'}
                   </button>
                </div>

                {isAddingVehicle && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-[fadeIn_0.3s_ease-out]">
                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                       {editingVehicle ? <RefreshCw className="w-5 h-5 text-amber-600" /> : <Car className="w-5 h-5 text-blue-600" />}
                       {editingVehicle ? 'Editar Viatura' : 'Dados da Nova Viatura'}
                    </h4>
                    <form onSubmit={handleAddOrUpdateVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                          <input name="make" defaultValue={editingVehicle?.make} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="Ex: Renault" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                          <input name="model" defaultValue={editingVehicle?.model} required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="Ex: Zoe" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Matrícula</label>
                          <input name="plate" defaultValue={editingVehicle?.plate} required className="w-full rounded-lg border-slate-300 border p-2 text-sm uppercase" placeholder="AA-00-BB" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Renda Semanal (€)</label>
                          <input name="weeklyRent" defaultValue={editingVehicle?.weeklyRent} type="number" step="0.01" required className="w-full rounded-lg border-slate-300 border p-2 text-sm" placeholder="200.00" />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Combustível</label>
                          <select name="fuelType" defaultValue={editingVehicle?.fuelType} required className="w-full rounded-lg border-slate-300 border p-2 text-sm">
                             <option value="Electric">Elétrico</option>
                             <option value="Diesel">Diesel</option>
                             <option value="Gasoline">Gasolina</option>
                             <option value="Hybrid">Híbrido</option>
                          </select>
                       </div>
                       <div>
                          <button type="submit" className={`w-full text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 ${editingVehicle ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                            <Save size={16} />
                            {editingVehicle ? 'Atualizar Viatura' : 'Guardar Viatura'}
                          </button>
                       </div>
                    </form>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vehicles.length === 0 ? (
                      <div className="col-span-3 p-6 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                          Nenhuma viatura encontrada no banco de dados.
                      </div>
                  ) : vehicles.map(v => (
                    <div key={v.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => startEditVehicle(v)} className="p-1.5 bg-amber-100 text-amber-600 rounded-full hover:bg-amber-200"><Pencil size={14}/></button>
                         <button onClick={() => requestDelete('vehicle', v.id)} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><Trash2 size={14}/></button>
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{v.make} {v.model}</h3>
                          <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">{v.plate}</span>
                        </div>
                        <div className={`p-2 rounded-full ${v.fuelType === 'Electric' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                          <Car size={20} />
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Combustível</span>
                          <span className="font-medium">{v.fuelType === 'Electric' ? 'Elétrico' : v.fuelType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Renda Semanal</span>
                          <span className="font-bold text-slate-900">€{v.weeklyRent}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'debts' && (
              <div className="space-y-6">
                {/* Add/Edit Debt Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       {editingDebt ? <RefreshCw className="w-5 h-5 text-amber-600" /> : <PlusCircle className="w-5 h-5 text-blue-600" />}
                       {editingDebt ? 'Editar Dívida Existente' : 'Registar Nova Dívida'}
                     </h3>
                     {editingDebt && (
                       <button onClick={() => setEditingDebt(null)} className="text-xs text-slate-500 hover:text-slate-800 underline">Cancelar Edição</button>
                     )}
                  </div>
                  
                  <form 
                    key={editingDebt ? editingDebt.id : 'new-debt-form'}
                    onSubmit={handleInitiateAddDebt} 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
                  >
                    <div className="lg:col-span-1">
                       <label className="block text-xs font-medium text-slate-700 mb-1">Motorista</label>
                       <select 
                          name="driverId" 
                          required 
                          defaultValue={editingDebt?.driverId || ""}
                          className="w-full rounded-lg border-slate-300 border p-2 text-sm"
                       >
                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                    </div>
                    <div className="lg:col-span-2">
                       <label className="block text-xs font-medium text-slate-700 mb-1">Descrição</label>
                       <input 
                         name="description" 
                         required 
                         defaultValue={editingDebt?.description || ""}
                         placeholder="Ex: Franquia Acidente, Multa..." 
                         className="w-full rounded-lg border-slate-300 border p-2 text-sm" 
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Valor Total (€)</label>
                       <input 
                         name="totalAmount" 
                         type="number" 
                         step="0.01" 
                         defaultValue={editingDebt?.totalAmount || ""}
                         required 
                         className="w-full rounded-lg border-slate-300 border p-2 text-sm" 
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-slate-700 mb-1">Nº Semanas</label>
                       <input 
                         name="installments" 
                         type="number" 
                         min="1" 
                         defaultValue={editingDebt?.installments || ""}
                         required 
                         className="w-full rounded-lg border-slate-300 border p-2 text-sm" 
                       />
                    </div>
                    <div className="md:col-span-2 lg:col-span-5">
                       <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto ${editingDebt ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                         {editingDebt ? 'Atualizar Plano' : 'Criar Plano de Pagamento'}
                       </button>
                    </div>
                  </form>
                </div>

                {/* Debts List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <div className="p-4 border-b border-slate-200 bg-slate-50">
                     <h3 className="font-semibold text-slate-700">Dívidas Ativas e Planos de Pagamento</h3>
                   </div>
                   <table className="w-full text-sm text-left">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-3">Motorista</th>
                         <th className="px-6 py-3">Descrição</th>
                         <th className="px-6 py-3">Data Início</th>
                         <th className="px-6 py-3 text-right">Valor Total</th>
                         <th className="px-6 py-3 text-center">Parcelas</th>
                         <th className="px-6 py-3 text-right">Valor/Semana</th>
                         <th className="px-6 py-3 text-center">Ações</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {debts.length === 0 ? (
                         <tr><td colSpan={7} className="text-center py-8 text-slate-400 italic">Nenhuma dívida registada.</td></tr>
                       ) : debts.map(debt => {
                         const driver = drivers.find(d => d.id === debt.driverId);
                         return (
                           <tr key={debt.id} className="hover:bg-slate-50 group">
                             <td className="px-6 py-4 font-medium text-slate-900">{driver?.name || 'Desconhecido'}</td>
                             <td className="px-6 py-4 text-slate-600">{debt.description}</td>
                             <td className="px-6 py-4 text-slate-500">{debt.createdAt}</td>
                             <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(debt.totalAmount)}</td>
                             <td className="px-6 py-4 text-center">
                               <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">{debt.installments}x</span>
                             </td>
                             <td className="px-6 py-4 text-right font-bold text-slate-800">
                               {formatCurrency(debt.totalAmount / debt.installments)}
                             </td>
                             <td className="px-6 py-4 text-center">
                               <div className="flex items-center justify-center gap-2">
                                 <button 
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     startEditDebt(debt);
                                   }}
                                   className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                   title="Editar Dívida"
                                 >
                                   <Pencil size={16} className="pointer-events-none" />
                                 </button>
                                 <button 
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     requestDelete('debt', debt.id);
                                   }}
                                   className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                   title="Apagar Dívida"
                                 >
                                   <Trash2 size={16} className="pointer-events-none" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;