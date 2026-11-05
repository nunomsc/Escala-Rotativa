/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';
import { MONTHS_PT, formatDateShortPt, formatDateMatrixPt } from '../utils/dateUtils';
import { Printer, X, FileText, Check, AlertCircle, Edit3, Grid, List } from 'lucide-react';

interface ScaleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  weekends: ScheduledWeekend[];
  currentScale: MonthlyScale;
  currentYear: number;
  currentMonthIndex: number;
  availability?: { [volunteerId: string]: { [dateStr: string]: boolean } };
}

export function ScaleReportModal({
  isOpen,
  onClose,
  volunteers,
  weekends,
  currentScale,
  currentYear,
  currentMonthIndex,
  availability = {}
}: ScaleReportModalProps) {
  
  // Custom title for the official report (defaults to the document title)
  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('scale_pdf_custom_title') || 'ESCALA DE SERVIÇO - MÚSICA VELHA';
    } catch {
      return 'ESCALA DE SERVIÇO - MÚSICA VELHA';
    }
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  const handleTitleChange = (newTitle: string) => {
    setHeaderTitle(newTitle);
    try {
      localStorage.setItem('scale_pdf_custom_title', newTitle);
    } catch {}
  };

  // Flatten all weekend days in chronological order
  const allDays = useMemo(() => {
    const days: { dateStr: string; isFriday: boolean; dayName: string; dateFormatted: string; turn: any }[] = [];
    weekends.forEach((w) => {
      const friInfo = formatDateMatrixPt(w.fridayStr);
      days.push({
        dateStr: w.fridayStr,
        isFriday: true,
        dayName: friInfo.dayName,
        dateFormatted: friInfo.dateFormatted,
        turn: currentScale[w.fridayStr] || { volunteers: [], locked: false }
      });

      const satInfo = formatDateMatrixPt(w.saturdayStr);
      days.push({
        dateStr: w.saturdayStr,
        isFriday: false,
        dayName: satInfo.dayName,
        dateFormatted: satInfo.dateFormatted,
        turn: currentScale[w.saturdayStr] || { volunteers: [], locked: false }
      });
    });
    return days;
  }, [weekends, currentScale]);

  // Sort volunteers alphabetically by name (identical to the official document)
  const sortedVolunteers = useMemo(() => {
    return [...volunteers].sort((a, b) => a.name.localeCompare(b.name));
  }, [volunteers]);

  // Member statistics for summary view
  const volunteerReportData = useMemo(() => {
    const assignmentsMap: Record<string, string[]> = {};
    volunteers.forEach(v => {
      assignmentsMap[v.id] = [];
    });

    weekends.forEach(w => {
      [w.fridayStr, w.saturdayStr].forEach(dStr => {
        const turn = currentScale[dStr];
        if (turn && turn.volunteers && !turn.isEvent) {
          turn.volunteers.forEach(vId => {
            if (vId && assignmentsMap[vId] !== undefined) {
              assignmentsMap[vId].push(dStr);
            }
          });
        }
      });
    });

    return volunteers.map(v => {
      const dates = assignmentsMap[v.id] || [];
      const sortedDates = [...dates].sort((a, b) => a.localeCompare(b));
      return {
        ...v,
        assignedDates: sortedDates,
        shiftCount: sortedDates.length
      };
    }).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (b.shiftCount !== a.shiftCount) return b.shiftCount - a.shiftCount;
      return a.name.localeCompare(b.name);
    });
  }, [volunteers, weekends, currentScale]);

  // Counts of events and regular shifts
  const eventDaysCount = useMemo(() => {
    return allDays.filter(d => !!d.turn?.isEvent).length;
  }, [allDays]);

  const regularSlotsTotal = (allDays.length - eventDaysCount) * 2;
  const regularSlotsFilled = useMemo(() => {
    let count = 0;
    allDays.forEach(d => {
      if (!d.turn?.isEvent) {
        count += (d.turn?.volunteers?.filter((id: string) => !!id).length || 0);
      }
    });
    return count;
  }, [allDays]);

  const handlePrint = () => {
    window.print();
  };

  const monthLabel = `${MONTHS_PT[currentMonthIndex].toLowerCase()} ${currentYear}`;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#1D1B20]/75 dark:bg-black/85 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible"
      id="report-modal-overlay"
    >
      {/* Modal Container */}
      <div 
        className="bg-white dark:bg-[#141218] w-full max-w-6xl rounded-[28px] shadow-2xl flex flex-col max-h-[100vh] sm:max-h-[95vh] overflow-hidden border border-[#CAC4D0]/50 dark:border-[#49454F] print:shadow-none print:border-none print:static print:max-h-none print:rounded-none"
        id="report-preview-container"
      >
        {/* Modal Controls Header (Screen Only) */}
        <div className="bg-[#F7F2FA] dark:bg-[#1F1D24] border-b border-[#CAC4D0] dark:border-[#49454F] px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#002060] dark:bg-[#9ec5f7] text-white dark:text-[#002060] rounded-xl flex items-center justify-center font-black text-sm">
              PDF
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1D1B20] dark:text-[#E6E1E5]">
                Exportar Relatório Oficial (Formato Grelha)
              </h3>
              <p className="text-xs text-[#625B71] dark:text-[#CAC4D0]">
                {MONTHS_PT[currentMonthIndex]} de {currentYear} • {eventDaysCount > 0 ? `${eventDaysCount} dia(s) de evento` : 'Escala regular'}
              </p>
            </div>
          </div>

          {/* View switcher & Actions */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#E7E0EC] dark:bg-[#2B2930] p-1 rounded-full text-xs">
              <button
                id="btn-switch-matrix-view"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-[#002060] text-white shadow-xs'
                    : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#002060]'
                }`}
              >
                <Grid size={13} />
                <span>Grelha Oficial (PDF)</span>
              </button>
              <button
                id="btn-switch-list-view"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#002060] text-white shadow-xs'
                    : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#002060]'
                }`}
              >
                <List size={13} />
                <span>Resumo por Membro</span>
              </button>
            </div>

            {/* Print Trigger */}
            <button
              id="btn-print-action"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#002060] dark:bg-[#9ec5f7] hover:bg-[#001845] dark:hover:bg-[#86b5f5] text-white dark:text-[#002060] font-bold rounded-full text-xs shadow-sm transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {/* Close */}
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

        {/* Toolbar Bar for Title Customization (Screen Only) */}
        <div className="bg-[#FEF7FF] dark:bg-[#17141E] border-b border-[#E7E0EC] dark:border-[#49454F] px-6 py-2.5 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <span className="font-bold text-[#49454F] dark:text-[#CAC4D0] shrink-0">Título do Documento:</span>
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-white dark:bg-[#2B2930] border border-[#002060]/50 text-xs font-bold text-[#002060] dark:text-[#9ec5f7] rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#002060]"
                  placeholder="Ex: ESCALA DE SERVIÇO - MÚSICA VELHA"
                />
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="px-2.5 py-1 bg-[#002060] text-white text-[11px] font-bold rounded-md cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-black text-[#002060] dark:text-[#9ec5f7] tracking-wide">{headerTitle}</span>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-[#6750A4] dark:text-[#D0BCFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  title="Alterar título do cabeçalho"
                >
                  <Edit3 size={11} />
                  <span>Editar</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#625B71] dark:text-[#CAC4D0] hidden md:block">
            Orientação recomendada para impressão: <strong>Horizontal (Landscape)</strong>
          </div>
        </div>

        {/* Printable Scrollable Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-100/70 dark:bg-black/30 print:p-0 print:bg-white print:overflow-visible">
          
          {/* MATRIX OFFICIAL VIEW (Identical to User Attachment) */}
          {viewMode === 'matrix' && (
            <div 
              className="bg-white text-black p-4 sm:p-8 shadow-sm max-w-[285mm] mx-auto min-h-[195mm] flex flex-col justify-between print:p-0 print:m-0 print:shadow-none print:max-w-none print:border-none"
              id="printable-matrix-sheet"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              {/* THE OFFICIAL SCALE TABLE */}
              <div className="w-full overflow-x-auto print:overflow-visible">
                <table 
                  className="w-full border-collapse text-xs select-none"
                  style={{
                    border: '3px solid #002060',
                    color: '#000000'
                  }}
                >
                  {/* Table Header: Document Title */}
                  <thead>
                    <tr>
                      <th 
                        colSpan={allDays.length + 1}
                        className="py-3 px-4 text-center font-black tracking-wider text-sm sm:text-base text-[#002060] uppercase"
                        style={{
                          borderBottom: '3px solid #002060',
                          backgroundColor: '#FFFFFF',
                          letterSpacing: '0.08em'
                        }}
                      >
                        {headerTitle}
                      </th>
                    </tr>

                    {/* Subheaders: Month and Day names */}
                    <tr>
                      {/* Top-left cell: Month and Year */}
                      <th 
                        rowSpan={2}
                        className="p-2.5 text-center font-bold text-xs sm:text-sm text-[#002060] align-middle"
                        style={{
                          borderRight: '2px solid #002060',
                          borderBottom: '2px solid #002060',
                          backgroundColor: '#FFFFFF',
                          width: '180px',
                          minWidth: '150px'
                        }}
                      >
                        {monthLabel}
                      </th>

                      {/* Day Name Row: SEXTA / SÁBADO */}
                      {allDays.map((day, idx) => (
                        <th
                          key={day.dateStr}
                          className="py-1 px-1.5 text-center font-bold text-[11px] sm:text-xs text-[#002060] uppercase tracking-wider"
                          style={{
                            borderRight: idx === allDays.length - 1 ? 'none' : '2px solid #002060',
                            borderBottom: '1px solid #002060',
                            backgroundColor: '#FFFFFF',
                            minWidth: '68px'
                          }}
                        >
                          {day.dayName}
                        </th>
                      ))}
                    </tr>

                    {/* Day Date Row: 06/nov, 07/nov... */}
                    <tr>
                      {allDays.map((day, idx) => (
                        <th
                          key={day.dateStr}
                          className="py-1 px-1.5 text-center font-bold text-[11px] sm:text-xs text-[#002060] lowercase"
                          style={{
                            borderRight: idx === allDays.length - 1 ? 'none' : '2px solid #002060',
                            borderBottom: '2px solid #002060',
                            backgroundColor: '#FFFFFF'
                          }}
                        >
                          {day.dateFormatted}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Table Body: Each Volunteer as a Row */}
                  <tbody>
                    {sortedVolunteers.map((vol, vIdx) => {
                      const isInactive = !vol.active;

                      return (
                        <tr key={vol.id} style={{ height: '32px' }}>
                          {/* Volunteer Name Column */}
                          <td 
                            className="px-3 py-1.5 font-bold text-xs sm:text-[13px] text-[#000000] align-middle whitespace-nowrap"
                            style={{
                              borderRight: '2px solid #002060',
                              borderBottom: vIdx === sortedVolunteers.length - 1 ? 'none' : '1px solid #002060',
                              backgroundColor: '#FFFFFF'
                            }}
                          >
                            {vol.name}
                          </td>

                          {/* Columns for Each Day */}
                          {allDays.map((day, dIdx) => {
                            const isEventDay = !!day.turn?.isEvent;

                            // 1. If EVENT DAY: Spanned across ALL volunteers on row 0
                            if (isEventDay) {
                              if (vIdx === 0) {
                                return (
                                  <td
                                    key={day.dateStr}
                                    rowSpan={sortedVolunteers.length}
                                    className="p-2 text-center align-middle"
                                    style={{
                                      borderRight: dIdx === allDays.length - 1 ? 'none' : '2px solid #002060',
                                      borderBottom: 'none',
                                      backgroundColor: '#FFFFFF',
                                      verticalAlign: 'middle',
                                      position: 'relative'
                                    }}
                                  >
                                    <div 
                                      className="h-full flex items-center justify-center font-black uppercase text-xs sm:text-sm text-[#000000] tracking-wider select-none leading-relaxed"
                                      style={{
                                        writingMode: 'vertical-rl',
                                        transform: 'rotate(180deg)',
                                        whiteSpace: 'nowrap',
                                        margin: '0 auto',
                                        letterSpacing: '0.04em'
                                      }}
                                    >
                                      <span className="block mb-1.5 font-black">
                                        EVENTO "{day.turn.eventName ? day.turn.eventName.toUpperCase() : 'EVENTO'}"
                                      </span>
                                      <span className="block text-[11px] sm:text-xs font-bold text-[#000000]">
                                        (TODOS DE SERVIÇO)
                                      </span>
                                    </div>
                                  </td>
                                );
                              }
                              // For all other rows, skip this cell because of rowSpan
                              return null;
                            }

                            // 2. REGULAR DAY (Duos alocadas)
                            const isAssigned = (day.turn.volunteers || []).includes(vol.id);
                            const volAvail = availability[vol.id];
                            const isExplicitlyUnavailable = volAvail !== undefined && volAvail[day.dateStr] === false;
                            const showDashes = isInactive || isExplicitlyUnavailable;

                            return (
                              <td
                                key={day.dateStr}
                                className="text-center align-middle p-1"
                                style={{
                                  borderRight: dIdx === allDays.length - 1 ? 'none' : '2px solid #002060',
                                  borderBottom: vIdx === sortedVolunteers.length - 1 ? 'none' : '1px solid #002060',
                                  backgroundColor: isAssigned ? '#9ec5f7' : '#FFFFFF',
                                  WebkitPrintColorAdjust: 'exact',
                                  printColorAdjust: 'exact'
                                }}
                              >
                                {isAssigned ? (
                                  <span className="sr-only">Escalado</span>
                                ) : showDashes ? (
                                  <span className="font-bold tracking-widest text-[#000000] text-xs select-none">
                                    -------
                                  </span>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Informative Guidance Info Box (Screen Only) */}
              <div className="mt-6 flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 text-xs text-[#002060] dark:text-[#9ec5f7] print:hidden">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#002060] dark:text-[#9ec5f7]" />
                <div className="space-y-1">
                  <strong>Instruções para guardar em PDF:</strong>
                  <p>
                    Clique em <strong>"Imprimir / Guardar PDF"</strong>. No diálogo do navegador, selecione o destino <strong>"Guardar como PDF"</strong>, defina o layout como <strong>Horizontal (Landscape)</strong> e ative a opção <strong>"Gráficos de segundo plano / Background graphics"</strong> para preservar o preenchimento azul das escalas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LIST & DETAILED SUMMARY VIEW (Alternative overview) */}
          {viewMode === 'list' && (
            <div className="bg-white dark:bg-[#1D1B24] border border-[#CAC4D0]/40 dark:border-[#49454F] rounded-2xl p-6 sm:p-10 shadow-sm max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:m-0">
              <div className="space-y-6">
                <div className="border-b border-[#CAC4D0] dark:border-[#49454F] pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#002060] dark:text-[#9ec5f7] uppercase tracking-wide">
                      {headerTitle}
                    </h2>
                    <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] uppercase font-bold mt-0.5">
                      Resumo Coletivo de Cargas • {MONTHS_PT[currentMonthIndex]} de {currentYear}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#49454F] dark:text-[#CAC4D0] space-y-0.5">
                    <div>Vagas regulares: <strong>{regularSlotsFilled}/{regularSlotsTotal}</strong></div>
                    <div>Dias de Evento: <strong>{eventDaysCount} (Todos de Serviço)</strong></div>
                    <div className="text-[#002060] dark:text-[#9ec5f7] font-black">
                      Cobertura Total: <strong>{allDays.length > 0 ? Math.round(((regularSlotsFilled + eventDaysCount * 2) / (allDays.length * 2)) * 100) : 0}%</strong>
                    </div>
                  </div>
                </div>

                {/* Volunteers Table */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F2FA] dark:bg-[#25212C] text-[#002060] dark:text-[#9ec5f7] border-b border-[#CAC4D0] dark:border-[#49454F]">
                      <th className="py-2.5 px-3 font-bold w-1/3">Membro da Equipa</th>
                      <th className="py-2.5 px-3 font-bold w-1/6">Estado</th>
                      <th className="py-2.5 px-3 font-bold w-1/12 text-center">Turnos</th>
                      <th className="py-2.5 px-3 font-bold w-5/12">Datas Escaladas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CAC4D0]/30 dark:divide-[#49454F]/30">
                    {volunteerReportData.map((v, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50/50 dark:hover:bg-[#49454F]/10 ${v.active ? '' : 'opacity-65'}`}>
                        <td className="py-3 px-3 font-bold text-[#1D1B20] dark:text-[#E6E1E5]">
                          {v.name}
                        </td>
                        <td className="py-3 px-3">
                          {v.active ? (
                            <span className="text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 px-2.5 py-0.5 rounded-full text-[10px]">
                              Ativo
                            </span>
                          ) : (
                            <span className="text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full text-[10px]">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#002060] dark:text-[#9ec5f7]">
                          {v.shiftCount}
                        </td>
                        <td className="py-3 px-3">
                          {v.assignedDates.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {v.assignedDates.map((dStr, dIdx) => (
                                <span 
                                  key={dIdx}
                                  className="inline-block bg-[#9ec5f7]/40 text-[#002060] dark:text-[#9ec5f7] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#002060]/20"
                                >
                                  {formatDateShortPt(dStr)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Sem escalas regulares</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Controls Footer for Mobile (Screen Only) */}
        <div className="bg-[#F7F2FA] dark:bg-[#1F1D24] border-t border-[#CAC4D0] dark:border-[#49454F] px-6 py-3 flex items-center justify-end gap-3 print:hidden sm:hidden">
          <button
            id="btn-close-report-mob"
            onClick={onClose}
            className="px-4 py-2 border border-[#CAC4D0] font-bold text-[#49454F] rounded-full text-xs cursor-pointer"
          >
            Fechar
          </button>
          <button
            id="btn-print-action-mob"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#002060] text-white font-bold rounded-full text-xs shadow-sm cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
