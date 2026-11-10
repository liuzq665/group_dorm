-- Demonstration accommodation history for demo_student_0181 (student_no 2026900181).
-- The student's current assignment begins on 2026-09-30; this closes the prior room assignment the day before.
INSERT INTO accommodation_assignment(student_id, bed_id, check_in_date, check_out_date, assignment_type)
SELECT 216, 518, '2025-09-01', '2026-09-29', 'MOVE'
WHERE NOT EXISTS (
  SELECT 1 FROM accommodation_assignment
  WHERE student_id = 216 AND assignment_type = 'MOVE'
    AND check_in_date = '2025-09-01' AND bed_id = 518
);
