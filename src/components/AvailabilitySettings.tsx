/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volunteer, VolunteerAvailability, ScheduledWeekend } from '../types';
import { formatDateShortPt, MONTHS_PT } from '../utils/dateUtils';
import { UserCheck, Calendar, CheckSquare, Square, Check, X, Info } from 'lucide-react';

interface AvailabilitySettingsProps {
  volunteers: Volunteer[];
  weekends: ScheduledWeekend[];
  currentMonthIndex: number;
  currentYear: number;
  availability: VolunteerAvailability;
  onUpdateAvailability: (volunteerId: string, dateStr: string, isAvailable: boolean) => void;
  onSetBulkAvailability: (volunteerId: string, dates: string[], isAvailable: boolean) => void;
}

export function AvailabilitySettings({
  volunteers,
  weekends,
  currentMonthIndex,
  currentYear,
  availability,
  onUpdateAvailability,
  onSetBulkAvailability
}: AvailabilitySettingsProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>(
    volunteers.length > 0 ? volunteers[0].id : ''
  );

  const activeVolunteers = volunteers.filter(v => v.active);

  // Auto-select first active volunteer if none is selected
  React.useEffect(() => {
    if (activeVolunteers.length > 0 && (!selectedVolunteerId || !activeVolunteers.some(v => v.id === selectedVolunteerId))) {
      setSelectedVolunteerId(activeVolunteers[0].id);
    }
  }, [volunteers, selectedVolunteerId, activeVolunteers]);

  const selectedVolunteer = volunteers.find(v => v.id === selectedVolunteerId);

  // Build a list of all individual days for the weekends of this month
  const allDateStrings: string[] = [];
  for (const w of weekends) {
    allDateStrings.push(w.fridayStr);
    allDateStrings.push(w.saturdayStr);
  }

  // Get availability value with default true
  const getIsAvailable = (vId: string, dateStr: string) => {
    const volAvail = availability[vId];
    if (volAvail === undefined) return true;
    return volAvail[dateStr] !== false;
  };

  const handleBulkSetAll = (vId: string, available: boolean) => {
    onSetBulkAvailability(vId, allDateStrings, available);
  };

  return (
    <div className="space-y-6" id="availability-container">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#21005D] dark:text-[#EADDFF]">Disponibilidade Mensal</h2>
        <p className="text-sm text-[#79747E] dark:text-[#938F99]">
          Selecione os fins de semana de <strong>{MONTHS_PT[currentMonthIndex]} {currentYear}</strong> em que cada voluntário está disponível.
        </p>
      </div>

      {activeVolunteers.length === 0 ? (
        <div className="bg-[#FEF7FF] dark:bg-[#1C1824] border border-dashed border-[#CAC4D0] dark:border-[#49454F] p-10 text-center rounded-[28px]" id="avail-no-volunteers">
          <Info className="mx-auto text-[#6750A4] dark:text-[#D0BCFF] mb-2" size={24} />
          <p className="text-[#1D1B20] dark:text-[#E6E1E5] font-bold">Nenhum voluntário marcado como ativo.</p>
          <p className="text-xs text-[#79747E] dark:text-[#938F99] mt-1.5">
            Ative ou adicione membros no separador <strong>"Equipa"</strong> primeiro! Apenas voluntários ativos entram nas escalas e têm disponibilidades configuráveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="avail-layout-grid">
          {/* Volunteer Selector List (Sidebar on desktop) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="block text-xs font-black text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-widest">
              Membros Ativos ({activeVolunteers.length})
            </span>
            <div className="space-y-1.5 max-h-[385px] overflow-y-auto pr-1">
              {activeVolunteers.map(vol => {
                const isSelected = vol.id === selectedVolunteerId;
                // Calculate how many available days this volunteer has this month
                const availableCount = allDateStrings.filter(d => getIsAvailable(vol.id, d)).length;
                
                return (
                  <button
                    key={vol.id}
                    id={`btn-select-vol-avail-${vol.id}`}
                    onClick={() => setSelectedVolunteerId(vol.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EADDFF] dark:bg-[#4F378B] border-[#6750A4] dark:border-[#D0BCFF] text-[#21005D] dark:text-[#EADDFF] shadow-xs font-bold'
                        : 'bg-white dark:bg-[#1D1B24] border-[#E7E0EC] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7]/50 dark:hover:bg-[#4F378B]/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck size={15} className={isSelected ? 'text-[#6750A4] dark:text-[#D0BCFF]' : 'text-[#79747E] dark:text-[#938F99]'} />
                      <span className="text-sm line-clamp-1">{vol.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white/85 dark:bg-[#2B2930] px-2.5 py-0.5 rounded-full border border-black/5 dark:border-white/5 text-[#21005D] dark:text-[#EADDFF]">
                      {availableCount}/{allDateStrings.length} dias
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Volunteer Calendar Checklist */}
          {selectedVolunteer && (
            <div className="lg:col-span-8 bg-white dark:bg-[#1C1A22] border border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0EC] dark:border-[#49454F] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1D1B20] dark:text-[#E6E1E5]">
                    Agenda de {selectedVolunteer.name}
                  </h3>
                  <span className="text-xs text-[#79747E] dark:text-[#938F99] mt-0.5 block">
                    Defina abaixo quando o voluntário poderá ser escalado.
                  </span>
                </div>

                {/* Bulk actions */}
                <div className="flex items-center gap-2">
                  <button
                    id="btn-avail-all-active"
                    onClick={() => handleBulkSetAll(selectedVolunteer.id, true)}
                    className="flex items-center gap-1 text-xs border border-[#6750A4] dark:border-[#D0BCFF] bg-white dark:bg-[#2B2930] text-[#6750A4] dark:text-[#D0BCFF] hover:bg-[#EADDFF] dark:hover:bg-[#4F378B]/30 px-3.5 py-1.5 rounded-full transition-all font-bold cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <button
                    id="btn-avail-all-inactive"
                    onClick={() => handleBulkSetAll(selectedVolunteer.id, false)}
                    className="flex items-center gap-1 text-xs border border-[#CAC4D0] dark:border-[#49454F] bg-white dark:bg-[#2B2930] text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7] dark:hover:bg-[#4F378B]/10 px-3.5 py-1.5 rounded-full transition-all font-semibold cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Informative banner styled with Material 3 context */}
              <div className="flex items-start gap-2.5 bg-[#FEF7FF] dark:bg-[#25212C] p-4 rounded-xl border border-[#CAC4D0]/40 dark:border-[#49454F]/30">
                <Info size={14} className="text-[#6750A4] dark:text-[#D0BCFF] shrink-0 mt-0.5" />
                <p className="text-xs text-[#21005D] dark:text-[#EADDFF]">
                  Por predefinição, todos começam como <strong>Disponível</strong>. Dias desmarcados impedem o algoritmo local de os escalar para cobrir cada data.
                </p>
              </div>

              {/* Weekends Checklist */}
              <div className="space-y-4">
                {weekends.map((weekend, idx) => {
                  const isFridayAvailable = getIsAvailable(selectedVolunteer.id, weekend.fridayStr);
                  const isSaturdayAvailable = getIsAvailable(selectedVolunteer.id, weekend.saturdayStr);

                  return (
                    <div
                      key={idx}
                      className="border border-[#E7E0EC] dark:border-[#49454F]/70 rounded-2xl p-4 hover:bg-[#FEF7FF]/50 dark:hover:bg-[#25212C]/20 transition-all bg-white dark:bg-[#232128]"
                    >
                      <h4 className="text-[10px] font-black text-[#6750A4] dark:text-[#D0BCFF] mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                        <Calendar size={12} />
                        Fim de Semana {idx + 1}
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Friday Button */}
                        <button
                          id={`btn-toggle-avail-${selectedVolunteer.id}-${weekend.fridayStr}`}
                          type="button"
                          onClick={() => onUpdateAvailability(selectedVolunteer.id, weekend.fridayStr, !isFridayAvailable)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isFridayAvailable
                              ? 'bg-[#EADDFF]/40 dark:bg-[#4F378B]/30 border-[#6750A4]/40 dark:border-[#D0BCFF]/40 text-[#21005D] dark:text-[#EADDFF] hover:bg-[#EADDFF]/65 dark:hover:bg-[#4F378B]/50'
                              : 'bg-gray-50 dark:bg-[#1D1B24] border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-[#79747E] dark:text-[#938F99] font-bold block uppercase tracking-wider">Sexta-feira</span>
                            <span className="text-xs font-bold text-[#1D1B20] dark:text-[#E6E1E5]">{formatDateShortPt(weekend.fridayStr)}</span>
                          </div>
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border transition-all ${
                            isFridayAvailable 
                              ? 'bg-[#6750A4] dark:bg-[#D0BCFF] border-[#6750A4] dark:border-[#D0BCFF] text-white dark:text-[#381E72]' 
                              : 'bg-white dark:bg-[#2B2930] border-gray-300 dark:border-gray-650 text-transparent'
                          }`}>
                            <Check size={11} className="stroke-[3]" />
                          </div>
                        </button>

                        {/* Saturday Button */}
                        <button
                          id={`btn-toggle-avail-${selectedVolunteer.id}-${weekend.saturdayStr}`}
                          type="button"
                          onClick={() => onUpdateAvailability(selectedVolunteer.id, weekend.saturdayStr, !isSaturdayAvailable)}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSaturdayAvailable
                              ? 'bg-[#EADDFF]/40 dark:bg-[#4F378B]/30 border-[#6750A4]/40 dark:border-[#D0BCFF]/40 text-[#21005D] dark:text-[#EADDFF] hover:bg-[#EADDFF]/65 dark:hover:bg-[#4F378B]/50'
                              : 'bg-gray-50 dark:bg-[#1D1B24] border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-[#79747E] dark:text-[#938F99] font-bold block uppercase tracking-wider">Sábado</span>
                            <span className="text-xs font-bold text-[#1D1B20] dark:text-[#E6E1E5]">{formatDateShortPt(weekend.saturdayStr)}</span>
                          </div>
                          <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center border transition-all ${
                            isSaturdayAvailable 
                              ? 'bg-[#6750A4] dark:bg-[#D0BCFF] border-[#6750A4] dark:border-[#D0BCFF] text-white dark:text-[#381E72]' 
                              : 'bg-white dark:bg-[#2B2930] border-gray-300 dark:border-gray-650 text-transparent'
                          }`}>
                            <Check size={11} className="stroke-[3]" />
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
