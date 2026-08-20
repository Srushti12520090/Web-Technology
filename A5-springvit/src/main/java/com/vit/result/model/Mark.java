package com.vit.result.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mark")
public class Mark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;

    /** Mid Semester Exam marks, out of 50, weighted 30% */
    @Column(name = "mse_marks")
    private Double mseMarks;

    /** End Semester Exam marks, out of 100, weighted 70% */
    @Column(name = "ese_marks")
    private Double eseMarks;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }

    public Double getMseMarks() { return mseMarks; }
    public void setMseMarks(Double mseMarks) { this.mseMarks = mseMarks; }

    public Double getEseMarks() { return eseMarks; }
    public void setEseMarks(Double eseMarks) { this.eseMarks = eseMarks; }

    /** MSE scaled to its 30% weight (out of 50 marks -> out of 30) */
    @Transient
    public double getScaledMse() {
        return mseMarks == null ? 0 : (mseMarks / 50.0) * 30.0;
    }

    /** ESE scaled to its 70% weight (out of 100 marks -> out of 70) */
    @Transient
    public double getScaledEse() {
        return eseMarks == null ? 0 : (eseMarks / 100.0) * 70.0;
    }

    @Transient
    public double getTotalMarks() {
        return getScaledMse() + getScaledEse();
    }
}
