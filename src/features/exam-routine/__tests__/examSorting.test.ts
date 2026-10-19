import { sortExamSubjects, getExamTimestamp, isEligibleUpcomingExam } from '../utils/examTimeUtils';
import { ExamSubject } from '../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error('FAIL:', msg);
    process.exit(1);
  } else {
    console.log('PASS:', msg);
  }
}

console.log('--- 1. Testing user scenario from screenshot: Audit Assurance (Dec 15) vs FAR (Nov 20) ---');
const userScenario: ExamSubject[] = [
  {
    id: 'sub_audit',
    sessionId: 'sess_1',
    subjectName: 'Audit Assurance',
    examDate: '2026-12-15',
    examTime: '21:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_far',
    sessionId: 'sess_1',
    subjectName: 'FAR',
    examDate: '2026-11-20',
    examTime: '12:00',
    isCompleted: false,
    createdAt: '2026-10-02T00:00:00Z',
  },
];

// Now is 11 Oct 2026
const fixedNow = new Date('2026-10-11T22:00:00Z').getTime();
const sorted1 = sortExamSubjects(userScenario, fixedNow);

assert(sorted1[0].subjectName === 'FAR', 'FAR (Nov 20) must appear in Position 1 (nearest upcoming)');
assert(sorted1[1].subjectName === 'Audit Assurance', 'Audit Assurance (Dec 15) must appear in Position 2');

console.log('--- 2. Testing 4 upcoming subjects from specification table ---');
const specSubjects: ExamSubject[] = [
  {
    id: 'sub_econ',
    sessionId: 'sess_1',
    subjectName: 'Economics',
    examDate: '2026-11-05', // 25 days away
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_mkt',
    sessionId: 'sess_1',
    subjectName: 'Marketing',
    examDate: '2026-10-23', // 12 days away
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_acc',
    sessionId: 'sess_1',
    subjectName: 'Accounting',
    examDate: '2026-10-13', // 2 days away
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_mgmt',
    sessionId: 'sess_1',
    subjectName: 'Management',
    examDate: '2026-10-16', // 5 days away
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
];

const sortedSpec = sortExamSubjects(specSubjects, fixedNow);
assert(sortedSpec[0].subjectName === 'Accounting', 'Position 1 is Accounting (2 days away)');
assert(sortedSpec[1].subjectName === 'Management', 'Position 2 is Management (5 days away)');
assert(sortedSpec[2].subjectName === 'Marketing', 'Position 3 is Marketing (12 days away)');
assert(sortedSpec[3].subjectName === 'Economics', 'Position 4 is Economics (25 days away)');

console.log('--- 3. Testing editing nearest exam to later date ---');
// Edit Accounting to 2026-12-01 (further than Economics)
const editedSubjects = specSubjects.map((s) =>
  s.id === 'sub_acc' ? { ...s, examDate: '2026-12-01' } : s
);
const sortedEdited = sortExamSubjects(editedSubjects, fixedNow);
assert(sortedEdited[0].subjectName === 'Management', 'Position 1 transferred to Management');
assert(sortedEdited[3].subjectName === 'Accounting', 'Accounting moved to last position');

console.log('--- 4. Testing editing another exam to become the nearest ---');
// Edit Economics to tomorrow (2026-10-12)
const editedEcon = specSubjects.map((s) =>
  s.id === 'sub_econ' ? { ...s, examDate: '2026-10-12' } : s
);
const sortedEconNearest = sortExamSubjects(editedEcon, fixedNow);
assert(sortedEconNearest[0].subjectName === 'Economics', 'Economics is now Position 1');

console.log('--- 5. Testing completed and invalid date handling ---');
const mixedSubjects: ExamSubject[] = [
  {
    id: 'sub_completed',
    sessionId: 'sess_1',
    subjectName: 'Completed Exam',
    examDate: '2026-10-10',
    examTime: '10:00',
    isCompleted: true,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_invalid',
    sessionId: 'sess_1',
    subjectName: 'Invalid Date Exam',
    examDate: '',
    examTime: '',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_upcoming',
    sessionId: 'sess_1',
    subjectName: 'Upcoming Exam',
    examDate: '2026-10-15',
    examTime: '14:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
];
const sortedMixed = sortExamSubjects(mixedSubjects, fixedNow);
assert(sortedMixed[0].subjectName === 'Upcoming Exam', 'Eligible upcoming exam is always Position 1');
assert(sortedMixed[1].subjectName === 'Completed Exam', 'Completed exam follows upcoming');
assert(sortedMixed[2].subjectName === 'Invalid Date Exam', 'Invalid date placed at end safely');

console.log('--- 6. Testing tie breaker on identical scheduled times ---');
const tieSubjects: ExamSubject[] = [
  {
    id: 'sub_z',
    sessionId: 'sess_1',
    subjectName: 'Zeta Subject',
    examDate: '2026-10-20',
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sub_a',
    sessionId: 'sess_1',
    subjectName: 'Alpha Subject',
    examDate: '2026-10-20',
    examTime: '10:00',
    isCompleted: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
];
const sortedTie = sortExamSubjects(tieSubjects, fixedNow);
assert(sortedTie[0].subjectName === 'Alpha Subject', 'Alpha Subject breaks tie before Zeta Subject');
assert(sortedTie[1].subjectName === 'Zeta Subject', 'Zeta Subject is second');

console.log('ALL TESTS PASSED SUCCESSFULLY!');
