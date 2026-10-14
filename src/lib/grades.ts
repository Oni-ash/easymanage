export const PASS_TOTAL = 45;
export const MAX_TOTAL = 100;
export const MAX_THEORY_WITH_PRACTICAL = 90;
export const MAX_THEORY_WITHOUT_PRACTICAL = 100;
export const MAX_PRACTICAL = 10;

export type GradeResult = {
  total: number;
  maxTotal: number;
  percentage: number;
  grade: string;
  passed: boolean;
};

export function computeGrade(
  theoryMarks: number | null,
  practicalMarks: number | null,
  hasPractical: boolean,
): GradeResult {
  const theory = theoryMarks ?? 0;
  const practical = hasPractical ? practicalMarks ?? 0 : 0;
  const total = theory + practical;
  const maxTotal = MAX_TOTAL;
  const percentage = (total / maxTotal) * 100;
  const passed = total >= PASS_TOTAL;

  let grade = 'F';
  if (passed) {
    if (percentage >= 90) grade = 'O';
    else if (percentage >= 80) grade = 'A+';
    else if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B+';
    else if (percentage >= 50) grade = 'B';
    else grade = 'C';
  }

  return { total, maxTotal, percentage, grade, passed };
}
export function gradePoint(grade: string): number {
  switch (grade) {
    case 'O':  return 10;
    case 'A+': return 9;
    case 'A':  return 8;
    case 'B+': return 7;
    case 'B':  return 6;
    case 'C':  return 5;
    default:   return 0; // F
  }
}

export function computeGpa(gradePoints: number[]): number {
  if (gradePoints.length === 0) return 0;
  const sum = gradePoints.reduce((a, b) => a + b, 0);
  return Math.round((sum / gradePoints.length) * 100) / 100;
}