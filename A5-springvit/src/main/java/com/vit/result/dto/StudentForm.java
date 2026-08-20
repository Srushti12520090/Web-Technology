package com.vit.result.dto;

import java.util.ArrayList;
import java.util.List;

/** Form-backing object used by the add/edit student page. */
public class StudentForm {

    private Long id;
    private String regNo;
    private String studentName;
    private String branch;
    private Integer semester;
    private List<MarkInput> marks = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegNo() { return regNo; }
    public void setRegNo(String regNo) { this.regNo = regNo; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public Integer getSemester() { return semester; }
    public void setSemester(Integer semester) { this.semester = semester; }

    public List<MarkInput> getMarks() { return marks; }
    public void setMarks(List<MarkInput> marks) { this.marks = marks; }
}
