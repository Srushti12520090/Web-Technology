package com.vit.result.dto;

import com.vit.result.model.Student;

import java.util.ArrayList;
import java.util.List;

/** Full computed result for a student, shown on the result page. */
public class ResultSummary {

    private Student student;
    private List<SubjectResult> subjectResults = new ArrayList<>();
    private double overallPercentage;
    private double sgpa;
    private String overallResult;

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public List<SubjectResult> getSubjectResults() { return subjectResults; }
    public void setSubjectResults(List<SubjectResult> subjectResults) { this.subjectResults = subjectResults; }

    public double getOverallPercentage() { return overallPercentage; }
    public void setOverallPercentage(double overallPercentage) { this.overallPercentage = overallPercentage; }

    public double getSgpa() { return sgpa; }
    public void setSgpa(double sgpa) { this.sgpa = sgpa; }

    public String getOverallResult() { return overallResult; }
    public void setOverallResult(String overallResult) { this.overallResult = overallResult; }

    public double getTotalOutOf() {
        return subjectResults.size() * 100.0;
    }

    public double getTotalScored() {
        return subjectResults.stream().mapToDouble(SubjectResult::getTotal).sum();
    }
}
