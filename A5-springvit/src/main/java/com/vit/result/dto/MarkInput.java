package com.vit.result.dto;

/** Form-backing object for a single subject's MSE/ESE marks entry. */
public class MarkInput {

    private Long subjectId;
    private String subjectName;
    private Double mseMarks;
    private Double eseMarks;

    public Long getSubjectId() { return subjectId; }
    public void setSubjectId(Long subjectId) { this.subjectId = subjectId; }

    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }

    public Double getMseMarks() { return mseMarks; }
    public void setMseMarks(Double mseMarks) { this.mseMarks = mseMarks; }

    public Double getEseMarks() { return eseMarks; }
    public void setEseMarks(Double eseMarks) { this.eseMarks = eseMarks; }
}
