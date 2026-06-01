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
  Moon,
  LogOut,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, isFirebaseConfigured } from './lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const LOCAL_STORAGE_DARKMODE = 'escalarotativa_v1_darkmode';
const LOCAL_STORAGE_AUTH = 'escalarotativa_v1_auth';
const OFFLINE_VOLUNTEERS_KEY = 'escalarotativa_v1_offline_volunteers';
const OFFLINE_SCALE_KEY = 'escalarotativa_v1_offline_scale';
const OFFLINE_AVAILABILITY_KEY = 'escalarotativa_v1_offline_availability';

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
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'escala' | 'equipe' | 'disponibilidades'>('escala');
  
  // 0.0. STATE - AUTHENTICATION GATED SYSTEM
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUTH);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return false;
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const VALID_PASSWORDS = ['escala2026', 'escala', 'membros2026', 'membros'];
    const cleanPass = passwordInput.trim().toLowerCase();
    
    if (VALID_PASSWORDS.includes(cleanPass)) {
      try {
        localStorage.setItem(LOCAL_STORAGE_AUTH, JSON.stringify(true));
      } catch (err) {}
      setIsAuthenticated(true);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Palavra-passe de acesso inválida ou incorreta.');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente terminar a sua sessão?')) {
      setIsAuthenticated(false);
      try {
        localStorage.removeItem(LOCAL_STORAGE_AUTH);
      } catch (err) {}
    }
  };

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

  // Use current real date dynamically
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  // 1. STATE - VOLUNTEERS
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  // 2. STATE - ROTATION SCALE
  const [scale, setScale] = useState<MonthlyScale>({});

  // 3. STATE - AVAILABILITY
  const [availability, setAvailability] = useState<VolunteerAvailability>({});

  // Live Firebase Synchronizations
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) return;

    const unsubscribe = onSnapshot(
      collection(db, 'volunteers'),
      async (snapshot) => {
        const volsList: Volunteer[] = [];
        snapshot.forEach((docSnap) => {
          volsList.push({ id: docSnap.id, ...docSnap.data() } as Volunteer);
        });

        // Seed with default volunteers if completely empty
        if (volsList.length === 0) {
          try {
            const promises = DEFAULT_VOLUNTEERS.map(v => 
              setDoc(doc(db, 'volunteers', v.id), {
                name: v.name,
                phone: v.phone,
                active: v.active
              })
            );
            await Promise.all(promises);
          } catch (err) {
            console.error("Erro ao semear voluntários padrão:", err);
          }
        } else {
          // Sort alphabetically by name
          volsList.sort((a, b) => a.name.localeCompare(b.name));
          setVolunteers(volsList);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'volunteers');
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) return;

    const unsubscribe = onSnapshot(
      collection(db, 'availability'),
      (snapshot) => {
        const availMap: VolunteerAvailability = {};
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          availMap[docSnap.id] = docData.dates || {};
        });
        setAvailability(availMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'availability');
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured) return;

    const unsubscribe = onSnapshot(
      collection(db, 'scale'),
      (snapshot) => {
        const scaleMap: MonthlyScale = {};
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          scaleMap[docSnap.id] = {
            volunteers: docData.volunteers || [],
            locked: docData.locked || false
          };
        });
        setScale(scaleMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'scale');
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Local Offline State Initialization Fallback
  useEffect(() => {
    if (!isAuthenticated || isFirebaseConfigured) return;

    try {
      const storedVols = localStorage.getItem(OFFLINE_VOLUNTEERS_KEY);
      if (storedVols) {
        setVolunteers(JSON.parse(storedVols));
      } else {
        localStorage.setItem(OFFLINE_VOLUNTEERS_KEY, JSON.stringify(DEFAULT_VOLUNTEERS));
        setVolunteers(DEFAULT_VOLUNTEERS);
      }

      const storedScale = localStorage.getItem(OFFLINE_SCALE_KEY);
      if (storedScale) {
        setScale(JSON.parse(storedScale));
      } else {
        setScale({});
      }

      const storedAvail = localStorage.getItem(OFFLINE_AVAILABILITY_KEY);
      if (storedAvail) {
        setAvailability(JSON.parse(storedAvail));
      } else {
        setAvailability({});
      }
    } catch (e) {
      console.error("Local storage initialization failed:", e);
    }
  }, [isAuthenticated]);

  // Recalculate weekends whenever month or year change
  const currentWeekends = useMemo(() => {
    return getWeekendsOfMonth(currentYear, currentMonthIndex);
  }, [currentMonthIndex, currentYear]);

  // MONTH NAVIGATION HANDLERS
  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => {
      if (prev === 0) {
        setCurrentYear((yr) => yr - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => {
      if (prev === 11) {
        setCurrentYear((yr) => yr + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleMonthSelect = (idx: number) => {
    setCurrentMonthIndex(idx);
  };

  // 1. VOLUNTEERS MUTATIONS
  const handleAddVolunteer = async (name: string, phone: string, active: boolean) => {
    const id = `vol-${Date.now()}`;
    if (!isFirebaseConfigured) {
      const updated = [...volunteers, { id, name, phone, active }];
      updated.sort((a, b) => a.name.localeCompare(b.name));
      setVolunteers(updated);
      localStorage.setItem(OFFLINE_VOLUNTEERS_KEY, JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, 'volunteers', id), { name, phone, active });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `volunteers/${id}`);
    }
  };

  const handleEditVolunteer = async (id: string, name: string, phone: string, active: boolean) => {
    if (!isFirebaseConfigured) {
      const updated = volunteers.map(v => v.id === id ? { id, name, phone, active } : v);
      updated.sort((a, b) => a.name.localeCompare(b.name));
      setVolunteers(updated);
      localStorage.setItem(OFFLINE_VOLUNTEERS_KEY, JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, 'volunteers', id), { name, phone, active });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `volunteers/${id}`);
    }
  };

  const handleDeleteVolunteer = async (id: string) => {
    if (!isFirebaseConfigured) {
      const updatedVols = volunteers.filter(v => v.id !== id);
      setVolunteers(updatedVols);
      localStorage.setItem(OFFLINE_VOLUNTEERS_KEY, JSON.stringify(updatedVols));

      const updatedAvail = { ...availability };
      delete updatedAvail[id];
      setAvailability(updatedAvail);
      localStorage.setItem(OFFLINE_AVAILABILITY_KEY, JSON.stringify(updatedAvail));
      return;
    }
    try {
      await deleteDoc(doc(db, 'volunteers', id));
      await deleteDoc(doc(db, 'availability', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `volunteers/${id}`);
    }
  };

  const handleToggleActive = async (id: string) => {
    const target = volunteers.find(v => v.id === id);
    if (target) {
      if (!isFirebaseConfigured) {
        const updated = volunteers.map(v => v.id === id ? { ...v, active: !v.active } : v);
        setVolunteers(updated);
        localStorage.setItem(OFFLINE_VOLUNTEERS_KEY, JSON.stringify(updated));
        return;
      }
      try {
        await setDoc(doc(db, 'volunteers', id), {
          name: target.name,
          phone: target.phone,
          active: !target.active
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `volunteers/${id}`);
      }
    }
  };

  // 2. AVAILABILITY MUTATIONS
  const handleUpdateAvailability = async (volunteerId: string, dateStr: string, isAvailable: boolean) => {
    const volMap = availability[volunteerId] || {};
    const newDates = { ...volMap, [dateStr]: isAvailable };
    if (!isFirebaseConfigured) {
      const updated = { ...availability, [volunteerId]: newDates };
      setAvailability(updated);
      localStorage.setItem(OFFLINE_AVAILABILITY_KEY, JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, 'availability', volunteerId), { dates: newDates });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `availability/${volunteerId}`);
    }
  };

  const handleSetBulkAvailability = async (volunteerId: string, dates: string[], isAvailable: boolean) => {
    const volMap = { ...(availability[volunteerId] || {}) };
    for (const dateStr of dates) {
      volMap[dateStr] = isAvailable;
    }
    if (!isFirebaseConfigured) {
      const updated = { ...availability, [volunteerId]: volMap };
      setAvailability(updated);
      localStorage.setItem(OFFLINE_AVAILABILITY_KEY, JSON.stringify(updated));
      return;
    }
    try {
      await setDoc(doc(db, 'availability', volunteerId), { dates: volMap });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `availability/${volunteerId}`);
    }
  };

  // 3. SCALE CALENDAR MUTATIONS
  const handleGenerateScale = async () => {
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
    
    if (!isFirebaseConfigured) {
      const newScale = { ...scale };
      for (const w of currentWeekends) {
        if (updatedScale[w.fridayStr]) {
          newScale[w.fridayStr] = {
            volunteers: updatedScale[w.fridayStr].volunteers || [],
            locked: updatedScale[w.fridayStr].locked || false
          };
        }
        if (updatedScale[w.saturdayStr]) {
          newScale[w.saturdayStr] = {
            volunteers: updatedScale[w.saturdayStr].volunteers || [],
            locked: updatedScale[w.saturdayStr].locked || false
          };
        }
      }
      setScale(newScale);
      localStorage.setItem(OFFLINE_SCALE_KEY, JSON.stringify(newScale));
      return;
    }

    try {
      const promises = [];
      for (const w of currentWeekends) {
        if (updatedScale[w.fridayStr]) {
          promises.push(setDoc(doc(db, 'scale', w.fridayStr), {
            volunteers: updatedScale[w.fridayStr].volunteers || [],
            locked: updatedScale[w.fridayStr].locked || false
          }));
        }
        if (updatedScale[w.saturdayStr]) {
          promises.push(setDoc(doc(db, 'scale', w.saturdayStr), {
            volunteers: updatedScale[w.saturdayStr].volunteers || [],
            locked: updatedScale[w.saturdayStr].locked || false
          }));
        }
      }
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scale');
    }
  };

  const handleClearScale = async () => {
    if (!isFirebaseConfigured) {
      const newScale = { ...scale };
      for (const w of currentWeekends) {
        if (!scale[w.fridayStr]?.locked) {
          newScale[w.fridayStr] = { volunteers: [], locked: false };
        }
        if (!scale[w.saturdayStr]?.locked) {
          newScale[w.saturdayStr] = { volunteers: [], locked: false };
        }
      }
      setScale(newScale);
      localStorage.setItem(OFFLINE_SCALE_KEY, JSON.stringify(newScale));
      return;
    }

    try {
      const promises = [];
      for (const w of currentWeekends) {
        if (!scale[w.fridayStr]?.locked) {
          promises.push(setDoc(doc(db, 'scale', w.fridayStr), {
            volunteers: [],
            locked: false
          }));
        }
        if (!scale[w.saturdayStr]?.locked) {
          promises.push(setDoc(doc(db, 'scale', w.saturdayStr), {
            volunteers: [],
            locked: false
          }));
        }
      }
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scale');
    }
  };

  const handleToggleLock = async (dateStr: string) => {
    const turn = scale[dateStr] || { volunteers: [], locked: false };
    const nextLocked = !turn.locked;
    if (!isFirebaseConfigured) {
      const newScale = {
        ...scale,
        [dateStr]: {
          volunteers: turn.volunteers || [],
          locked: nextLocked
        }
      };
      setScale(newScale);
      localStorage.setItem(OFFLINE_SCALE_KEY, JSON.stringify(newScale));
      return;
    }

    try {
      await setDoc(doc(db, 'scale', dateStr), {
        volunteers: turn.volunteers || [],
        locked: nextLocked
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `scale/${dateStr}`);
    }
  };

  const handleSwapVolunteer = async (dateStr: string, slotIndex: number, volunteerId: string) => {
    const turn = scale[dateStr] || { volunteers: [], locked: false };
    const currentVolunteers = [...(turn.volunteers || [])];
    while (currentVolunteers.length <= slotIndex) {
      currentVolunteers.push("");
    }
    currentVolunteers[slotIndex] = volunteerId;

    if (!isFirebaseConfigured) {
      const newScale = {
        ...scale,
        [dateStr]: {
          volunteers: currentVolunteers,
          locked: turn.locked || false
        }
      };
      setScale(newScale);
      localStorage.setItem(OFFLINE_SCALE_KEY, JSON.stringify(newScale));
      return;
    }

    try {
      await setDoc(doc(db, 'scale', dateStr), {
        volunteers: currentVolunteers,
        locked: turn.locked || false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `scale/${dateStr}`);
    }
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

  // LOGIN SCREEN RENDER FORCE GATES
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FEF7FF] text-[#1D1B20] dark:bg-[#141218] dark:text-[#E6E1E5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#1F1D24] border border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] p-8 shadow-md space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-[#6750A4] dark:bg-[#D0BCFF] rounded-2xl flex items-center justify-center text-white dark:text-[#381E72] font-black text-2xl mx-auto shadow-sm">
              ER
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#6750A4] dark:text-[#D0BCFF] tracking-tight">Escala Rotativa</h1>
              <p className="text-[10px] text-[#49454F] dark:text-[#CAC4D0] tracking-widest uppercase font-black">
                Acesso Restrito a Membros
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div className="text-xs text-red-700 dark:text-red-350 bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/60 font-semibold text-center">
                {authError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-[#514b51] dark:text-[#CAC4D0] uppercase tracking-wider">
                Palavra-passe de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Introduza a palavra-passe..."
                  className="w-full pl-4 pr-12 py-3 bg-[#FEF7FF] dark:bg-[#2B2930] border border-[#79747E] dark:border-[#49454F] rounded-full text-xs font-semibold focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#EADDFF] dark:focus:ring-[#4F378B] text-[#1D1B20] dark:text-[#E6E1E5]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] hover:underline cursor-pointer"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="text-[10px] text-[#79747E] dark:text-[#938F99] text-center pt-2">
                Dica: Utilize a palavra-passe de acesso geral de membros
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] rounded-full font-bold shadow-xs hover:shadow-md transition-all text-sm cursor-pointer"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => setIsDarkMode(prev => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-[#79747E] dark:text-[#938F99] hover:text-[#6750A4] dark:hover:text-[#D0BCFF] font-semibold cursor-pointer"
            >
              {isDarkMode ? "Modo Claro" : "Modo Escuro"}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                Gestão Equitativa de Escalas — 2026
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

            {/* Desktop Logout Button */}
            <button
              id="btn-logout-desktop"
              onClick={handleLogout}
              className="p-2.5 ml-2 bg-white dark:bg-[#2B2930] hover:bg-red-50 dark:hover:bg-red-950/20 border border-[#CAC4D0] dark:border-[#49454F] text-red-600 dark:text-red-400 rounded-full transition-all shadow-xs cursor-pointer flex items-center justify-center"
              title="Terminar Sessão (Sair)"
            >
              <LogOut size={15} />
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

        <div className="flex items-center gap-2">
          {/* Mobile Dark Mode Toggle */}
          <button
            id="btn-dark-mode-mobile"
            onClick={() => setIsDarkMode(prev => !prev)}
            className="p-2 bg-white dark:bg-[#2B2930] hover:bg-[#F3EDF7] dark:hover:bg-[#49454F] border border-[#CAC4D0] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] rounded-full transition-all cursor-pointer"
            title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Mobile Logout Toggle */}
          <button
            id="btn-logout-mobile"
            onClick={handleLogout}
            className="p-2 bg-white dark:bg-[#2B2930] hover:bg-red-50 dark:hover:bg-red-950/25 border border-[#CAC4D0] dark:border-[#49454F] text-red-650 dark:text-red-400 rounded-full transition-all cursor-pointer"
            title="Terminar Sessão"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex-1 space-y-6">
        
        {!isFirebaseConfigured && (
          <div className="bg-amber-50 dark:bg-[#2c1d11] border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed" id="offline-mode-warning">
            <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block text-sm mb-0.5 text-amber-950 dark:text-amber-100">Modo de Demonstração Local Ativo</span>
              O ficheiro de ligação à base de dados em tempo real (<code className="font-mono text-[11px] bg-amber-100 dark:bg-amber-950/40 px-1 rounded">firebase-applet-config.json</code>) não foi integrado no repositório. Quaisquer alterações que fizer serão gravadas apenas no seu navegador atual e não serão partilhadas com outros membros em tempo real.
            </div>
          </div>
        )}
        
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
