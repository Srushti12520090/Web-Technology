package com.vit.result.controller;

import com.vit.result.dto.MarkInput;
import com.vit.result.dto.StudentForm;
import com.vit.result.model.Mark;
import com.vit.result.model.Student;
import com.vit.result.model.Subject;
import com.vit.result.repository.StudentRepository;
import com.vit.result.repository.SubjectRepository;
import com.vit.result.service.ResultService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ResultService resultService;

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("students", studentRepository.findAll());
        return "index";
    }

    @GetMapping("/students/new")
    public String newStudentForm(Model model) {
        StudentForm form = new StudentForm();
        form.setSemester(1);
        form.setMarks(resultService.prepareMarkInputs(subjectRepository.findAll(), null));
        model.addAttribute("studentForm", form);
        model.addAttribute("pageTitle", "Add Student");
        return "add-student";
    }

    @GetMapping("/students/{id}/edit")
    public String editStudentForm(@PathVariable Long id, Model model) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid student id: " + id));

        StudentForm form = new StudentForm();
        form.setId(student.getId());
        form.setRegNo(student.getRegNo());
        form.setStudentName(student.getStudentName());
        form.setBranch(student.getBranch());
        form.setSemester(student.getSemester());
        form.setMarks(resultService.prepareMarkInputs(subjectRepository.findAll(), student));

        model.addAttribute("studentForm", form);
        model.addAttribute("pageTitle", "Edit Student");
        return "add-student";
    }

    @PostMapping("/students/save")
    public String save(@ModelAttribute("studentForm") StudentForm form) {
        Student student = (form.getId() != null)
                ? studentRepository.findById(form.getId()).orElse(new Student())
                : new Student();

        student.setRegNo(form.getRegNo());
        student.setStudentName(form.getStudentName());
        student.setBranch(form.getBranch());
        student.setSemester(form.getSemester());

        student.getMarks().clear();
        for (MarkInput mi : form.getMarks()) {
            if (mi.getSubjectId() == null) continue;
            Subject subject = subjectRepository.findById(mi.getSubjectId()).orElse(null);
            if (subject == null) continue;

            Mark mark = new Mark();
            mark.setSubject(subject);
            mark.setStudent(student);
            mark.setMseMarks(mi.getMseMarks() == null ? 0d : mi.getMseMarks());
            mark.setEseMarks(mi.getEseMarks() == null ? 0d : mi.getEseMarks());
            student.getMarks().add(mark);
        }

        studentRepository.save(student);
        return "redirect:/";
    }

    @GetMapping("/students/{id}/delete")
    public String delete(@PathVariable Long id) {
        studentRepository.deleteById(id);
        return "redirect:/";
    }

    @GetMapping("/students/{id}/result")
    public String result(@PathVariable Long id, Model model) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invalid student id: " + id));
        model.addAttribute("summary", resultService.buildSummary(student));
        return "result";
    }
}
