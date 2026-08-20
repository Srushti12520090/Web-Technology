package com.vit.result.dto;

/** Computed per-subject result shown on the result page. */
public class SubjectResult {

    private String subjectCode;
    private String subjectName;
    private Double mseMarks;
    private Double eseMarks;
    private double scaledMse;
    private double scaledEse;
    private double total;
    private String grade;
    private int gradePoint;

    public String getSubjectCode() { return subjectCode; }
    public void setSubjectCode(String subjectCode) { this.subjectCode = subjectCode; }

    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }

    public Double getMseMarks() { return mseMarks; }
    public void setMseMarks(Double mseMarks) { this.mseMarks = mseMarks; }

    public Double getEseMarks() { return eseMarks; }
    public void setEseMarks(Double eseMarks) { this.eseMarks = eseMarks; }

    public double getScaledMse() { return scaledMse; }
    public void setScaledMse(double scaledMse) { this.scaledMse = scaledMse; }

    public double getScaledEse() { return scaledEse; }
    public void setScaledEse(double scaledEse) { this.scaledEse = scaledEse; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public int getGradePoint() { return gradePoint; }
    public void setGradePoint(int gradePoint) { this.gradePoint = gradePoint; }
}
