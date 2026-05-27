/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';
import { MONTHS_PT, formatDateLongPt, formatDateShortPt } from '../utils/dateUtils';
import { Printer, X, Calendar, Users, FileText, Check, AlertCircle } from 'lucide-react';

interface ScaleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  weekends: ScheduledWeekend[];
  currentScale: MonthlyScale;
  currentYear: number;
  currentMonthIndex: number;
}

export function ScaleReportModal({
  isOpen,
  onClose,
  volunteers,
  weekends,
  currentScale,
  currentYear,
  currentMonthIndex
}: ScaleReportModalProps) {
  
  if (!isOpen) return null;

  // 1. Calculate assigned turns and dates per volunteer
  const volunteerReportData = useMemo(() => {
    // Dictionary to hold list of assigned date strings per volunteer ID
    const assignmentsMap: Record<string, string[]> = {};
    
    // Initialize for all volunteers in the system
    volunteers.forEach(v => {
      assignmentsMap[v.id] = [];
    });

    // We traverse all dates of the current month weekends
    weekends.forEach(w => {
      const dates = [w.fridayStr, w.saturdayStr];
      dates.forEach(dStr => {
        const turn = currentScale[dStr];
        if (turn && turn.volunteers) {
          turn.volunteers.forEach(vId => {
            if (vId && assignmentsMap[vId] !== undefined) {
              assignmentsMap[vId].push(dStr);
            }
          });
        }
      });
    });

    // Map into array and sort by Name
    return volunteers.map(v => {
      const dates = assignmentsMap[v.id] || [];
      // Sort dates chronologically
      const sortedDates = [...dates].sort((a, b) => a.localeCompare(b));
      return {
        ...v,
        assignedDates: sortedDates,
        shiftCount: sortedDates.length
      };
    }).sort((a, b) => {
      // Sort active first, then by shiftCount descending, then by name
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (b.shiftCount !== a.shiftCount) return b.shiftCount - a.shiftCount;
      return a.name.localeCompare(b.name);
    });
  }, [volunteers, weekends, currentScale]);

  // Total possible slots for coverage statistics
  const totalSlots = weekends.length * 4; // 2 days * 2 slots = 4 slots/weekend
  const filledSlots = useMemo(() => {
    let count = 0;
    weekends.forEach(w => {
      const friTurn = currentScale[w.fridayStr];
      const satTurn = currentScale[w.saturdayStr];
      count += (friTurn?.volunteers?.filter(id => !!id).length || 0);
      count += (satTurn?.volunteers?.filter(id => !!id).length || 0);
    });
    return count;
  }, [weekends, currentScale]);

  const coveragePercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  // Formatting current date for bottom footer or timestamp
  const generatedAtString = useMemo(() => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const y = today.getFullYear();
    const hr = today.getHours().toString().padStart(2, '0');
    const min = today.getMinutes().toString().padStart(2, '0');
    return `${day}/${m}/${y} às ${hr}:${min}`;
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-[#1D1B20]/65 dark:bg-black/80 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0"
      id="report-modal-overlay"
    >
      {/* Container holding controls and the printable document Sheet */}
      <div 
        className="bg-[#FEF7FF] dark:bg-[#141218] w-full max-w-4xl rounded-[28px] shadow-xl flex flex-col max-h-[100vh] sm:max-h-[90vh] overflow-hidden border border-[#CAC4D0]/50 dark:border-[#49454F] print:shadow-none print:border-none print:static print:max-h-full print:rounded-none bg-white"
        id="report-preview-container"
      >
        {/* Modal Controls Header */}
        <div className="bg-[#F7F2FA] dark:bg-[#1F1D24] border-b border-[#CAC4D0] dark:border-[#49454F] px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#6750A4] dark:text-[#D0BCFF]" />
            <h3 className="font-bold text-[#21005D] dark:text-[#EADDFF]">Visualização do Relatório Oficial</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-action"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#6750A4] dark:bg-[#D0BCFF] hover:bg-[#533c8a] dark:hover:bg-[#B69DF8] text-white dark:text-[#381E72] font-bold rounded-full text-xs shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} />
              Imprimir / Guardar PDF
            </button>
            <button
              id="btn-close-report"
              onClick={onClose}
              className="p-2 hover:bg-[#CAC4D0]/40 dark:hover:bg-[#49454F]/40 rounded-full text-[#49454F] dark:text-[#CAC4D0] transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50 dark:bg-black/20 print:p-0 print:bg-white print:overflow-visible">
          
          {/* A4 Sheet Presentation Card */}
          <div 
            className="bg-white dark:bg-[#1D1B24] border border-[#CAC4D0]/40 dark:border-[#49454F] rounded-2xl p-6 sm:p-10 shadow-sm max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none"
            id="printable-report-sheet"
          >
            {/* Sheet Content Wrapper */}
            <div className="space-y-8">
              
              {/* Report Header Block */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-[#CAC4D0] dark:border-[#49454F] pb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-[#6750A4] dark:bg-[#4F378B] text-white font-black text-xl flex items-center justify-center rounded-xl shadow-xs print:bg-black print:text-white">
                    ER
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-[#1D1B20] dark:text-[#E6E1E5] tracking-tight">RELATÓRIO MENSAL DE DISTRIBUIÇÃO</h1>
                    <p className="text-xs text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-widest font-extrabold print:text-black mt-0.5">
                      Escala de Voluntariado • {MONTHS_PT[currentMonthIndex]} de {currentYear}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-[#49454F] dark:text-[#CAC4D0] space-y-1">
                  <div><strong>Documento:</strong> Escala Mensal</div>
                  <div><strong>Emitido em:</strong> {generatedAtString}</div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[#21005D] dark:text-[#EADDFF] bg-[#EADDFF] dark:bg-[#4F378B] px-2.5 py-0.5 rounded-full font-bold text-[10px] print:border print:border-black print:bg-white print:text-black">
                      Cobertura: {coveragePercent}% ({filledSlots}/{totalSlots} slots)
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Escalas Atribuídas por Fim de Semana */}
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-widest flex items-center gap-2 border-b border-[#EADDFF] dark:border-[#4F378B] pb-2 print:text-black">
                  <Calendar size={14} />
                  Planeamento Mensal dos Fins de Semana
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F2FA] dark:bg-[#25212C] text-[#21005D] dark:text-[#EADDFF] border-b border-[#CAC4D0] dark:border-[#49454F] print:bg-gray-100 print:text-black">
                        <th className="py-2.5 px-3 font-bold w-1/4">Fim de Semana</th>
                        <th className="py-2.5 px-3 font-bold w-3/8">Sexta-feira (Alocação)</th>
                        <th className="py-2.5 px-3 font-bold w-3/8">Sábado (Alocação)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CAC4D0]/30 dark:divide-[#49454F]/30">
                      {weekends.map((weekend, idx) => {
                        const friTurn = currentScale[weekend.fridayStr];
                        const satTurn = currentScale[weekend.saturdayStr];

                        const getDuosNames = (turnIds: string[] | undefined) => {
                          if (!turnIds || turnIds.filter(id => !!id).length === 0) {
                            return <span className="text-[#79747E] dark:text-[#938F99] italic">Sem voluntários escalados</span>;
                          }
                          return (
                            <div className="font-semibold text-[#1D1B20] dark:text-[#E6E1E5]">
                              {turnIds.map((vId, sIdx) => {
                                const vol = volunteers.find(v => v.id === vId);
                                return vol ? (
                                  <div key={sIdx} className="flex items-center gap-1 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#6750A4] dark:bg-[#D0BCFF] print:bg-black" />
                                    <span>{vol.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          );
                        };

                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#49454F]/10 print:hover:bg-transparent">
                            <td className="py-3 px-3">
                              <span className="font-bold text-[#21005D] dark:text-[#D0BCFF] block">Fim de Semana {idx + 1}</span>
                              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] block mt-0.5">
                                {weekend.fridayDate.getDate().toString().padStart(2, '0')}/{((weekend.fridayDate.getMonth() + 1)).toString().padStart(2, '0')} e {weekend.saturdayDate.getDate().toString().padStart(2, '0')}/{((weekend.saturdayDate.getMonth() + 1)).toString().padStart(2, '0')}
                              </span>
                            </td>
                            <td className="py-3 px-3 bg-[#FEF7FF]/30 dark:bg-[#4F378B]/5 print:bg-transparent">
                              {getDuosNames(friTurn?.volunteers)}
                            </td>
                            <td className="py-3 px-3">
                              {getDuosNames(satTurn?.volunteers)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lista Coletiva de Voluntários & Atribuições */}
              <div className="space-y-3">
                <h2 className="text-sm font-black text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-widest flex items-center gap-2 border-b border-[#EADDFF] dark:border-[#4F378B] pb-2 print:text-black">
                  <Users size={14} />
                  Lista de Voluntários e Datas Designadas
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F2FA] dark:bg-[#25212C] text-[#21005D] dark:text-[#EADDFF] border-b border-[#CAC4D0] dark:border-[#49454F] print:bg-gray-100 print:text-black">
                        <th className="py-2.5 px-3 font-bold w-1/3">Voluntário</th>
                        <th className="py-2.5 px-3 font-bold w-1/6">Estado</th>
                        <th className="py-2.5 px-3 font-bold w-1/12 text-center">Turnos</th>
                        <th className="py-2.5 px-3 font-bold w-5/12">Datas Escaladas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CAC4D0]/30 dark:divide-[#49454F]/30">
                      {volunteerReportData.map((v, idx) => {
                        return (
                          <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-[#49454F]/10 print:hover:bg-transparent ${v.active ? '' : 'opacity-65 print:opacity-50'}`}>
                            <td className="py-3 px-3">
                              <span className="font-bold text-[#1D1B20] dark:text-[#E6E1E5] block">{v.name}</span>
                              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] block mt-0.5">
                                {v.phone ? `${v.phone.replace(/\D/g, '').slice(0, 3)} ••• •••` : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {v.active ? (
                                <span className="text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 px-2.5 py-0.5 rounded-full text-[10px] border border-green-200 dark:border-green-800 print:border-none print:px-0">
                                  Ativo
                                </span>
                              ) : (
                                <span className="text-[#79747E] dark:text-[#CAC4D0] bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-[10px] print:border-none print:px-0">
                                  Inativo
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-[#21005D] dark:text-[#EADDFF]">
                              {v.shiftCount}
                            </td>
                            <td className="py-3 px-3">
                              {v.assignedDates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-w-sm">
                                  {v.assignedDates.map((dStr, dIdx) => (
                                    <span 
                                      key={dIdx}
                                      className="inline-block bg-[#EADDFF]/50 dark:bg-[#4F378B]/35 text-[#6750A4] dark:text-[#D0BCFF] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#CAC4D0]/20 dark:border-[#49454F]/35 print:border print:border-black/10 print:bg-transparent print:text-black"
                                    >
                                      {formatDateShortPt(dStr)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[#79747E] dark:text-[#938F99] italic">Sem escalas este mês</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative Guidance Info boxes (hidden on print) */}
              <div className="flex items-start gap-2.5 bg-[#FEF7FF] dark:bg-[#25212C] p-4 rounded-xl border border-[#CAC4D0]/40 dark:border-[#49454F]/30 text-xs text-[#21005D] dark:text-[#EADDFF] print:hidden">
                <AlertCircle size={15} className="text-[#6750A4] dark:text-[#D0BCFF] shrink-0 mt-0.5" />
                <div>
                  <strong>Dica de Exportação para PDF:</strong> Ao clicar em "Imprimir / Guardar PDF", altere o destino do seu diálogo para <strong>"Guardar como PDF / Salvar como PDF"</strong>. Ative a opção <strong>"Imprimir gráficos de fundo" (Background graphics)</strong> nas definições adicionais para manter as cores e os fundos estruturados no documento.
                </div>
              </div>

            </div>

            {/* Document Footer, Signatures and Stamps */}
            <div className="border-t border-[#CAC4D0] dark:border-[#49454F] pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-[10px] text-[#79747E] dark:text-[#938F99] text-center sm:text-left">
                <p className="font-bold text-[#49454F] dark:text-[#CAC4D0]">Escala Rotativa • Gestão de Equipas</p>
                <p className="mt-0.5">Relatório gerado localmente de forma privada e segura. Sem custos adicionais de processamento.</p>
              </div>

              {/* Coordinator Signature blocks */}
              <div className="flex gap-10 text-center text-xs text-[#49454F] dark:text-[#CAC4D0]">
                <div className="space-y-4">
                  <div className="w-36 border-b border-[#79747E] dark:border-[#CAC4D0] mx-auto h-5" />
                  <span className="block font-medium">Assinatura do Responsável</span>
                </div>
                <div className="space-y-4">
                  <div className="w-24 border-b border-[#79747E] dark:border-[#CAC4D0] mx-auto h-5" />
                  <span className="block font-medium">Data</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Controls Footer (hidden on desktop because top header has print/close, useful for smaller devices) */}
        <div className="bg-[#F7F2FA] dark:bg-[#1F1D24] border-t border-[#CAC4D0] dark:border-[#49454F] px-6 py-4 flex items-center justify-end gap-3 print:hidden sm:hidden">
          <button
            id="btn-close-report-mob"
            onClick={onClose}
            className="px-4 py-2 border border-[#CAC4D0] dark:border-[#49454F] font-bold text-[#49454F] dark:text-[#CAC4D0] bg-white dark:bg-[#2B2930] rounded-full text-xs hover:bg-[#F3EDF7] dark:hover:bg-[#49454F]/20 cursor-pointer"
          >
            Fechar
          </button>
          <button
            id="btn-print-action-mob"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] font-bold rounded-full text-xs shadow-sm hover:bg-[#533c8a] dark:hover:bg-[#B69DF8] cursor-pointer"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
