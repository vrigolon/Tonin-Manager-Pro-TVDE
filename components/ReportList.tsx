import React, { useState } from 'react';
import { CalculatedReport } from '../types';
import { formatCurrency } from '../constants';
import { analyzeFinancialReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Bot, ChevronDown, ChevronUp, Loader2, Download, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Props {
  reports: CalculatedReport[];
  onDelete: (id: string) => void;
  onEdit: (report: CalculatedReport) => void;
}

export const ReportList: React.FC<Props> = ({ reports, onDelete, onEdit }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

  const handleAiAnalysis = async (report: CalculatedReport) => {
    if (aiAnalysis[report.id]) return; // Already analyzed

    setLoadingAi(prev => ({ ...prev, [report.id]: true }));
    const analysis = await analyzeFinancialReport(report);
    setAiAnalysis(prev => ({ ...prev, [report.id]: analysis }));
    setLoadingAi(prev => ({ ...prev, [report.id]: false }));
  };

  const handleDownloadImage = async (report: CalculatedReport) => {
    const elementId = `report-card-${report.id}`;
    const element = document.getElementById(elementId);
    
    if (!element) return;

    try {
      setGeneratingImage(report.id);
      
      // Small delay to ensure styles are ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution for retina displays
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      // Format: Relatorio_Nome_Data.png
      const filename = `Extrato_${report.driverName.replace(/\s+/g, '_')}_${report.weekStartDate}.png`;
      link.download = filename;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar imagem:", error);
      alert("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setGeneratingImage(null);
    }
  };

  // HANDLER: Request delete from parent (App.tsx)
  const handleDeleteRequest = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Directly call parent handler which now opens the custom modal
    onDelete(id);
  };

  const handleEditClick = (e: React.MouseEvent, report: CalculatedReport) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(report);
  };

  // Sort by date desc
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Data Semana</th>
              <th className="px-6 py-4 font-medium">Motorista</th>
              <th className="px-6 py-4 font-medium">Viatura</th>
              <th className="px-6 py-4 font-medium text-right text-blue-600">Total Faturação</th>
              <th className="px-6 py-4 font-medium text-right text-red-500">Despesas Totais</th>
              <th className="px-6 py-4 font-medium text-right text-emerald-600">Líquido</th>
              <th className="px-6 py-4 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedReports.map((report) => {
              const totalExpenses = report.fuelCost + report.tollsCost + report.rentCost + report.miscExpenses + (report.debtPayment || 0);
              return (
                <React.Fragment key={report.id}>
                  <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleRow(report.id)}>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{report.weekStartDate}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{report.driverName}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col">
                        <span>{report.vehiclePlate}</span>
                        <span className="text-xs text-slate-400">{report.vehicleModel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">{formatCurrency(report.totalGrossEarnings)}</td>
                    <td className="px-6 py-4 text-right text-red-500">-{formatCurrency(totalExpenses)}</td>
                    <td className={`px-6 py-4 text-right font-bold ${report.netEarnings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(report.netEarnings)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => handleEditClick(e, report)}
                          className="p-2 hover:bg-amber-100 text-amber-600 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} className="pointer-events-none" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteRequest(e, report.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} className="pointer-events-none" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleRow(report.id); }}
                          className="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
                        >
                          {expandedRow === report.id ? <ChevronUp size={16} className="pointer-events-none" /> : <ChevronDown size={16} className="pointer-events-none" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRow === report.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-6 py-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          
                          {/* Financial Report Card (Target for Image Generation) */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                              <h4 className="font-semibold text-slate-800">Extrato Semanal</h4>
                              <button 
                                onClick={() => handleDownloadImage(report)}
                                disabled={!!generatingImage}
                                className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {generatingImage === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Salvar Imagem
                              </button>
                            </div>

                            {/* This DIV is what gets captured by html2canvas */}
                            <div 
                              id={`report-card-${report.id}`} 
                              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden"
                            >
                              {/* Decorator */}
                              <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>

                              {/* Header */}
                              <div className="flex justify-between items-start mb-6 mt-2">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">Extrato de Contas</h3>
                                  <p className="text-xs text-slate-500 uppercase tracking-wide">Tonin Manager Pro</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-800">{report.driverName}</p>
                                  <p className="text-xs text-slate-500">Semana: {report.weekStartDate}</p>
                                </div>
                              </div>

                              {/* Top Summary: Total Gross only */}
                              <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100 flex justify-between items-center">
                                <span className="text-slate-600 text-sm font-medium">Total Faturação (Uber+Bolt)</span>
                                <span className="font-bold text-slate-900 text-lg">{formatCurrency(report.totalGrossEarnings)}</span>
                              </div>

                              {/* Breakdown Table */}
                              <div className="space-y-2 text-sm">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Origem dos Rendimentos</p>
                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Uber</span>
                                  <span className="font-medium text-slate-800">{formatCurrency(report.uberGrossEarnings)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Bolt</span>
                                  <span className="font-medium text-green-600">{formatCurrency(report.boltGrossEarnings || 0)}</span>
                                </div>

                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3 mt-4">Detalhamento de Custos</p>
                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Aluguer Viatura ({report.vehiclePlate})</span>
                                  <span className="font-medium text-red-500">-{formatCurrency(report.rentCost)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Combustível / Energia</span>
                                  <span className="font-medium text-red-500">-{formatCurrency(report.fuelCost)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Portagens (Via Verde)</span>
                                  <span className="font-medium text-red-500">-{formatCurrency(report.tollsCost)}</span>
                                </div>
                                
                                {report.debtPayment > 0 && (
                                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100 bg-red-50 px-2 rounded -mx-2">
                                    <span className="text-red-800 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Amortização Dívida
                                    </span>
                                    <span className="font-medium text-red-600">-{formatCurrency(report.debtPayment)}</span>
                                  </div>
                                )}

                                <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                                  <span className="text-slate-600">Outros Encargos</span>
                                  <span className="font-medium text-red-500">-{formatCurrency(report.miscExpenses)}</span>
                                </div>
                                <div className="flex justify-between py-2 mt-2 border-t border-slate-200">
                                  <span className="font-semibold text-slate-700">Total Despesas</span>
                                  <span className="font-bold text-red-600">-{formatCurrency(totalExpenses)}</span>
                                </div>
                              </div>

                              {/* Net Earnings at Bottom - Big Font */}
                              <div className="mt-8 pt-4 border-t-2 border-slate-800">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Valor Líquido a Receber</span>
                                  <span className={`text-4xl font-black tracking-tight ${report.netEarnings >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(report.netEarnings)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 text-right mt-1">
                                    Gerado automaticamente por Tonin Manager Pro
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* AI Analysis (Stays outside the image capture usually, unless desired) */}
                          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative h-fit">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-indigo-600" />
                                Análise Inteligente IA
                              </h4>
                              {!aiAnalysis[report.id] && (
                                <button
                                  onClick={() => handleAiAnalysis(report)}
                                  disabled={loadingAi[report.id]}
                                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                  {loadingAi[report.id] && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {loadingAi[report.id] ? 'Analisando...' : 'Gerar Análise'}
                                </button>
                              )}
                            </div>
                            
                            <div className="text-sm text-slate-600 min-h-[100px]">
                              {loadingAi[report.id] ? (
                                <div className="flex items-center justify-center h-full text-indigo-400 gap-2">
                                  <Loader2 className="animate-spin" />
                                  <span>Consultando Gemini...</span>
                                </div>
                              ) : aiAnalysis[report.id] ? (
                                <div className="prose prose-sm prose-indigo max-w-none">
                                   <ReactMarkdown>{aiAnalysis[report.id]}</ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-center py-4">
                                  Clique em "Gerar Análise" para receber insights financeiros sobre esta semana baseados nos dados apresentados.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};