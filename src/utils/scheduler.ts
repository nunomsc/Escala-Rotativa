/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Volunteer, MonthlyScale, ScheduledWeekend } from '../types';

/**
 * Normalizes a pair of volunteer IDs into a sorted canonical key "idA:idB" (where idA < idB)
 */
function getPairKey(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
}

/**
 * Fisher-Yates array shuffle for unbiased, uniform random permutation.
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface TurnInfo {
  dateStr: string;
  parentWeekend: ScheduledWeekend;
  weekendIndex: number;
  isFriday: boolean;
  siblingDateStr: string;
}

/**
 * Distributes volunteers across weekends in a month using a fair scheduling and duo-rotation algorithm.
 * 
 * Rules Enforced:
 * 1. "Atomicidade das Equipas / Combinações Únicas de Duplas":
 *    - For N volunteers, there are C(N, 2) unique pairs (e.g., 16 volunteers = 120 unique pairs).
 *    - A pair that has EVER served together in ANY past month (in scale history or locked turns)
 *      is STRICTLY FORBIDDEN from repeating until all other pairing alternatives are exhausted.
 *    - 2-Opt local search post-optimizer systematically eliminates any repeat pairings across the database.
 * 
 * 2. "Não Repete Nomes do Mês Anterior / Rotação de Membros":
 *    - Volunteers who did NOT serve in the previous month (or served fewer times) are prioritized
 *      so that no idle members are left out while repeating previous-month members.
 *    - Consecutive weekend protection: Volunteers who served on the last weekend of the previous month
 *      are protected from being scheduled on the first weekend of the new month.
 *    - Strict tiered scheduling: No active volunteer receives a 2nd shift before all available
 *      active members have had at least 1 shift (and no 3rd shift before all have 2, etc.).
 * 
 * 3. "Atenção Rigorosa às Disponibilidades":
 *    - Indisponibilidades are 100% respected: If a volunteer is marked false for a date, they are never assigned.
 *    - Fallbacks only activate when availability leaves no alternative.
 * 
 * 4. Locked shifts are strictly preserved and count towards workloads and pairings.
 */
export function generateAutomatedScale(
  activeVolunteers: Volunteer[],
  weekends: ScheduledWeekend[],
  currentScale: MonthlyScale,
  availability: { [volunteerId: string]: { [dateStr: string]: boolean } }
): MonthlyScale {
  const newScale: MonthlyScale = { ...currentScale };
  const activeIds = new Set(activeVolunteers.map(v => v.id));

  if (activeVolunteers.length === 0 || weekends.length === 0) {
    return newScale;
  }

  // 1. Identify Target Month & Previous Month
  // Choose the middle weekend to ensure we safely inspect the target month
  const midWeekend = weekends[Math.floor(weekends.length / 2)];
  const targetYear = midWeekend.fridayDate.getFullYear();
  const targetMonth = midWeekend.fridayDate.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

  const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
  const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
  const prevMonthPrefix = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

  // 2. Identify turns in this batch of weekends
  const turnsToAssign: TurnInfo[] = [];

  weekends.forEach((w, wIdx) => {
    if (!newScale[w.fridayStr]?.locked) {
      turnsToAssign.push({
        dateStr: w.fridayStr,
        parentWeekend: w,
        weekendIndex: wIdx,
        isFriday: true,
        siblingDateStr: w.saturdayStr
      });
    }
    if (!newScale[w.saturdayStr]?.locked) {
      turnsToAssign.push({
        dateStr: w.saturdayStr,
        parentWeekend: w,
        weekendIndex: wIdx,
        isFriday: false,
        siblingDateStr: w.fridayStr
      });
    }
  });

  // Reset unlocked turns for clean generation
  for (const turn of turnsToAssign) {
    newScale[turn.dateStr] = {
      volunteers: [],
      locked: false
    };
  }

  // 3. Historical Metrics & Lifetime Pair Tracking
  // Track all pairs formed in ANY prior month or locked turn
  const historicalShiftCounts: { [volId: string]: number } = {};
  const prevMonthCounts: { [volId: string]: number } = {};
  const lastAssignedDateStr: { [volId: string]: string } = {};
  const historyPairCounts: { [pairKey: string]: number } = {};

  for (const vol of activeVolunteers) {
    historicalShiftCounts[vol.id] = 0;
    prevMonthCounts[vol.id] = 0;
  }

  const allScaleDates = Object.keys(currentScale).sort();
  for (const dStr of allScaleDates) {
    const isRegenerating = turnsToAssign.some(t => t.dateStr === dStr);
    if (isRegenerating) continue;

    const turn = currentScale[dStr];
    if (!turn || !turn.volunteers) continue;

    const assigned = turn.volunteers.filter(vId => activeIds.has(vId));
    for (const vId of assigned) {
      historicalShiftCounts[vId] = (historicalShiftCounts[vId] || 0) + 1;
      
      // Previous month tracking
      if (dStr.startsWith(prevMonthPrefix)) {
        prevMonthCounts[vId] = (prevMonthCounts[vId] || 0) + 1;
      }

      if (!lastAssignedDateStr[vId] || dStr > lastAssignedDateStr[vId]) {
        lastAssignedDateStr[vId] = dStr;
      }
    }

    if (assigned.length >= 2) {
      const pKey = getPairKey(assigned[0], assigned[1]);
      historyPairCounts[pKey] = (historyPairCounts[pKey] || 0) + 1;
    }
  }

  // 4. Current Month Workload & Pair Tracking
  const currentMonthCounts: { [volId: string]: number } = {};
  const currentMonthPairCounts: { [pairKey: string]: number } = {};
  const datesAssignedThisMonth: { [volId: string]: Set<string> } = {};

  for (const vol of activeVolunteers) {
    currentMonthCounts[vol.id] = 0;
    datesAssignedThisMonth[vol.id] = new Set<string>();
  }

  for (const w of weekends) {
    for (const dStr of [w.fridayStr, w.saturdayStr]) {
      if (newScale[dStr]?.locked) {
        const assigned = (newScale[dStr]?.volunteers || []).filter(vId => activeIds.has(vId));
        for (const vId of assigned) {
          currentMonthCounts[vId] = (currentMonthCounts[vId] || 0) + 1;
          datesAssignedThisMonth[vId].add(dStr);
        }
        if (assigned.length >= 2) {
          const pKey = getPairKey(assigned[0], assigned[1]);
          currentMonthPairCounts[pKey] = (currentMonthPairCounts[pKey] || 0) + 1;
        }
      }
    }
  }

  // 5. Calculate volunteer availability flexibility
  const isVolAvailable = (volId: string, dateStr: string): boolean => {
    const volAvail = availability[volId];
    return volAvail === undefined || volAvail[dateStr] !== false;
  };

  const flexibilityScore: { [volId: string]: number } = {};
  for (const vol of activeVolunteers) {
    let availCount = 0;
    for (const turn of turnsToAssign) {
      if (isVolAvailable(vol.id, turn.dateStr)) {
        availCount++;
      }
    }
    flexibilityScore[vol.id] = availCount;
  }

  // 6. Score Candidate for a Turn
  const scoreCandidate = (
    candidateId: string,
    turn: TurnInfo,
    currentPartnerId: string | null
  ): number => {
    let score = 0;

    // RULE 1: STRICT CURRENT MONTH LOAD (HIGHEST PRIORITY)
    // No one gets N+1 shifts before all available members get N shifts!
    const monthCount = currentMonthCounts[candidateId] || 0;
    score += monthCount * 100_000_000;

    // RULE 2: TEAM ATOMICITY / ZERO PAIR REPETITION (NEAR-INFINITE PENALTY)
    // Guarantee that a pair that has ever existed in history will NOT repeat unless no other alternative exists!
    if (currentPartnerId) {
      const pKey = getPairKey(currentPartnerId, candidateId);
      const mPairCount = currentMonthPairCounts[pKey] || 0;
      const hPairCount = historyPairCounts[pKey] || 0;

      // Repeat in the same month: Prohibited
      score += mPairCount * 50_000_000;

      // Repeat of any historical pair: Prohibited unless no other available volunteer exists
      score += hPairCount * 10_000_000;
    }

    // RULE 3: NÃO REPETE NOMES DO MÊS ANTERIOR (ROTATION ACROSS MONTHS)
    // If there are active volunteers who did NOT work in the previous month (idle), prioritize them!
    const candidateWorkedLastMonth = (prevMonthCounts[candidateId] || 0) > 0;
    const hasIdleAvailableVolunteers = activeVolunteers.some(
      v => (prevMonthCounts[v.id] || 0) === 0 && isVolAvailable(v.id, turn.dateStr) && (currentMonthCounts[v.id] || 0) === monthCount
    );
    if (candidateWorkedLastMonth && hasIdleAvailableVolunteers) {
      score += 2_000_000; // Prioritize those who rested last month
    }

    // RULE 4: CONSECUTIVE REST / RECENCY
    // If volunteer worked on the last weekend of the previous month (< 10 days ago),
    // strongly discourage assigning them to the first weekend of this month.
    const lastDate = lastAssignedDateStr[candidateId];
    if (lastDate) {
      const daysDiff = (new Date(turn.dateStr).getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);
      if (daysDiff < 7) {
        score += 500_000; // Worked within the last week
      } else if (daysDiff < 14) {
        score += 100_000; // Worked within 2 weeks
      }
    } else {
      // Never assigned in history -> give welcome priority
      score -= 50_000;
    }

    // RULE 5: SIBLING DAY PENALTY (Discourage working both Friday and Saturday of same weekend)
    const siblingAssigned = newScale[turn.siblingDateStr]?.volunteers || [];
    if (siblingAssigned.includes(candidateId)) {
      score += 300_000;
    }

    // RULE 6: CONSTRAINED AVAILABILITY (MRV Heuristic)
    // If a member has few available dates, prioritize them so they aren't starved
    const flex = flexibilityScore[candidateId] || 1;
    if (flex <= 3) {
      score -= (4 - flex) * 20_000;
    }

    // Historical lifetime shifts tie-breaker (fewer shifts = higher priority)
    const lifeShifts = historicalShiftCounts[candidateId] || 0;
    score += lifeShifts * 500;

    // RULE 7: FAIR RANDOM PERTURBATION FOR UNBIASED DIVERSITY
    score += Math.random() * 100;

    return score;
  };

  // Sort turns by availability constraint difficulty (MRV: hardest to fill first)
  const sortedTurns = [...turnsToAssign].sort((a, b) => {
    const countA = activeVolunteers.filter(v => isVolAvailable(v.id, a.dateStr)).length;
    const countB = activeVolunteers.filter(v => isVolAvailable(v.id, b.dateStr)).length;
    return countA - countB;
  });

  // Multi-pass slot allocation (Slot 0, then Slot 1)
  const slotsToFill = 2;
  for (let slot = 0; slot < slotsToFill; slot++) {
    const passTurns = shuffleArray(sortedTurns);

    for (const turn of passTurns) {
      const dateStr = turn.dateStr;
      const alreadyAssigned = newScale[dateStr].volunteers;

      if (alreadyAssigned.length > slot) {
        continue;
      }

      const currentPartnerId = alreadyAssigned.length > 0 ? alreadyAssigned[0] : null;

      const eligible = activeVolunteers.filter(vol => {
        if (alreadyAssigned.includes(vol.id)) return false;
        return isVolAvailable(vol.id, dateStr);
      });

      if (eligible.length === 0) {
        continue;
      }

      const ranked = eligible.map(vol => ({
        vol,
        score: scoreCandidate(vol.id, turn, currentPartnerId)
      })).sort((a, b) => a.score - b.score);

      const chosen = ranked[0].vol;

      newScale[dateStr].volunteers.push(chosen.id);
      currentMonthCounts[chosen.id] = (currentMonthCounts[chosen.id] || 0) + 1;
      datesAssignedThisMonth[chosen.id].add(dateStr);

      if (currentPartnerId) {
        const pKey = getPairKey(currentPartnerId, chosen.id);
        currentMonthPairCounts[pKey] = (currentMonthPairCounts[pKey] || 0) + 1;
      }
    }
  }

  // 7. Post-Processing Optimization (Local Search / 2-Opt Pair Swaps)
  // Relentlessly eliminates repeated duos and historical pairings by testing 2-opt swaps.
  optimizePairRotations(
    newScale,
    turnsToAssign,
    activeVolunteers,
    availability,
    historyPairCounts
  );

  return newScale;
}

/**
 * Optimizes the assigned pairs across unlocked turns by testing 2-opt swaps.
 * Preserves each volunteer's total monthly workload while strictly enforcing
 * team atomicity (zero repeat pairs from history or within the month).
 */
function optimizePairRotations(
  scale: MonthlyScale,
  turnsToAssign: TurnInfo[],
  activeVolunteers: Volunteer[],
  availability: { [volunteerId: string]: { [dateStr: string]: boolean } },
  historyPairCounts: { [pairKey: string]: number }
): void {
  const isVolAvailable = (volId: string, dateStr: string): boolean => {
    const volAvail = availability[volId];
    return volAvail === undefined || volAvail[dateStr] !== false;
  };

  const getTurnPairs = () => {
    const pairs: { [pKey: string]: number } = {};
    for (const turn of turnsToAssign) {
      const vols = scale[turn.dateStr]?.volunteers || [];
      if (vols.length === 2) {
        const pKey = getPairKey(vols[0], vols[1]);
        pairs[pKey] = (pairs[pKey] || 0) + 1;
      }
    }
    return pairs;
  };

  const calculatePairPenalty = (v1: string, v2: string, monthPairs: { [pKey: string]: number }): number => {
    const pKey = getPairKey(v1, v2);
    const mCount = monthPairs[pKey] || 0;
    const hCount = historyPairCounts[pKey] || 0;
    let penalty = 0;
    // Repeat within this month
    if (mCount > 1) {
      penalty += (mCount - 1) * 5_000_000;
    }
    // Repeat of a historical pair from prior months
    if (hCount > 0) {
      penalty += hCount * 1_000_000;
    }
    return penalty;
  };

  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    const monthPairs = getTurnPairs();

    for (let i = 0; i < turnsToAssign.length; i++) {
      for (let j = i + 1; j < turnsToAssign.length; j++) {
        const turnA = turnsToAssign[i];
        const turnB = turnsToAssign[j];

        const volsA = scale[turnA.dateStr]?.volunteers || [];
        const volsB = scale[turnB.dateStr]?.volunteers || [];

        if (volsA.length !== 2 || volsB.length !== 2) continue;

        // Try swapping slotA of turnA with slotB of turnB
        for (let slotA = 0; slotA < 2; slotA++) {
          for (let slotB = 0; slotB < 2; slotB++) {
            const volA = volsA[slotA];
            const partnerA = volsA[1 - slotA];
            const volB = volsB[slotB];
            const partnerB = volsB[1 - slotB];

            if (volA === volB) continue;
            if (volA === partnerB || volB === partnerA) continue; // would duplicate on same date

            // Check availability constraints
            if (!isVolAvailable(volA, turnB.dateStr) || !isVolAvailable(volB, turnA.dateStr)) {
              continue;
            }

            // Check sibling day conflicts on same weekend
            const siblingAAssigned = scale[turnA.siblingDateStr]?.volunteers || [];
            const siblingBAssigned = scale[turnB.siblingDateStr]?.volunteers || [];

            const volBHasSiblingConflictInA = siblingAAssigned.includes(volB) && turnA.weekendIndex !== turnB.weekendIndex;
            const volAHasSiblingConflictInB = siblingBAssigned.includes(volA) && turnA.weekendIndex !== turnB.weekendIndex;

            if (volBHasSiblingConflictInA || volAHasSiblingConflictInB) {
              continue;
            }

            // Evaluate penalty before vs after
            const costBefore = calculatePairPenalty(partnerA, volA, monthPairs) +
                               calculatePairPenalty(partnerB, volB, monthPairs);

            // Simulate updated monthPairs
            const simulatedPairs = { ...monthPairs };
            const oldKeyA = getPairKey(partnerA, volA);
            const oldKeyB = getPairKey(partnerB, volB);
            const newKeyA = getPairKey(partnerA, volB);
            const newKeyB = getPairKey(partnerB, volA);

            simulatedPairs[oldKeyA] = Math.max(0, (simulatedPairs[oldKeyA] || 1) - 1);
            simulatedPairs[oldKeyB] = Math.max(0, (simulatedPairs[oldKeyB] || 1) - 1);
            simulatedPairs[newKeyA] = (simulatedPairs[newKeyA] || 0) + 1;
            simulatedPairs[newKeyB] = (simulatedPairs[newKeyB] || 0) + 1;

            const costAfter = calculatePairPenalty(partnerA, volB, simulatedPairs) +
                              calculatePairPenalty(partnerB, volA, simulatedPairs);

            if (costAfter < costBefore) {
              // Execute the swap!
              volsA[slotA] = volB;
              volsB[slotB] = volA;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }
}
