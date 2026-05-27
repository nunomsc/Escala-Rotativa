/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface DayAvailability {
  [dateStr: string]: boolean; // dateStr formatted as "YYYY-MM-DD": true/false
}

export interface VolunteerAvailability {
  [volunteerId: string]: DayAvailability;
}

export interface ScaleTurn {
  volunteers: string[]; // List of volunteer IDs assigned to this date (max 2)
  locked: boolean;      // If template is locked, re-running automatic generation won't overwrite it
}

export interface MonthlyScale {
  [dateStr: string]: ScaleTurn; // dateStr formatted as "YYYY-MM-DD"
}

export interface ScheduledWeekend {
  fridayStr: string;
  saturdayStr: string;
  fridayDate: Date;
  saturdayDate: Date;
  label: string; // e.g. "Final de Semana - 05/06 e 06/06"
}
