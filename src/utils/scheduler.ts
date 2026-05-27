/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';

interface AssignmentCounts {
  [volunteerId: string]: number;
}

/**
 * Distributes volunteers across weekends in a month using a fair scheduling algorithm.
 * 
 * Fairness Rules:
 * 1. Only active volunteers are considered.
 * 2. If a turn is LOCKED, its assignments are preserved and count towards workloads.
 * 3. We fill 1st slot of all turns first, then the 2nd slot. This ensures maximum dispersion.
 * 4. Priority goes to volunteers with fewest shifts assigned so far in the current month.
 * 5. Back-to-back same-weekend penalty: A volunteer assigned to Friday gets a major priority penalty for Saturday of the same weekend.
 * 6. Ties are broken randomly for dynamic rotation.
 */
export function generateAutomatedScale(
  activeVolunteers: Volunteer[],
  weekends: ScheduledWeekend[],
  currentScale: MonthlyScale,
  availability: { [volunteerId: string]: { [dateStr: string]: boolean } }
): MonthlyScale {
  const newScale: MonthlyScale = { ...currentScale };
  
  // 1. Initialize workload counts for active volunteers
  const counts: AssignmentCounts = {};
  for (const vol of activeVolunteers) {
    counts[vol.id] = 0;
  }
  
  // Count pre-defined assignments for locked turns across active volunteers
  for (const weekend of weekends) {
    const dates = [weekend.fridayStr, weekend.saturdayStr];
    for (const dStr of dates) {
      if (newScale[dStr]?.locked) {
        const assigned = newScale[dStr]?.volunteers || [];
        for (const vId of assigned) {
          if (counts[vId] !== undefined) {
            counts[vId] += 1;
          }
        }
      }
    }
  }

  // 2. Filter which turns are unlocked and need generation
  interface TurnToAssign {
    dateStr: string;
    parentWeekend: ScheduledWeekend;
    isFriday: boolean;
  }
  
  const turnsToAssign: TurnToAssign[] = [];
  for (const w of weekends) {
    if (!newScale[w.fridayStr] || !newScale[w.fridayStr].locked) {
      turnsToAssign.push({ dateStr: w.fridayStr, parentWeekend: w, isFriday: true });
    }
    if (!newScale[w.saturdayStr] || !newScale[w.saturdayStr].locked) {
      turnsToAssign.push({ dateStr: w.saturdayStr, parentWeekend: w, isFriday: false });
    }
  }

  // Initialize empty slate for unlocked turns
  for (const turn of turnsToAssign) {
    newScale[turn.dateStr] = {
      volunteers: [],
      locked: false
    };
  }

  // 3. Multi-pass greedy allocation.
  // Pass 0 fills the 1st person on each shift.
  // Pass 1 fills the 2nd person on each shift.
  // This makes sure almost everyone gets 1 shift before anyone gets 2!
  const slotsToFill = 2;
  for (let slotIdx = 0; slotIdx < slotsToFill; slotIdx++) {
    // Process turns. To avoid bias (e.g. earlier weekends always getting best volunteers),
    // we can shuffle the order we process the turns inside this pass!
    const shuffledTurns = [...turnsToAssign].sort(() => Math.random() - 0.5);

    for (const turn of shuffledTurns) {
      const dateStr = turn.dateStr;
      const alreadyAssigned = newScale[dateStr].volunteers;

      // Find eligible active volunteers
      const candidates = activeVolunteers.filter(vol => {
        // Must not already be on this date
        if (alreadyAssigned.includes(vol.id)) return false;

        // Must be available (defaulting to true if undefined)
        const volAvail = availability[vol.id];
        const isAvailable = volAvail === undefined || volAvail[dateStr] !== false;
        return isAvailable;
      });

      if (candidates.length === 0) {
        continue;
      }

      // Calculate priority score. LOWER score is better.
      const getScore = (volId: string) => {
        let baseCount = counts[volId] || 0;

        // Penalty if already scheduled on the sibling day of this exact weekend
        const siblingDateStr = turn.isFriday ? turn.parentWeekend.saturdayStr : turn.parentWeekend.fridayStr;
        const siblingAssigned = newScale[siblingDateStr]?.volunteers || [];
        if (siblingAssigned.includes(volId)) {
          // Add 1.5 shift penalty to discourage booking both Friday and Saturday if possible
          baseCount += 1.5;
        }

        return baseCount;
      };

      // Sort candidates by score
      candidates.sort((a, b) => {
        const scoreA = getScore(a.id);
        const scoreB = getScore(b.id);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        // Shuffle tie breaker
        return Math.random() - 0.5;
      });

      // Assign the best candidate (lowest score)
      const chosen = candidates[0];
      newScale[dateStr].volunteers.push(chosen.id);
      counts[chosen.id] = (counts[chosen.id] || 0) + 1;
    }
  }

  return newScale;
}
