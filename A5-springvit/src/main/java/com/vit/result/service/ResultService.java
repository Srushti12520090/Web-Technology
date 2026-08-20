package com.vit.result.service;

import com.vit.result.dto.MarkInput;
import com.vit.result.dto.ResultSummary;
import com.vit.result.dto.SubjectResult;
import com.vit.result.model.Mark;
import com.vit.result.model.Student;
import com.vit.result.model.Subject;
import com.vit.result.util.GradeCalculator;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ResultService {

    /**
     * Computes the full semester result (per-subject grades, overall
     * percentage, SGPA and pass/fail status) for the given student.
     */
    public ResultSummary buildSummary(Student student) {
        ResultSummary summary = new ResultSummary();
        summary.setStudent(student);

        List<SubjectResult> results = new ArrayList<>();
        double totalPercentageSum = 0;
        double totalCredits = 0;
        double weightedGradePoints = 0;
        boolean anyFail = false;

        for (Mark m : student.getMarks()) {
            double scaledMse = m.getScaledMse();
            double scaledEse = m.getScaledEse();
            double total = scaledMse + scaledEse;
            String grade = GradeCalculator.getGrade(total);
            int gradePoint = GradeCalculator.getGradePoint(total);
            int credits = (m.getSubject().getCredits() == null) ? 4 : m.getSubject().getCredits();

            SubjectResult sr = new SubjectResult();
            sr.setSubjectCode(m.getSubject().getSubjectCode());
            sr.setSubjectName(m.getSubject().getSubjectName());
            sr.setMseMarks(m.getMseMarks());
            sr.setEseMarks(m.getEseMarks());
            sr.setScaledMse(scaledMse);
            sr.setScaledEse(scaledEse);
            sr.setTotal(total);
            sr.setGrade(grade);
            sr.setGradePoint(gradePoint);
            results.add(sr);

            totalPercentageSum += total;
            totalCredits += credits;
            weightedGradePoints += gradePoint * credits;
            if ("F".equals(grade)) {
                anyFail = true;
            }
        }

        summary.setSubjectResults(results);
        int subjectCount = student.getMarks().size();
        summary.setOverallPercentage(subjectCount == 0 ? 0 : totalPercentageSum / subjectCount);
        summary.setSgpa(totalCredits == 0 ? 0 : weightedGradePoints / totalCredits);
        summary.setOverallResult(anyFail ? "FAIL" : "PASS");

        return summary;
    }

    /**
     * Builds one MarkInput per subject (in subject order), pre-filled with
     * the existing student's marks when editing, or blank for a new student.
     */
    public List<MarkInput> prepareMarkInputs(List<Subject> subjects, Student existingStudent) {
        List<MarkInput> inputs = new ArrayList<>();
        for (Subject s : subjects) {
            MarkInput mi = new MarkInput();
            mi.setSubjectId(s.getId());
            mi.setSubjectName(s.getSubjectName());

            if (existingStudent != null) {
                existingStudent.getMarks().stream()
                        .filter(m -> m.getSubject().getId().equals(s.getId()))
                        .findFirst()
                        .ifPresent(m -> {
                            mi.setMseMarks(m.getMseMarks());
                            mi.setEseMarks(m.getEseMarks());
                        });
            }
            inputs.add(mi);
        }
        return inputs;
    }
}
