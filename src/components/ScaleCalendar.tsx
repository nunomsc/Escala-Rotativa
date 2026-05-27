/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';
import { MONTHS_PT, formatDateLongPt, formatDateShortPt, getWhatsappLink } from '../utils/dateUtils';
import { 
  Lock, 
  Unlock, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  CheckCircle,
  Clock,
  User,
  Printer
} from 'lucide-react';
import { ScaleReportModal } from './ScaleReportModal';

interface ScaleCalendarProps {
  volunteers: Volunteer[];
  weekends: ScheduledWeekend[];
  currentScale: MonthlyScale;
  currentYear: number;
  currentMonthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthSelect: (index: number) => void;
  onGenerateScale: () => void;
  onClearScale: () => void;
  onToggleLock: (dateStr: string) => void;
  onSwapVolunteer: (dateStr: string, slotIndex: number, volunteerId: string) => void;
  todayDate: Date; // For finding upcoming weekend
}

export function ScaleCalendar({
  volunteers,
  weekends,
  currentScale,
  currentYear,
  currentMonthIndex,
  onPrevMonth,
  onNextMonth,
  onMonthSelect,
  onGenerateScale,
  onClearScale,
  onToggleLock,
  onSwapVolunteer,
  todayDate
}: ScaleCalendarProps) {
  
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // Active and total volunteer lists
  const activeVolunteers = volunteers.filter(v => v.active);

  // Helper to find volunteer Name by ID
  const getVolunteerName = (id: string) => {
    const vol = volunteers.find(v => v.id === id);
    return vol ? vol.name : '(Vazio)';
  };

  // Helper to find full Volunteer by ID
  const getVolunteerObj = (id: string) => {
    return volunteers.find(v => v.id === id);
  };

  // Determine "Próximo Fim de Semana" (Upcoming Weekend)
  // Let's filter the current month's weekends and find the first one where Saturday date >= today
  // If we are looking at a different month that is entirely in the past, default to the first weekend of that month.
  let nextWeekend = weekends.find(w => {
    const sat = new Date(w.saturdayDate);
    sat.setHours(23, 59, 59, 999);
    return sat.getTime() >= todayDate.getTime();
  });

  if (!nextWeekend && weekends.length > 0) {
    nextWeekend = weekends[0]; // Fallback to first weekend
  }

  // Generate combined whatsapp text for Friday or Saturday duos
  const sendDuoWhatsApp = (dateStr: string, isFriday: boolean) => {
    const scaleTurn = currentScale[dateStr];
    const boysText = scaleTurn?.volunteers?.map(vId => getVolunteerName(vId)).join(' e ') || 'Ninguém';
    const dateFormatted = formatDateLongPt(dateStr);
    const text = `Olá! Venho confirmar a nossa escala de voluntários para ${isFriday ? 'sexta-feira' : 'sábado'} (${dateFormatted}). Elementos escalados: ${boysText}. Estão confirmados?`;
    
    // Send to first volunteer, or fallback
    const firstVolId = scaleTurn?.volunteers?.[0];
    const firstVolObj = firstVolId ? getVolunteerObj(firstVolId) : null;
    if (firstVolObj) {
      window.open(getWhatsappLink(firstVolObj.phone, text), '_blank');
    } else {
      alert('Nenhum voluntário escalado nesta vaga para enviar uma mensagem.');
    }
  };

  return (
    <div className="space-y-6" id="scale-calendar-container">
      
      {/* 2026 Month Selector Bar styled as Sleek Interface controller */}
      <div className="bg-[#F7F2FA] dark:bg-[#1F1D24] border border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Navigation controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#EADDFF] dark:bg-[#312B3D] border border-[#D0BCFF]/70 dark:border-[#4F378B] rounded-full p-1.5">
              <button
                id="btn-prev-month"
                onClick={onPrevMonth}
                className="p-1 hover:bg-[#D0BCFF]/60 dark:hover:bg-[#4F378B]/50 rounded-full transition-colors text-[#6750A4] dark:text-[#D0BCFF]"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} className="stroke-[2.5]" />
              </button>
              
              <span className="text-sm font-bold text-[#21005D] dark:text-[#EADDFF] px-4 min-w-[120px] text-center">
                {MONTHS_PT[currentMonthIndex]} {currentYear}
              </span>

              <button
                id="btn-next-month"
                onClick={onNextMonth}
                className="p-1 hover:bg-[#D0BCFF]/60 dark:hover:bg-[#4F378B]/50 rounded-full transition-colors text-[#6750A4] dark:text-[#D0BCFF]"
                title="Próximo Mês"
              >
                <ChevronRight size={16} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Quick Month Dropdown Picker styled of Material 3 */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0] uppercase tracking-wider">Saltar Para:</span>
            <select
              id="select-month-picker"
              value={currentMonthIndex}
              onChange={(e) => onMonthSelect(Number(e.target.value))}
              className="w-full sm:w-auto bg-white dark:bg-[#2B2930] border border-[#79747E] dark:border-[#938F99] rounded-full px-4 py-2 text-xs font-medium text-[#1D1B20] dark:text-[#E6E1E5] focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-2 focus:ring-[#EADDFF] dark:focus:ring-[#4F378B] shadow-xs"
            >
              {MONTHS_PT.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* "Próximo Fim de Semana" Highlight Block with overlap avatar style */}
      {nextWeekend && (
        <div 
          id="upcoming-weekend-highlight" 
          className="bg-[#EADDFF] dark:bg-[#2B1B4D] rounded-[28px] p-6 shadow-sm border border-[#D0BCFF] dark:border-[#4F378B] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
        >
          {/* Internal sleek elements */}
          <div className="space-y-2 max-w-sm">
            <div>
              <span className="bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-flex items-center gap-1">
                <Clock size={10} className="animate-pulse" />
                Próximo Fim de Semana
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#21005D] dark:text-[#EADDFF] tracking-tight">
              {nextWeekend.fridayDate.getDate().toString().padStart(2, '0')} e {nextWeekend.saturdayDate.getDate().toString().padStart(2, '0')} de {MONTHS_PT[nextWeekend.fridayDate.getMonth()]}
            </h2>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0] font-medium">
              Escala equilibrada e ativa para cobertura neste feriado ou fim de semana comum.
            </p>
          </div>

          {/* Duos Avatars overlaps */}
          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
            {/* Friday highlight */}
            <div className="flex flex-col items-center bg-white/50 dark:bg-[#1F1D24]/50 border border-white/60 dark:border-[#49454F]/40 p-3.5 rounded-2xl min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6750A4] dark:text-[#D0BCFF] mb-2 block font-sans">Sexta-feira</span>
              <div className="flex -space-x-2.5 mb-1.5">
                {currentScale[nextWeekend.fridayStr]?.volunteers?.filter(id => !!id).length > 0 ? (
                  currentScale[nextWeekend.fridayStr].volunteers.map((vId, idx) => {
                    const name = getVolunteerName(vId);
                    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    const colorBg = idx === 0 ? 'bg-[#D0BCFF] dark:bg-[#381E72]' : 'bg-[#B69DF8] dark:bg-[#4F378B]';
                    return (
                      <div 
                        key={idx} 
                        className={`w-9 h-9 rounded-full border-2 border-white dark:border-[#1F1D24] ${colorBg} text-[#21005D] dark:text-[#EADDFF] flex items-center justify-center font-bold text-xs shadow-xs`}
                        title={name}
                      >
                        {initials}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#CAC4D0] dark:border-[#49454F] bg-gray-50 dark:bg-black/20 flex items-center justify-center text-gray-400 font-bold text-xs">
                    ?
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#1D1B20] dark:text-[#E6E1E5] text-center line-clamp-1 max-w-[110px]">
                {currentScale[nextWeekend.fridayStr]?.volunteers?.map(vId => getVolunteerName(vId).split(' ')[0]).join(' & ') || 'Nenhum'}
              </span>
              {currentScale[nextWeekend.fridayStr]?.volunteers?.length > 0 && (
                <button
                  id="btn-wa-next-fri"
                  onClick={() => sendDuoWhatsApp(nextWeekend!.fridayStr, true)}
                  className="mt-2 text-[10px] text-[#6750A4] dark:text-[#D0BCFF] font-bold flex items-center gap-1 bg-white dark:bg-[#2B2930] hover:bg-[#FEF7FF] dark:hover:bg-[#49454F] px-2.5 py-1 rounded-full border border-[#CAC4D0]/30 dark:border-[#49454F]/30 shadow-2xs transition-all"
                >
                  <MessageSquare size={10} />
                  Avisar
                </button>
              )}
            </div>

            {/* Saturday highlight */}
            <div className="flex flex-col items-center bg-[#F3EDF7] dark:bg-[#1C1B1F]/60 border border-[#CAC4D0]/30 dark:border-[#49454F]/30 p-3.5 rounded-2xl min-w-[140px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6750A4] dark:text-[#D0BCFF] mb-2 block font-sans">Sábado</span>
              <div className="flex -space-x-2.5 mb-1.5">
                {currentScale[nextWeekend.saturdayStr]?.volunteers?.filter(id => !!id).length > 0 ? (
                  currentScale[nextWeekend.saturdayStr].volunteers.map((vId, idx) => {
                    const name = getVolunteerName(vId);
                    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    const colorBg = idx === 0 ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72]' : 'bg-[#EADDFF] text-[#21005D] dark:bg-[#4F378B] dark:text-[#EADDFF]';
                    return (
                      <div 
                        key={idx} 
                        className={`w-9 h-9 rounded-full border-2 border-white dark:border-[#1F1D24] ${colorBg} flex items-center justify-center font-bold text-xs shadow-xs`}
                        title={name}
                      >
                        {initials}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#CAC4D0] dark:border-[#49454F] bg-gray-50 dark:bg-black/20 flex items-center justify-center text-gray-400 font-bold text-xs">
                    ?
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#1D1B20] dark:text-[#E6E1E5] text-center line-clamp-1 max-w-[110px]">
                {currentScale[nextWeekend.saturdayStr]?.volunteers?.map(vId => getVolunteerName(vId).split(' ')[0]).join(' & ') || 'Nenhum'}
              </span>
              {currentScale[nextWeekend.saturdayStr]?.volunteers?.length > 0 && (
                <button
                  id="btn-wa-next-sat"
                  onClick={() => sendDuoWhatsApp(nextWeekend!.saturdayStr, false)}
                  className="mt-2 text-[10px] text-[#6750A4] dark:text-[#D0BCFF] font-bold flex items-center gap-1 bg-white dark:bg-[#2B2930] hover:bg-[#FEF7FF] dark:hover:bg-[#49454F] px-2.5 py-1 rounded-full border border-[#CAC4D0]/30 dark:border-[#49454F]/30 shadow-2xs transition-all"
                >
                  <MessageSquare size={10} />
                  Avisar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Scale Control Panel */}
      <div className="bg-white dark:bg-[#1C1A22] border border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0EC] dark:border-[#49454F] pb-4">
          <div>
            <h3 className="font-bold text-lg text-[#1D1B20] dark:text-[#E6E1E5]">Tabela de Escalas Atribuídas</h3>
            <span className="text-xs text-[#79747E] dark:text-[#938F99] mt-0.5 block">
              Alocações e bloqueios automáticos para {MONTHS_PT[currentMonthIndex]}.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Clear button */}
            <button
              id="btn-clear-scale"
              onClick={() => {
                if (window.confirm("Deseja realmente limpar todas as escalas automáticas não bloqueadas deste mês?")) {
                  onClearScale();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#CAC4D0] dark:border-[#49454F] bg-white dark:bg-[#2B2930] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 text-[#49454F] dark:text-[#CAC4D0] rounded-full text-xs font-bold transition-all cursor-pointer"
              title="Limpar escala automática"
            >
              <Trash2 size={13} />
              <span>Limpar Escalas</span>
            </button>

            {/* Printable PDF Report button */}
            <button
              id="btn-open-report"
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#6750A4]/35 dark:border-[#D0BCFF]/35 bg-white dark:bg-[#2B2930] hover:bg-[#F3EDF7] dark:hover:bg-[#4F378B]/25 hover:border-[#6750A4] dark:hover:border-[#D0BCFF] text-[#6750A4] dark:text-[#D0BCFF] rounded-full text-xs font-bold transition-all cursor-pointer"
              title="Exportar escala mensal para um relatório PDF imprimível"
            >
              <Printer size={13} />
              <span>Relatório PDF</span>
            </button>

            {/* Smart generation trigger */}
            <button
              id="btn-generate-scale"
              onClick={onGenerateScale}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#6750A4] dark:bg-[#D0BCFF] hover:bg-[#533c8a] dark:hover:bg-[#B69DF8] hover:shadow-md text-white dark:text-[#381E72] rounded-full text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              title="Gerar escala inteligente"
            >
              <RefreshCw size={13} className="animate-spin-slow text-white dark:text-[#381E72]" />
              <span>Escala Automática</span>
            </button>
          </div>
        </div>

        {/* Warning banner if there are no active volunteers */}
        {activeVolunteers.length < 2 && (
          <div className="flex items-start gap-2.5 bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-900/45" id="warn-few-volunteers">
            <Info size={16} className="text-yellow-700 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong className="block mb-0.5">Voluntários insuficientes para gerar a escala automática!</strong>
              O algoritmo inteligente necessita de pelo menos 2 membros ativos marcados como disponíveis. Atualmente possui {activeVolunteers.length} ativo(s). Adicione ou ative novos voluntários no separador <strong>Equipa</strong>.
            </div>
          </div>
        )}

        {/* Weekends List */}
        <div className="space-y-6">
          {weekends.map((weekend, wCode) => {
            const days = [
              { dateStr: weekend.fridayStr, label: "Sexta-feira", isFriday: true },
              { dateStr: weekend.saturdayStr, label: "Sábado", isFriday: false }
            ];

            return (
              <div 
                key={wCode} 
                id={`weekend-block-${wCode}`} 
                className="bg-[#FEF7FF]/50 dark:bg-[#211F26]/10 border border-[#E7E0EC] dark:border-[#49454F]/70 rounded-[24px] p-5 hover:border-[#6750A4]/30 dark:hover:border-[#D0BCFF]/30 hover:shadow-2xs transition-all"
              >
                <div className="border-b border-[#E7E0EC] dark:border-[#49454F] pb-3 mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#21005D] dark:text-[#D0BCFF] flex items-center gap-2">
                    <Calendar size={15} className="text-[#6750A4] dark:text-[#D0BCFF]" />
                    Fim de Semana {wCode + 1}
                  </h4>
                  <span className="text-xs font-bold text-[#6750A4] dark:text-[#EADDFF] bg-[#EADDFF] dark:bg-[#4F378B] px-2.5 py-0.5 rounded-full">
                    {financeLabel(weekend)}
                  </span>
                </div>

                {/* Turn Layout - Friday and Saturday */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {days.map((day) => {
                    const turn = currentScale[day.dateStr] || { volunteers: [], locked: false };
                    const isLocked = turn.locked;

                    return (
                      <div 
                        key={day.dateStr}
                        id={`turn-card-${day.dateStr}`}
                        className={`border rounded-[20px] p-4 flex flex-col justify-between gap-4 transition-all hover:shadow-2xs ${
                          isLocked 
                            ? 'border-[#6750A4] dark:border-[#D0BCFF] bg-[#FEF7FF] dark:bg-[#25212C] ring-1 ring-[#6750A4]/15 dark:ring-[#D0BCFF]/15' 
                            : 'border-[#E7E0EC] dark:border-[#49454F] bg-white dark:bg-[#232128]'
                        }`}
                      >
                        {/* Title and Lock Button */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-[#6750A4] dark:text-[#D0BCFF]">
                              {day.label}
                            </span>
                            <h5 className="text-sm font-bold text-[#1D1B20] dark:text-[#E6E1E5] mt-0.5">
                              {formatDateLongPt(day.dateStr)}
                            </h5>
                          </div>

                          {/* Lock Trigger */}
                          <button
                            id={`btn-lock-turn-${day.dateStr}`}
                            onClick={() => onToggleLock(day.dateStr)}
                            title={isLocked ? "Desbloquear turno (Pode ser reescrito pela escala automática)" : "Bloquear turno (Protege esta escala de ser apagada no planeamento automático)"}
                            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                              isLocked 
                                ? 'bg-[#EADDFF] dark:bg-[#4F378B] border-[#6750A4] dark:border-[#D0BCFF] text-[#21005D] dark:text-[#EADDFF]' 
                                : 'bg-white dark:bg-[#2B2930] border-[#CAC4D0] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7] dark:hover:bg-[#49454F]/40'
                            }`}
                          >
                            {isLocked ? <Lock size={12} className="stroke-[2.5]" /> : <Unlock size={12} />}
                          </button>
                        </div>

                        {/* Volunteers Selection (Duo) */}
                        <div className="space-y-3 bg-[#F3EDF7] dark:bg-[#1C1824] p-3.5 rounded-xl border border-[#CAC4D0]/30 dark:border-[#49454F]/30">
                          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#49454F] dark:text-[#E6E1E5] block">
                            Par de Voluntários Escalado:
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Slot 1 Selection */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#625B71] dark:text-[#CAC4D0] uppercase tracking-wider block">Vaga 1</label>
                              <select
                                id={`select-vol-${day.dateStr}-0`}
                                value={turn.volunteers[0] || ""}
                                onChange={(e) => onSwapVolunteer(day.dateStr, 0, e.target.value)}
                                className="w-full bg-white dark:bg-[#2B2930] border border-[#79747E] dark:border-[#49454F] text-xs font-semibold text-[#1D1B20] dark:text-[#E6E1E5] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#6750A4]"
                              >
                                <option value="">(Vazio)</option>
                                {volunteers.map(vol => (
                                  <option key={vol.id} value={vol.id} className="dark:bg-[#2B2930]">
                                    {vol.name} {!vol.active ? " (Inativo)" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Slot 2 Selection */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[#625B71] dark:text-[#CAC4D0] uppercase tracking-wider block">Vaga 2</label>
                              <select
                                id={`select-vol-${day.dateStr}-1`}
                                value={turn.volunteers[1] || ""}
                                onChange={(e) => onSwapVolunteer(day.dateStr, 1, e.target.value)}
                                className="w-full bg-white dark:bg-[#2B2930] border border-[#79747E] dark:border-[#49454F] text-xs font-semibold text-[#1D1B20] dark:text-[#E6E1E5] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#6750A4]"
                              >
                                <option value="">(Vazio)</option>
                                {volunteers.map(vol => (
                                  <option key={vol.id} value={vol.id} className="dark:bg-[#2B2930]">
                                    {vol.name} {!vol.active ? " (Inativo)" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Turn footer notifications */}
                        <div className="flex items-center justify-between border-t border-[#E7E0EC] dark:border-[#49454F] pt-2 text-xs">
                          {isLocked ? (
                            <span className="flex items-center gap-1 text-xs text-[#6750A4] dark:text-[#D0BCFF] font-black">
                              <CheckCircle size={12} className="fill-[#6750A4] dark:fill-[#D0BCFF] text-white dark:text-[#381E72]" />
                              Escala Protegida
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-[#938F99] font-medium italic">Edição Livre</span>
                          )}

                          {turn.volunteers?.some(vId => !!vId) && (
                            <button
                              id={`btn-wa-turn-${day.dateStr}`}
                              onClick={() => sendDuoWhatsApp(day.dateStr, day.isFriday)}
                              className="flex items-center gap-1 text-[#6750A4] dark:text-[#D0BCFF] hover:text-[#21005D] dark:hover:text-[#EADDFF] font-bold transition-all cursor-pointer"
                            >
                              <MessageSquare size={12} />
                              Avisar Dupla
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {weekends.length === 0 && (
            <p className="text-center text-[#625B71] dark:text-[#CAC4D0] text-sm py-12 border border-dashed border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] bg-white dark:bg-[#1D1B24]">
              Nenhum fim de semana encontrado para este mês.
            </p>
          )}
        </div>
      </div>

      {/* Printable Report Modal Overlay */}
      <ScaleReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        volunteers={volunteers}
        weekends={weekends}
        currentScale={currentScale}
        currentYear={currentYear}
        currentMonthIndex={currentMonthIndex}
      />
    </div>
  );
}

// Custom text label helper
function financeLabel(weekend: ScheduledWeekend): string {
  const fD = weekend.fridayDate.getDate().toString().padStart(2, '0');
  const fM = (weekend.fridayDate.getMonth() + 1).toString().padStart(2, '0');
  const sD = weekend.saturdayDate.getDate().toString().padStart(2, '0');
  const sM = (weekend.saturdayDate.getMonth() + 1).toString().padStart(2, '0');
  return `Dates: ${fD}/${fM} & ${sD}/${sM}`;
}
