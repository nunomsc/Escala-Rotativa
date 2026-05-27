/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledWeekend } from '../types';

export const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export const DAYS_OF_WEEK_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Month is 0-indexed in JS Date
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone boundary issues
}

/**
 * Recovers all Fridays inside the given month of a year and pairs them with their respective Saturdays.
 * Saturdays can overflow into the next month if Friday is the last day.
 */
export function getWeekendsOfMonth(year: number, monthIndex: number): ScheduledWeekend[] {
  const weekends: ScheduledWeekend[] = [];
  
  // Start from day 1 to day 31
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day, 12, 0, 0);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 5 is Friday
    
    if (dayOfWeek === 5) { // It's a Friday!
      const fridayStr = toLocalDateString(date);
      
      const saturday = new Date(year, monthIndex, day + 1, 12, 0, 0);
      const saturdayStr = toLocalDateString(saturday);
      
      const fDay = date.getDate().toString().padStart(2, '0');
      const fMon = (date.getMonth() + 1).toString().padStart(2, '0');
      const sDay = saturday.getDate().toString().padStart(2, '0');
      const sMon = (saturday.getMonth() + 1).toString().padStart(2, '0');
      
      weekends.push({
        fridayStr,
        saturdayStr,
        fridayDate: date,
        saturdayDate: saturday,
        label: `Fim de Semana — Sex, ${fDay}/${fMon} e Sáb, ${sDay}/${sMon}`
      });
    }
  }
  
  return weekends;
}

/**
 * Formats a local date string to pt-BR format: "Sexta, 26 de Maio"
 */
export function formatDateLongPt(dateStr: string): string {
  const date = parseLocalDateString(dateStr);
  const dayName = date.getDay() === 5 ? "Sexta-feira" : "Sábado";
  const day = date.getDate();
  const monthName = MONTHS_PT[date.getMonth()];
  return `${dayName}, ${day} de ${monthName}`;
}

/**
 * Formats a local date string to a shorter pt-BR format: "Sex, 26 Mai"
 */
export function formatDateShortPt(dateStr: string): string {
  const date = parseLocalDateString(dateStr);
  const dayName = date.getDay() === 5 ? "Sex" : "Sáb";
  const day = date.getDate();
  const monthShort = MONTHS_PT[date.getMonth()].substring(0, 3);
  return `${dayName}, ${day} ${monthShort}`;
}

/**
 * Formats a cellular/whatsapp contact link format
 */
export function getWhatsappLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
