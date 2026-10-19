/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Program, Subject } from '../../../types/academic';

interface SubjectSelectOptionsProps {
  programs?: Program[];
  subjects?: Subject[];
  includeGeneralStudy?: boolean;
}

export const SubjectSelectOptions: React.FC<SubjectSelectOptionsProps> = React.memo(({
  programs = [],
  subjects = [],
  includeGeneralStudy = true,
}) => {
  const sortedPrograms = [...programs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const assignedProgramIds = new Set(sortedPrograms.map((p) => p.id));

  return (
    <>
      {includeGeneralStudy && (
        <option value="General Study" className="bg-[#131722] text-[#F8FAFC]">
          General Study
        </option>
      )}

      {sortedPrograms.map((prog) => {
        const subjsInProg = subjects
          .filter((s) => s.programId === prog.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        if (subjsInProg.length === 0) return null;

        return (
          <optgroup
            key={prog.id}
            label={`🎓 ${prog.name}`}
            className="bg-[#131722] text-[#F8FAFC] font-bold"
          >
            {subjsInProg.map((sub) => (
              <option key={sub.id} value={sub.name} className="bg-[#131722] text-[#F8FAFC]">
                {sub.name}
              </option>
            ))}
          </optgroup>
        );
      })}

      {(() => {
        const orphanSubjects = subjects.filter(
          (s) => !s.programId || !assignedProgramIds.has(s.programId)
        );
        if (orphanSubjects.length === 0) return null;
        return (
          <optgroup label="🎓 Other" className="bg-[#131722] text-[#F8FAFC] font-bold">
            {orphanSubjects.map((sub) => (
              <option key={sub.id} value={sub.name} className="bg-[#131722] text-[#F8FAFC]">
                {sub.name}
              </option>
            ))}
          </optgroup>
        );
      })()}
    </>
  );
});
