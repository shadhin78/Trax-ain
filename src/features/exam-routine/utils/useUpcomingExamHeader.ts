/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ExamRoutineData, ExamSession, ExamSubject, ExamActiveStatus } from '../types';
import { getExamTimestamp, calculateExamTimeRemaining, THIRTY_MINUTES_MS } from './examTimeUtils';
import { useOptionalExamRoutine } from '../context/ExamRoutineContext';

const LOCAL_STORAGE_EXAM_ROUTINE_KEY = 'x29_exam_routine_data';

export interface FormattedCountdownUnit {
  value: string;
  unit: string;
  label: string;
}

export interface UpcomingExamHeaderInfo {
  subjectName: string;
  countdownDisplay: string;
  hasUpcomingExam: boolean;
  status: ExamActiveStatus;
  units: FormattedCountdownUnit[];
}

export function getUnitAbbreviation(label: string): string {
  switch (label.toUpperCase()) {
    case 'YEARS':
    case 'YEAR':
      return 'y';
    case 'MONTHS':
    case 'MONTH':
      return 'mo';
    case 'DAYS':
    case 'DAY':
      return 'd';
    case 'HOURS':
    case 'HOUR':
      return 'h';
    case 'MINS':
    case 'MIN':
    case 'MINUTES':
      return 'm';
    case 'SECS':
    case 'SEC':
    case 'SECONDS':
      return 's';
    default:
      return '';
  }
}

export function useUpcomingExamHeader(): UpcomingExamHeaderInfo {
  const routineContext = useOptionalExamRoutine();

  const [fallbackInfo, setFallbackInfo] = useState<UpcomingExamHeaderInfo>(() => {
    return resolveUpcomingExam();
  });

  useEffect(() => {
    if (routineContext) return;

    const update = () => {
      setFallbackInfo(resolveUpcomingExam());
    };

    update();
    const interval = setInterval(update, 1000);
    window.addEventListener('x29_exam_routine_updated', update);
    window.addEventListener('storage', update);

    return () => {
      clearInterval(interval);
      window.removeEventListener('x29_exam_routine_updated', update);
      window.removeEventListener('storage', update);
    };
  }, [routineContext]);

  if (routineContext) {
    if (!routineContext.activeExamBanner) {
      return {
        subjectName: 'No Exam Scheduled',
        countdownDisplay: '',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    const { subject, timeRemaining } = routineContext.activeExamBanner;
    const formattedUnits: FormattedCountdownUnit[] = (timeRemaining.units || []).map((u) => ({
      value: u.value,
      unit: getUnitAbbreviation(u.label),
      label: u.label,
    }));

    if (timeRemaining.status === 'LIVE_IN_PROGRESS') {
      return {
        subjectName: subject.subjectName,
        countdownDisplay: 'LIVE NOW',
        hasUpcomingExam: true,
        status: 'LIVE_IN_PROGRESS',
        units: formattedUnits,
      };
    }

    if (timeRemaining.status === 'ENDED') {
      return {
        subjectName: subject.subjectName,
        countdownDisplay: 'ENDED',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    const compactDisplay = formattedUnits
      .map((u) => `${u.value}${u.unit}`)
      .join(' ');

    return {
      subjectName: subject.subjectName,
      countdownDisplay: compactDisplay || timeRemaining.compactString,
      hasUpcomingExam: true,
      status: 'UPCOMING',
      units: formattedUnits,
    };
  }

  return fallbackInfo;
}

function resolveUpcomingExam(): UpcomingExamHeaderInfo {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EXAM_ROUTINE_KEY);
    if (!raw) {
      return {
        subjectName: 'No Exam Scheduled',
        countdownDisplay: '',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    const data: ExamRoutineData = JSON.parse(raw);
    const sessions = data.sessions || [];
    const pinnedId = data.pinnedSubjectId || 'AUTO';

    // Flatten all uncompleted subjects with valid exam date
    const uncompleted: { subject: ExamSubject; session: ExamSession; timestamp: number }[] = [];
    sessions.forEach((s) => {
      (s.subjects || []).forEach((sub) => {
        if (!sub.isCompleted && sub.examDate) {
          uncompleted.push({
            subject: sub,
            session: s,
            timestamp: getExamTimestamp(sub.examDate, sub.examTime),
          });
        }
      });
    });

    if (uncompleted.length === 0) {
      return {
        subjectName: 'No Exam Scheduled',
        countdownDisplay: '',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    const now = Date.now();
    let target: { subject: ExamSubject; session: ExamSession; timestamp: number } | null = null;

    // 1. Manual selection if pinned
    if (pinnedId !== 'AUTO') {
      const pinned = uncompleted.find((u) => u.subject.id === pinnedId);
      if (pinned) {
        target = pinned;
      }
    }

    // 2. Auto mode: Track nearest upcoming exam within Active Status Window (timestamp + 30m >= now)
    if (!target) {
      const activeCandidates = uncompleted
        .filter((u) => u.timestamp > 0 && u.timestamp + THIRTY_MINUTES_MS >= now)
        .sort((a, b) => {
          if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
          const nameComp = (a.subject.subjectName || '').localeCompare(b.subject.subjectName || '');
          if (nameComp !== 0) return nameComp;
          return a.subject.id.localeCompare(b.subject.id);
        });

      if (activeCandidates.length > 0) {
        target = activeCandidates[0];
      }
    }

    if (!target) {
      return {
        subjectName: 'No Exam Scheduled',
        countdownDisplay: '',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    // Calculate real-time breakdown
    const breakdown = calculateExamTimeRemaining(target.subject.examDate, target.subject.examTime, now);

    const formattedUnits: FormattedCountdownUnit[] = (breakdown.units || []).map((u) => ({
      value: u.value,
      unit: getUnitAbbreviation(u.label),
      label: u.label,
    }));

    if (breakdown.status === 'LIVE_IN_PROGRESS') {
      return {
        subjectName: target.subject.subjectName,
        countdownDisplay: 'LIVE NOW',
        hasUpcomingExam: true,
        status: 'LIVE_IN_PROGRESS',
        units: formattedUnits,
      };
    }

    if (breakdown.status === 'ENDED') {
      return {
        subjectName: target.subject.subjectName,
        countdownDisplay: 'ENDED',
        hasUpcomingExam: false,
        status: 'ENDED',
        units: [],
      };
    }

    const compactDisplay = formattedUnits
      .map((u) => `${u.value}${u.unit}`)
      .join(' ');

    return {
      subjectName: target.subject.subjectName,
      countdownDisplay: compactDisplay || breakdown.compactString,
      hasUpcomingExam: true,
      status: 'UPCOMING',
      units: formattedUnits,
    };
  } catch {
    return {
      subjectName: 'No Exam Scheduled',
      countdownDisplay: '',
      hasUpcomingExam: false,
      status: 'ENDED',
      units: [],
    };
  }
}
