/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Volunteer, MonthlyScale, VolunteerAvailability } from './types';
import { getWeekendsOfMonth } from './utils/dateUtils';
import { generateAutomatedScale } from './utils/scheduler';
import { VolunteerManager } from './components/VolunteerManager';
import { AvailabilitySettings } from './components/AvailabilitySettings';
import { ScaleCalendar } from './components/ScaleCalendar';
import { 
  Calendar, 
  Users, 
  CheckSquare, 
  FileSpreadsheet, 
  Heart, 
  Info, 
  Sparkles,
  Award,
  Sun,
  Moon
} from 'lucide-react';

const LOCAL_STORAGE_VOLUNTEERS = 'escalarotativa_v1_volunteers';
const LOCAL_STORAGE_SCALE = 'escalarotativa_v1_scale';
const LOCAL_STORAGE_AVAILABILITY = 'escalarotativa_v1_availability';
const LOCAL_STORAGE_DARKMODE = 'escalarotativa_v1_darkmode';

const DEFAULT_VOLUNTEERS: Volunteer[] = [
  { id: 'vol-1', name: 'Ana Silva', phone: '912345678', active: true },
  { id: 'vol-2', name: 'Carlos Santos', phone: '923456789', active: true },
  { id: 'vol-3', name: 'Mariana Sousa', phone: '934567890', active: true },
  { id: 'vol-4', name: 'Bruno Costa', phone: '965432109', active: true },
  { id: 'vol-5', name: 'Juliana Oliveira', phone: '918765432', active: true },
  { id: 'vol-6', name: 'Pedro Alves', phone: '929876543', active: true },
  { id: 'vol-7', name: 'Lucas Mendes', phone: '931234567', active: true },
  { id: 'vol-8', name: 'Camila Lima', phone: '961234567', active: false } // starts inactive
];

export default function App() {
  const currentYear = 2026;
  const [currentMonthIndex, setCurrentMonthIndex] = useState(4); // Default to May 2026 (index 4)
  const [activeTab, setActiveTab] = useState<'escala' | 'equipe' | 'disponibilidades'>('escala');
  
  // 0. STATE - DARK MODE
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_DARKMODE);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to root document element
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_DARKMODE, JSON.stringify(isDarkMode));
    } catch (e) {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Hardcode constant today within year 2026 context
  const todayDate = useMemo(() => new Date(2026, 4, 26, 12, 0, 0), []);

  // 1. STATE - VOLUNTEERS
  const [volunteers, setVolunteers] = useState<Volunteer[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VOLUNTEERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Erro lendo localStorage para voluntários", e);
    }
    return DEFAULT_VOLUNTEERS;
  });

  // 2. STATE - ROTATION SCALE
  const [scale, setScale] = useState<MonthlyScale>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SCALE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Erro lendo localStorage para escala", e);
    }
    return {};
  });

  // 3. STATE - AVAILABILITY
  const [availability, setAvailability] = useState<VolunteerAvailability>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AVAILABILITY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Erro lendo localStorage para disponibilidade", e);
    }
    return {};
  });

  // Persist states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_VOLUNTEERS, JSON.stringify(volunteers));
  }, [volunteers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SCALE, JSON.stringify(scale));
  }, [scale]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_AVAILABILITY, JSON.stringify(availability));
  }, [availability]);

  // Recalculate weekends whenever month change
  const currentWeekends = useMemo(() => {
    return getWeekendsOfMonth(currentYear, currentMonthIndex);
  }, [currentMonthIndex]);

  // Pre-generate a nice initial schedule on absolute first-time mount
  useEffect(() => {
    const isFirstTime = !localStorage.getItem(LOCAL_STORAGE_SCALE);
    if (isFirstTime && volunteers.length > 0) {
      const autoMay = generateAutomatedScale(
        volunteers.filter(v => v.active),
        getWeekendsOfMonth(2026, 4), // May
        {},
        {}
      );
      const autoJune = generateAutomatedScale(
        volunteers.filter(v => v.active),
        getWeekendsOfMonth(2026, 5), // June
        autoMay,
        {}
      );
      setScale(autoJune);
    }
  }, []);

  // MONTH NAVIGATION HANDLERS
  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 11 ? 0 : prev + 1));
  };

  const handleMonthSelect = (idx: number) => {
    setCurrentMonthIndex(idx);
  };

  // 1. VOLUNTEERS MUTATIONS
  const handleAddVolunteer = (name: string, phone: string, active: boolean) => {
    const newVol: Volunteer = {
      id: `vol-${Date.now()}`,
      name,
      phone,
      active
    };
    setVolunteers(prev => [...prev, newVol]);
  };

  const handleEditVolunteer = (id: string, name: string, phone: string, active: boolean) => {
    setVolunteers(prev => prev.map(vol => {
      if (vol.id === id) {
        return { ...vol, name, phone, active };
      }
      return vol;
    }));
  };

  const handleDeleteVolunteer = (id: string) => {
    setVolunteers(prev => prev.filter(vol => vol.id !== id));
    
    // Clear associations in scale
    setScale(prev => {
      const updated = { ...prev };
      for (const dStr of Object.keys(updated)) {
        updated[dStr] = {
          ...updated[dStr],
          volunteers: updated[dStr].volunteers.filter(vId => vId !== id)
        };
      }
      return updated;
    });
  };

  const handleToggleActive = (id: string) => {
    setVolunteers(prev => prev.map(vol => {
      if (vol.id === id) {
        return { ...vol, active: !vol.active };
      }
      return vol;
    }));
  };

  // 2. AVAILABILITY MUTATIONS
  const handleUpdateAvailability = (volunteerId: string, dateStr: string, isAvailable: boolean) => {
    setAvailability(prev => {
      const volMap = prev[volunteerId] || {};
      return {
        ...prev,
        [volunteerId]: {
          ...volMap,
          [dateStr]: isAvailable
        }
      };
    });
  };

  const handleSetBulkAvailability = (volunteerId: string, dates: string[], isAvailable: boolean) => {
    setAvailability(prev => {
      const volMap = { ...(prev[volunteerId] || {}) };
      for (const dateStr of dates) {
        volMap[dateStr] = isAvailable;
      }
      return {
        ...prev,
        [volunteerId]: volMap
      };
    });
  };

  // 3. SCALE CALENDAR MUTATIONS
  const handleGenerateScale = () => {
    const activeVols = volunteers.filter(v => v.active);
    if (activeVols.length === 0) {
      alert("Nenhum voluntário ativo registado. Registe e ative membros para gerar escalas!");
      return;
    }
    
    const updatedScale = generateAutomatedScale(
      activeVols,
      currentWeekends,
      scale,
      availability
    );
    setScale(updatedScale);
  };

  const handleClearScale = () => {
    // Empty ALL slot allocations of current month weekends that are NOT locked!
    setScale(prev => {
      const cleaned = { ...prev };
      for (const w of currentWeekends) {
        if (!cleaned[w.fridayStr]?.locked) {
          cleaned[w.fridayStr] = { volunteers: [], locked: false };
        }
        if (!cleaned[w.saturdayStr]?.locked) {
          cleaned[w.saturdayStr] = { volunteers: [], locked: false };
        }
      }
      return cleaned;
    });
  };

  const handleToggleLock = (dateStr: string) => {
    setScale(prev => {
      const turn = prev[dateStr] || { volunteers: [], locked: false };
      return {
        ...prev,
        [dateStr]: {
          ...turn,
          locked: !turn.locked
        }
      };
    });
  };

  const handleSwapVolunteer = (dateStr: string, slotIndex: number, volunteerId: string) => {
    setScale(prev => {
      const turn = prev[dateStr] || { volunteers: [], locked: false };
      const currentVolunteers = [...(turn.volunteers || [])];
      
      // Pad Array to make sure target slotIndex exists
      while (currentVolunteers.length <= slotIndex) {
        currentVolunteers.push("");
      }
      
      currentVolunteers[slotIndex] = volunteerId;
      
      // Filter out trailing blanks to keep state clean, but maintain structure
      return {
        ...prev,
        [dateStr]: {
          ...turn,
          volunteers: currentVolunteers
        }
      };
    });
  };

  // QUICK STATS summary for current month
  const currentMonthStats = useMemo(() => {
    const activeCount = volunteers.filter(v => v.active).length;
    
    // Count assigned shifts this month
    let totalAssignments = 0;
    let lockedTurnsCount = 0;
    const currentMonthDates = new Set<string>();
    for (const w of currentWeekends) {
      currentMonthDates.add(w.fridayStr);
      currentMonthDates.add(w.saturdayStr);
    }

    for (const dStr of Object.keys(scale)) {
      if (currentMonthDates.has(dStr)) {
        totalAssignments += (scale[dStr]?.volunteers?.filter(id => !!id).length || 0);
        if (scale[dStr]?.locked) {
          lockedTurnsCount++;
        }
      }
    }

    const totalPossibleSlots = currentWeekends.length * 4; // 2 days * 2 slots = 4 slots per weekend
    const coveragePercent = totalPossibleSlots > 0 
      ? Math.round((totalAssignments / totalPossibleSlots) * 100) 
      : 0;

    return {
      activeCount,
      totalAssignments,
      coveragePercent,
      lockedTurnsCount
    };
  }, [volunteers, scale, currentWeekends]);

  return (
    <div className="min-h-screen bg-[#FEF7FF] text-[#1D1B20] dark:bg-[#141218] dark:text-[#E6E1E5] flex flex-col pb-24 md:pb-6" id="app-root-container">
      {/* Visual top bar header - Desktop Version styled as material 3 Sleek top bar */}
      <header className="bg-[#F7F2FA] dark:bg-[#1F1D24] border-b border-[#CAC4D0] dark:border-[#49454F] py-4 px-6 sticky top-0 z-40 hidden md:block shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6750A4] dark:bg-[#D0BCFF] rounded-xl flex items-center justify-center text-white dark:text-[#381E72] font-extrabold text-lg shadow-sm">
              ER
            </div>
            <div>
              <h1 className="text-xl font-black text-[#6750A4] dark:text-[#D0BCFF] tracking-tight">Escala Rotativa</h1>
              <p className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] tracking-widest uppercase font-black">
                Gestão Equitativa de Voluntariado — 2026
              </p>
            </div>
          </div>

          {/* Desktop tabs buttons and theme switcher wrapper */}
          <div className="flex items-center">
            <div className="flex bg-white dark:bg-[#2B2930] border border-[#CAC4D0] dark:border-[#49454F] p-1.5 rounded-full shadow-2xs">
              <button
                id="top-tab-escala"
                onClick={() => setActiveTab('escala')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'escala'
                    ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72] shadow-sm'
                    : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7]/80 dark:hover:bg-[#49454F]/50'
                }`}
              >
                <Calendar size={14} />
                Calendário de Escala
              </button>
              <button
                id="top-tab-equipe"
                onClick={() => setActiveTab('equipe')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'equipe'
                    ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72] shadow-sm'
                    : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7]/80 dark:hover:bg-[#49454F]/50'
                }`}
              >
                <Users size={14} />
                Equipa (Membros)
              </button>
              <button
                id="top-tab-disponibilidades"
                onClick={() => setActiveTab('disponibilidades')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'disponibilidades'
                    ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72] shadow-sm'
                    : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#F3EDF7]/80 dark:hover:bg-[#49454F]/50'
                }`}
              >
                <CheckSquare size={14} />
                Disponibilidade
              </button>
            </div>

            {/* Desktop Dark Mode toggle button */}
            <button
              id="btn-dark-mode-desktop"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-2.5 ml-4 bg-white dark:bg-[#2B2930] hover:bg-[#F3EDF7] dark:hover:bg-[#49454F] border border-[#CAC4D0] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] rounded-full transition-all shadow-xs cursor-pointer"
              title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Brand header on mobile layout with stats wrapper */}
      <div className="md:hidden bg-[#F7F2FA] dark:bg-[#1F1D24] border-b border-[#CAC4D0] dark:border-[#49454F] px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#6750A4] dark:bg-[#D0BCFF] rounded-xl flex items-center justify-center text-white dark:text-[#381E72] font-black text-sm">
            ER
          </div>
          <div>
            <h1 className="font-bold text-[#6750A4] dark:text-[#D0BCFF] text-base leading-tight">Escala Rotativa</h1>
            <span className="text-[9px] text-[#49454F] dark:text-[#CAC4D0] uppercase tracking-wider block font-bold">Voluntariado 2026</span>
          </div>
        </div>

        {/* Mobile Dark Mode Toggle */}
        <button
          id="btn-dark-mode-mobile"
          onClick={() => setIsDarkMode(prev => !prev)}
          className="p-2 bg-white dark:bg-[#2B2930] hover:bg-[#F3EDF7] dark:hover:bg-[#49454F] border border-[#CAC4D0] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] rounded-full transition-all cursor-pointer"
          title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      {/* Main Container Content */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex-1 space-y-6">
        
        {/* Quick Bento Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" id="stats-bento-grid">
          {/* Active stats */}
          <div className="bg-[#F3EDF7] dark:bg-[#1C1B1F] border border-[#CAC4D0]/60 dark:border-[#49454F]/50 p-4 rounded-[24px] flex items-center gap-3 hover:shadow-2xs dark:hover:shadow-xs transition-all">
            <div className="w-10 h-10 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] rounded-full flex items-center justify-center shrink-0">
              <Users size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] font-bold uppercase tracking-wider block">Ativos</span>
              <span className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5]">{currentMonthStats.activeCount} de {volunteers.length}</span>
            </div>
          </div>

          {/* Scale Coverage */}
          <div className="bg-[#F3EDF7] dark:bg-[#1C1B1F] border border-[#CAC4D0]/60 dark:border-[#49454F]/50 p-4 rounded-[24px] flex items-center gap-3 hover:shadow-2xs dark:hover:shadow-xs transition-all">
            <div className="w-10 h-10 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] rounded-full flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] font-bold uppercase tracking-wider block">Cobertura</span>
              <span className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5]">{currentMonthStats.coveragePercent}%</span>
            </div>
          </div>

          {/* Assigned slots counters */}
          <div className="bg-[#F3EDF7] dark:bg-[#1C1B1F] border border-[#CAC4D0]/60 dark:border-[#49454F]/50 p-4 rounded-[24px] flex items-center gap-3 col-span-1 hover:shadow-2xs dark:hover:shadow-xs transition-all">
            <div className="w-10 h-10 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] rounded-full flex items-center justify-center shrink-0">
              <Award size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] font-bold uppercase tracking-wider block">Ocupados</span>
              <span className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5]">{currentMonthStats.totalAssignments} vagas</span>
            </div>
          </div>

          {/* Locked counts */}
          <div className="bg-[#F3EDF7] dark:bg-[#1C1B1F] border border-[#CAC4D0]/60 dark:border-[#49454F]/50 p-4 rounded-[24px] flex items-center gap-3 col-span-1 hover:shadow-2xs dark:hover:shadow-xs transition-all">
            <div className="w-10 h-10 bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF] rounded-full flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-[#6750A4] dark:text-[#D0BCFF] stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] font-bold uppercase tracking-wider block">Protegidos</span>
              <span className="text-base font-black text-[#1D1B20] dark:text-[#E6E1E5]">{currentMonthStats.lockedTurnsCount} turnos</span>
            </div>
          </div>
        </div>

        {/* Dynamic Route/Tab Display and Transitions */}
        <div className="transition-all duration-300">
          {activeTab === 'escala' && (
            <ScaleCalendar
              volunteers={volunteers}
              weekends={currentWeekends}
              currentScale={scale}
              currentYear={currentYear}
              currentMonthIndex={currentMonthIndex}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onMonthSelect={handleMonthSelect}
              onGenerateScale={handleGenerateScale}
              onClearScale={handleClearScale}
              onToggleLock={handleToggleLock}
              onSwapVolunteer={handleSwapVolunteer}
              todayDate={todayDate}
            />
          )}

          {activeTab === 'equipe' && (
            <VolunteerManager
              volunteers={volunteers}
              scale={scale}
              currentWeekends={currentWeekends}
              onAddVolunteer={handleAddVolunteer}
              onEditVolunteer={handleEditVolunteer}
              onDeleteVolunteer={handleDeleteVolunteer}
              onToggleActive={handleToggleActive}
            />
          )}

          {activeTab === 'disponibilidades' && (
            <AvailabilitySettings
              volunteers={volunteers}
              weekends={currentWeekends}
              currentMonthIndex={currentMonthIndex}
              currentYear={currentYear}
              availability={availability}
              onUpdateAvailability={handleUpdateAvailability}
              onSetBulkAvailability={handleSetBulkAvailability}
            />
          )}
        </div>
      </main>

      {/* Floating Bottom Navigator Bar for Mobile ergonomics */}
      <nav 
        id="floating-bottom-navigation"
        className="fixed bottom-4 left-4 right-4 bg-white/95 dark:bg-[#1F1D24]/95 backdrop-blur-md border border-[#CAC4D0] dark:border-[#49454F] py-2 px-3 rounded-full shadow-md z-50 flex items-center justify-around md:hidden"
      >
        <button
          id="mobile-tab-escala"
          onClick={() => setActiveTab('escala')}
          className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'escala'
              ? 'bg-[#EADDFF] text-[#21005D] dark:bg-[#4F378B] dark:text-[#EADDFF] font-bold shadow-2xs'
              : 'text-[#49454F] dark:text-[#CAC4D0]'
          }`}
        >
          <Calendar size={16} />
          <span className="text-[10px] mt-0.5 font-bold">Escala</span>
        </button>

        <button
          id="mobile-tab-equipe"
          onClick={() => setActiveTab('equipe')}
          className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'equipe'
              ? 'bg-[#EADDFF] text-[#21005D] dark:bg-[#4F378B] dark:text-[#EADDFF] font-bold shadow-2xs'
              : 'text-[#49454F] dark:text-[#CAC4D0]'
          }`}
        >
          <Users size={16} />
          <span className="text-[10px] mt-0.5 font-bold">Equipa</span>
        </button>

        <button
          id="mobile-tab-disponibilidades"
          onClick={() => setActiveTab('disponibilidades')}
          className={`flex flex-col items-center justify-center w-20 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'disponibilidades'
              ? 'bg-[#EADDFF] text-[#21005D] dark:bg-[#4F378B] dark:text-[#EADDFF] font-bold shadow-2xs'
              : 'text-[#49454F] dark:text-[#CAC4D0]'
          }`}
        >
          <CheckSquare size={16} />
          <span className="text-[10px] mt-0.5 font-bold">Disp.</span>
        </button>
      </nav>

      {/* Footer credits conforming to humble literal rules & spacing */}
      <footer className="w-full text-center py-6 text-xs text-[#79747E] dark:text-[#938F99]" id="app-footer-credits">
        <p className="flex items-center justify-center gap-1.5">
          <span className="font-bold">Escala Rotativa © 2026</span>
          <span>•</span>
          <span>Feito com</span>
          <Heart size={10} className="text-red-500 fill-red-500 shrink-0" />
          <span>para uma gestão justa</span>
        </p>
      </footer>
    </div>
  );
}
