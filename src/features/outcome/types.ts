/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SubjectGradeEntry {
  subjectId: string;
  subjectName: string;
  targetScore: string; // e.g. "Target: A (4.00)" or "A (4.00)"
  actualScore: string; // e.g. "B (3.00)" or "3.00"
  actualCgpa: number;
  actualGrade?: string;
  isPassed: boolean;
  isAttempted?: boolean;
  date?: string;
}

export type ResultType = 'Program CGPA' | 'Achievement' | 'Subject Exam';
export type EvaluationOption = 'CGPA-based' | 'Grade-based';
export type OutcomeSortOption = 'NEWEST' | 'OLDEST' | 'CGPA_HIGH' | 'CGPA_LOW';

export interface ProgramResult {
  id: string;
  resultType: ResultType;
  
  // Achievement fields
  achievementTitle?: string;
  achievementValue?: string;
  achievementGrade?: string;

  // Program CGPA fields
  programId: string;
  programName: string;
  trackId?: string;
  trackName?: string;
  evaluationOption: EvaluationOption;
  targetCgpa: number;
  actualCgpa: number;
  targetGrade?: string;
  actualGrade?: string;
  targetIsNone?: boolean;
  isMet: boolean;
  isPassed: boolean;
  isEstimated: boolean; // true if estimated, false if manual
  isManualMatch?: boolean; // true if manual matches estimate, false if differs
  estimatedCgpa?: number;
  estimatedGrade?: string;
  subjectGrades: SubjectGradeEntry[];
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ProgramTargetConfig {
  programId: string;
  targetCgpa: number;
  targetGrade?: string;
  isNone?: boolean;
  evaluationOption?: EvaluationOption;
  updatedAt?: string;
}

export interface FreezeConfiguration {
  frozenProgramIds: string[]; // Entire programs marked passed
  frozenSubjectIds: string[]; // Individual subjects marked passed
  manualFrozenProgramIds?: string[]; // Preserved manual selections
  manualFrozenSubjectIds?: string[];
  preProgramFrozenSubjectIds?: Record<string, string[]>; // Snapshots of subjects before program bulk-pass
  autoCompletedChapterIdsBySubject?: Record<string, string[]>; // Snapshots of chapters auto-completed when a subject is marked passed
}

export interface CelebrationCriteria {
  requiredProgramIds: string[];
  requiredSubjectIds: string[];
  isCustomized: boolean;
}

export interface OutcomeData {
  results: ProgramResult[];
  freezeConfig: FreezeConfiguration;
  celebrationCriteria: CelebrationCriteria;
  programTargets?: Record<string, ProgramTargetConfig>;
  sortBy?: OutcomeSortOption;
  updatedAt: string;
}
