/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';
import { Plus, Edit2, Trash2, Check, X, Smartphone, UserCheck, UserX, MessageSquare } from 'lucide-react';
import { getWhatsappLink } from '../utils/dateUtils';

interface VolunteerManagerProps {
  volunteers: Volunteer[];
  scale: MonthlyScale;
  currentWeekends: ScheduledWeekend[];
  onAddVolunteer: (name: string, phone: string, active: boolean) => void;
  onEditVolunteer: (id: string, name: string, phone: string, active: boolean) => void;
  onDeleteVolunteer: (id: string) => void;
  onToggleActive: (id: string) => void;
}

export function VolunteerManager({
  volunteers,
  scale,
  currentWeekends,
  onAddVolunteer,
  onEditVolunteer,
  onDeleteVolunteer,
  onToggleActive
}: VolunteerManagerProps) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [activeInput, setActiveInput] = useState(true);
  
  const [error, setError] = useState('');

  // Form states for ADD new volunteer
  const [isAdding, setIsAdding] = useState(false);

  // Calculate shifts count for current month
  const getShiftCount = (vId: string) => {
    let count = 0;
    const weekendDates = new Set<string>();
    for (const w of currentWeekends) {
      weekendDates.add(w.fridayStr);
      weekendDates.add(w.saturdayStr);
    }
    
    for (const dateStr of Object.keys(scale)) {
      if (weekendDates.has(dateStr) && scale[dateStr]?.volunteers?.includes(vId)) {
        count++;
      }
    }
    return count;
  };

  // Basic telemóvel format mask (PT-EU: 9xx xxx xxx)
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneInput(formatPhone(raw));
  };

  const startAdd = () => {
    setNameInput('');
    setPhoneInput('');
    setActiveInput(true);
    setError('');
    setIsAdding(true);
    setIsEditing(null);
  };

  const startEdit = (vol: Volunteer) => {
    setIsEditing(vol.id);
    setNameInput(vol.name);
    setPhoneInput(formatPhone(vol.phone));
    setActiveInput(vol.active);
    setError('');
    setIsAdding(false);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setIsEditing(null);
    setError('');
  };

  const saveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError('O nome completo é obrigatório.');
      return;
    }
    
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setError('Por favor, insira um número de telemóvel válido.');
      return;
    }

    if (isAdding) {
      onAddVolunteer(nameInput.trim(), cleanPhone, activeInput);
      setIsAdding(false);
    } else if (isEditing) {
      onEditVolunteer(isEditing, nameInput.trim(), cleanPhone, activeInput);
      setIsEditing(null);
    }
    
    // Clear inputs
    setNameInput('');
    setPhoneInput('');
    setError('');
  };

  return (
    <div className="space-y-6" id="volunteer-manager-container">
      {/* Upper Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#21005D] dark:text-[#EADDFF]">Equipa de Voluntários ({volunteers.length})</h2>
          <p className="text-sm text-[#79747E] dark:text-[#938F99]">Configure os membros que participam nas escalas de fins de semana.</p>
        </div>
        {!isAdding && !isEditing && (
          <button
            id="btn-add-volunteer"
            onClick={startAdd}
            className="flex items-center justify-center gap-2 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] font-bold px-5 py-2.5 rounded-full shadow-sm hover:bg-[#533c8a] dark:hover:bg-[#B69DF8] hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" />
            Adicionar Membro
          </button>
        )}
      </div>

      {/* Form (Either Add or Edit) */}
      {(isAdding || isEditing) && (
        <form 
          id="volunteer-form"
          onSubmit={saveForm} 
          className="bg-[#F7F2FA] dark:bg-[#1F1D24] border border-[#CAC4D0] dark:border-[#49454F] rounded-[28px] p-6 shadow-sm max-w-lg space-y-4"
        >
          <h3 className="text-base font-bold text-[#21005D] dark:text-[#EADDFF]">
            {isAdding ? "Adicionar Novo Voluntário" : "Editar Detalhes do Voluntário"}
          </h3>
          
          {error && (
            <div className="text-xs text-red-700 dark:text-red-350 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/60">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-[#514b51] dark:text-[#CAC4D0] uppercase tracking-wider mb-1">Nome Completo</label>
              <input
                id="input-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex: Carlos Heitor Silva"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#2B2930] border border-[#79747E] dark:border-[#49454F] rounded-full text-xs font-semibold focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#EADDFF] dark:focus:ring-[#4F378B] text-[#1D1B20] dark:text-[#E6E1E5] placeholder-[#79747E] dark:placeholder-[#938F99]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-[#514b51] dark:text-[#CAC4D0] uppercase tracking-wider mb-1">Telemóvel / WhatsApp</label>
              <input
                id="input-phone"
                type="text"
                value={phoneInput}
                onChange={handlePhoneChange}
                placeholder="Ex: 912 345 678"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#2B2930] border border-[#79747E] dark:border-[#49454F] rounded-full text-xs font-semibold focus:outline-none focus:border-[#6750A4] dark:focus:border-[#D0BCFF] focus:ring-1 focus:ring-[#EADDFF] dark:focus:ring-[#4F378B] text-[#1D1B20] dark:text-[#E6E1E5] placeholder-[#79747E] dark:placeholder-[#938F99]"
              />
            </div>

            <div className="flex items-center gap-3 py-2">
              <button
                id="toggle-active-form"
                type="button"
                onClick={() => setActiveInput(!activeInput)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  activeInput ? 'bg-[#6750A4] dark:bg-[#D0BCFF]' : 'bg-gray-300 dark:bg-[#49454F]'
                }`}
              >
                <div
                  className={`bg-white dark:bg-black/80 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    activeInput ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <div>
                <span className="text-xs font-bold text-[#1D1B20] dark:text-[#E6E1E5]">
                  {activeInput ? "Membro Ativo para Escala" : "Membro Inativo"}
                </span>
                <p className="text-[10px] text-[#49454F] dark:text-[#CAC4D0]">
                  Apenas voluntários ativos entram nas escalas automáticas da distribuição.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              id="btn-cancel-form"
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] hover:bg-[#EADDFF] dark:hover:bg-[#4F378B]/40 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-save-form"
              type="submit"
              className="px-6 py-2 rounded-full bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] text-xs font-bold hover:bg-[#533c8a] dark:hover:bg-[#B69DF8] transition-all cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Grid of Volunteers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="volunteers-grid">
        {volunteers.map((vol) => {
          const shiftCount = getShiftCount(vol.id);
          const whatsappText = `Olá ${vol.name}! Entro em contacto consigo para falarmos sobre a escala de voluntários.`;
          const phoneDisplay = formatPhone(vol.phone);

          return (
            <div
              key={vol.id}
              id={`volunteer-card-${vol.id}`}
              className={`bg-white dark:bg-[#1D1B24] border rounded-[24px] p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs ${
                vol.active ? 'border-[#E7E0EC] dark:border-[#49454F]' : 'border-gray-200 dark:border-gray-800 opacity-75'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="max-w-[75%]">
                    <h4 className="font-bold text-[#1D1B20] dark:text-[#E6E1E5] text-base line-clamp-1" title={vol.name}>
                      {vol.name}
                    </h4>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${vol.active ? 'bg-green-600' : 'bg-gray-400'}`} />
                      <span className={`text-[10px] font-bold tracking-wider uppercase ${vol.active ? 'text-[#6750A4] dark:text-[#D0BCFF]' : 'text-[#79747E] dark:text-[#938F99]'}`}>
                        {vol.active ? 'Ativo na escala' : 'Fora de escala'}
                      </span>
                    </div>
                  </div>

                  {/* Top Action Toggle */}
                  <button
                    id={`btn-toggle-active-${vol.id}`}
                    onClick={() => onToggleActive(vol.id)}
                    title={vol.active ? "Desativar voluntário temporariamente" : "Ativar voluntário para as escalas"}
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      vol.active 
                        ? 'text-green-600 dark:text-green-450 bg-green-50 dark:bg-green-950/25 hover:bg-green-100 dark:hover:bg-green-950/55' 
                        : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#2B2930] hover:bg-gray-100 dark:hover:bg-[#49454F]/40'
                    }`}
                  >
                    {vol.active ? <UserCheck size={15} /> : <UserX size={15} />}
                  </button>
                </div>

                {/* Sub info */}
                <div className="space-y-2 text-xs text-[#49454F] dark:text-[#CAC4D0] pt-1">
                  <div className="flex items-center gap-2">
                    <Smartphone size={12} className="text-[#6750A4] dark:text-[#D0BCFF]" />
                    <span className="font-mono font-bold text-[#1D1B20] dark:text-[#E6E1E5] text-xs">{phoneDisplay || 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72] font-mono text-[9px] font-black rounded-full">
                      {shiftCount}
                    </div>
                    <span className="font-semibold text-[#1D1B20] dark:text-[#E6E1E5]">{shiftCount === 1 ? '1 escala' : `${shiftCount} escalas`} no mês</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-[#E7E0EC] dark:border-[#49454F] pt-3 mt-4">
                <a
                  id={`phone-wa-link-${vol.id}`}
                  href={getWhatsappLink(vol.phone, whatsappText)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 hover:shadow-2xs px-3.5 py-1.5 rounded-full font-bold transition-all"
                >
                  <MessageSquare size={12} />
                  <span>WhatsApp</span>
                </a>

                <div className="flex items-center gap-1">
                  <button
                    id={`btn-edit-volunteer-${vol.id}`}
                    onClick={() => startEdit(vol)}
                    className="p-1.5 text-[#79747E] dark:text-[#938F99] hover:text-[#6750A4] dark:hover:text-[#D0BCFF] hover:bg-[#F3EDF7] dark:hover:bg-[#4F378B]/20 rounded-full transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    id={`btn-delete-volunteer-${vol.id}`}
                    onClick={() => {
                      if (window.confirm(`Tem a certeza de que deseja eliminar o voluntário ${vol.name}?`)) {
                        onDeleteVolunteer(vol.id);
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {volunteers.length === 0 && (
          <div className="col-span-full bg-[#FEF7FF] dark:bg-[#1D1B24] border border-dashed border-[#CAC4D0] dark:border-[#49454F] p-10 text-center rounded-[28px]" id="no-volunteers-state">
            <p className="text-[#625B71] dark:text-[#CAC4D0] text-sm font-semibold">Nenhum voluntário registado no sistema.</p>
            <button
              id="btn-add-initial-volunteer"
              onClick={startAdd}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] bg-[#EADDFF] dark:bg-[#4F378B] px-4 py-2 rounded-full hover:underline transition-all cursor-pointer"
            >
              <Plus size={14} /> Registar o Primeiro Voluntário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
