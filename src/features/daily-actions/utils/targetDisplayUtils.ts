/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getChapterTopicDisplay } from '../../../context/AcademicHierarchyContext';

export interface TargetDisplayInfo {
  subjectName?: string;
  chapterNumber?: string | number;
  topicName?: string;
  displayText: string;
  isChapterTarget: boolean;
}

/**
 * Parses target title, track, notes, and fields to extract Subject Name, Chapter Number, and Topic Name
 * Examples:
 * - "Accounting BBA Ch 5: Topic 5" -> Subject: "Accounting BBA", Chapter: "5", Topic: "Topic 5"
 * - "FAR Ch 1: Conceptual Framework" -> Subject: "FAR", Chapter: "1", Topic: "Conceptual Framework"
 * - "FAR - Ch 1 - Balance Sheet" -> Subject: "FAR", Chapter: "1", Topic: "Balance Sheet"
 * - "FAR Ch 1" -> Subject: "FAR", Chapter: "1", Topic: resolved from DB or "Topic 1"
 * - "Accounting BBA — Chapter 5" -> Subject: "Accounting BBA", Chapter: "5"
 * - "Science Ch 1-5" -> Subject: "Science", Chapter: "1-5"
 */
export function formatChapterTargetDisplay(
  target: {
    id?: string;
    title: string;
    track?: string;
    notes?: string;
    chapterId?: string;
  },
  chapters?: Array<{ id: string; subjectId: string; chapterNumber: string | number; title?: string; topicName?: string }>,
  subjects?: Array<{ id: string; name: string }>
): TargetDisplayInfo {
  const title = (target.title || '').trim();
  const track = (target.track || '').trim();
  const notes = (target.notes || '').trim();

  // Helper to format displayText cleanly
  const buildDisplayText = (subj: string, chapNum: string | number, topic?: string) => {
    const chStr = String(chapNum).trim().toLowerCase().startsWith('ch') ? String(chapNum).trim() : `Ch ${chapNum}`;
    return topic ? `${subj} - ${chStr} - ${topic}` : `${subj} - ${chStr}`;
  };

  // 1. If linked chapter is available in database
  if (chapters && target.chapterId) {
    const matchedChap = chapters.find(c => c.id === target.chapterId);
    if (matchedChap) {
      const subj = subjects?.find(s => s.id === matchedChap.subjectId)?.name || track || 'Subject';
      const chapNum = matchedChap.chapterNumber;
      const topic = getChapterTopicDisplay(matchedChap);
      return {
        subjectName: subj,
        chapterNumber: chapNum,
        topicName: topic,
        displayText: buildDisplayText(subj, chapNum, topic),
        isChapterTarget: true,
      };
    }
  }

  // 2. Pattern 1: Check for "Subject: X | Chapter Y" or "Subject: X | Chapter Y | Topic: Z" in notes
  const notesSubjectMatch = notes.match(/Subject:\s*([^|]+)\s*\|\s*Chapter\s*([\w.-]+)(?:\s*\|\s*Topic:\s*([^|]+))?/i);
  if (notesSubjectMatch) {
    const subj = notesSubjectMatch[1].trim();
    const chapNum = notesSubjectMatch[2].trim();
    let topic = notesSubjectMatch[3]?.trim();

    // Check if title has topic after colon/hyphen if not in notes
    if (!topic) {
      const titleTopicMatch = title.match(/^(?:.+?)\s*(?:Ch(?:apter)?\.?)\s*[\w.-]+\s*(?::|-|—)\s*(.+)$/i);
      if (titleTopicMatch) {
        topic = titleTopicMatch[1].trim();
      }
    }

    // Try finding in chapters by subject and chapter number
    if (!topic && chapters && subjects) {
      const matchedSubject = subjects.find(s => s.name.toLowerCase() === subj.toLowerCase());
      if (matchedSubject) {
        const matchedChap = chapters.find(c => c.subjectId === matchedSubject.id && String(c.chapterNumber).trim() === chapNum);
        if (matchedChap) {
          topic = getChapterTopicDisplay(matchedChap);
        }
      }
    }

    if (!topic) {
      topic = `Topic ${chapNum}`;
    }

    return {
      subjectName: subj,
      chapterNumber: chapNum,
      topicName: topic,
      displayText: buildDisplayText(subj, chapNum, topic),
      isChapterTarget: true,
    };
  }

  // 3. Pattern 2: Title format like "Accounting BBA Ch 5: Topic 5" or "FAR Ch 1 - Balance Sheet" or "FAR Ch 1"
  const titleChMatch = title.match(/^(.+?)\s*(?:-|—)?\s*(?:Ch(?:apter)?\.?)\s*([\w.-]+)(?:\s*(?::|-|—)\s*(.+))?$/i);
  if (titleChMatch) {
    const rawSubj = titleChMatch[1].trim();
    const chapNum = titleChMatch[2].trim();
    let topic = titleChMatch[3]?.trim();
    const subj = track || rawSubj;

    // If topic wasn't directly in the title regex match, check DB
    if (!topic && chapters) {
      const matchedChap = chapters.find(c => {
        const numMatch = String(c.chapterNumber).trim() === chapNum;
        if (!numMatch) return false;
        if (subjects) {
          const s = subjects.find(sub => sub.id === c.subjectId);
          if (s && s.name.toLowerCase() === subj.toLowerCase()) return true;
        }
        return true;
      });
      if (matchedChap) {
        topic = getChapterTopicDisplay(matchedChap);
      }
    }

    if (!topic) {
      topic = `Topic ${chapNum}`;
    }

    return {
      subjectName: subj,
      chapterNumber: chapNum,
      topicName: topic,
      displayText: buildDisplayText(subj, chapNum, topic),
      isChapterTarget: true,
    };
  }

  // 4. Pattern 3: If track is present and title has "Ch X" or "Chapter X"
  if (track) {
    const chMatch = title.match(/(?:Ch(?:apter)?\.?)\s*([\w.-]+)(?:\s*(?::|-|—)\s*(.+))?$/i);
    if (chMatch) {
      const chapNum = chMatch[1].trim();
      let topic = chMatch[2]?.trim();

      if (!topic && chapters) {
        const matchedChap = chapters.find(c => String(c.chapterNumber).trim() === chapNum);
        if (matchedChap) {
          topic = getChapterTopicDisplay(matchedChap);
        }
      }

      if (!topic) {
        topic = `Topic ${chapNum}`;
      }

      return {
        subjectName: track,
        chapterNumber: chapNum,
        topicName: topic,
        displayText: buildDisplayText(track, chapNum, topic),
        isChapterTarget: true,
      };
    }
  }

  // Fallback: If not formatted as a specific chapter, display clean title or track + title
  return {
    subjectName: track || undefined,
    chapterNumber: undefined,
    topicName: undefined,
    displayText: title,
    isChapterTarget: false,
  };
}
