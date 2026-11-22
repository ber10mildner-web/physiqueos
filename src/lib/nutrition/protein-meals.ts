/**
 * Protein per meal. Muscle protein synthesis is best supported by spreading
 * protein over the day: about 0.4 g per kg body weight per meal over at least
 * four meals (Schoenfeld & Aragon 2018, J Int Soc Sports Nutr 15:10).
 */
export const PROTEIN_PER_KG_PER_MEAL = 0.4;

/** Target per meal in g: 0.4 g/kg, else a quarter of the daily goal, kept within 20–60 g. */
export function proteinPerMealTarget(weightKg: number | null, dailyGoalG: number | null): number {
  const raw = weightKg ? weightKg * PROTEIN_PER_KG_PER_MEAL : dailyGoalG ? dailyGoalG / 4 : 30;
  return Math.min(60, Math.max(20, Math.round(raw / 5) * 5));
}

