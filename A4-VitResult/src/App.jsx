import { useState } from "react";
import "./App.css";

const initialSubjects = [
  { id: 1, name: "Data Structures", code: "DSA", mse: "", ese: "" },
  { id: 2, name: "Database Management Systems", code: "DBMS", mse: "", ese: "" },
  { id: 3, name: "Computer Networks", code: "CN", mse: "", ese: "" },
  { id: 4, name: "Web Technology", code: "WT", mse: "", ese: "" },
];

function getGrade(mark) {
  if (mark >= 90) return "A+";
  if (mark >= 80) return "A";
  if (mark >= 70) return "B+";
  if (mark >= 60) return "B";
  if (mark >= 50) return "C";
  if (mark >= 40) return "D";
  return "F";
}

function getGradePoint(mark) {
  if (mark >= 90) return 10;
  if (mark >= 80) return 9;
  if (mark >= 70) return 8;
  if (mark >= 60) return 7;
  if (mark >= 50) return 6;
  if (mark >= 40) return 5;
  return 0;
}

function App() {
  const [student, setStudent] = useState({
    name: "",
    prn: "",
    branch: "Computer Engineering",
    semester: "Semester 3",
  });

  const [subjects, setSubjects] = useState(initialSubjects);
  const [showResult, setShowResult] = useState(false);

  const handleStudentChange = (e) => {
    setStudent({ ...student, [e.target.name]: e.target.value });
  };

  const handleMarksChange = (id, field, value) => {
    if (value === "" || (Number(value) >= 0 && Number(value) <= 100)) {
      setSubjects(
        subjects.map((subject) =>
          subject.id === id ? { ...subject, [field]: value } : subject
        )
      );
      setShowResult(false);
    }
  };

  const calculateFinalMarks = (mse, ese) =>
    Number(mse || 0) * 0.3 + Number(ese || 0) * 0.7;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!student.name.trim() || !student.prn.trim()) {
      alert("Please enter student name and PRN.");
      return;
    }

    for (const subject of subjects) {
      if (subject.mse === "" || subject.ese === "") {
        alert(`Please enter MSE and ESE marks for ${subject.name}.`);
        return;
      }
    }

    setShowResult(true);
  };

  const resetForm = () => {
    setStudent({
      name: "",
      prn: "",
      branch: "Computer Engineering",
      semester: "Semester 3",
    });
    setSubjects(initialSubjects);
    setShowResult(false);
  };

  const results = subjects.map((subject) => {
    const finalMarks = calculateFinalMarks(subject.mse, subject.ese);
    return {
      ...subject,
      finalMarks,
      grade: getGrade(finalMarks),
      gradePoint: getGradePoint(finalMarks),
    };
  });

  const totalMarks = results.reduce((sum, subject) => sum + subject.finalMarks, 0);
  const percentage = totalMarks / 4;
  const totalGradePoints = results.reduce((sum, subject) => sum + subject.gradePoint, 0);
  const cgpa = totalGradePoints / 4;
  const isPass = results.every((subject) => subject.finalMarks >= 40);

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">V</div>
          <div>
            <h1>VIT Result Portal</h1>
            <p>Semester Result Calculator</p>
          </div>
        </div>
        <div className="badge">Academic Portal</div>
      </header>

      <main className="container">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Student Information</h2>
              <p>Enter your semester details</p>
            </div>
          </div>

          <div className="student-grid">
            <div className="form-group">
              <label htmlFor="name">Student Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter student name"
                value={student.name}
                onChange={handleStudentChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prn">PRN</label>
              <input
                id="prn"
                type="text"
                name="prn"
                placeholder="Enter PRN"
                value={student.prn}
                onChange={handleStudentChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="branch">Branch</label>
              <select id="branch" name="branch" value={student.branch} onChange={handleStudentChange}>
                <option>Computer Engineering</option>
                <option>Information Technology</option>
                <option>Electronics Engineering</option>
                <option>Mechanical Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester</label>
              <select id="semester" name="semester" value={student.semester} onChange={handleStudentChange}>
                <option>Semester 1</option>
                <option>Semester 2</option>
                <option>Semester 3</option>
                <option>Semester 4</option>
                <option>Semester 5</option>
                <option>Semester 6</option>
                <option>Semester 7</option>
                <option>Semester 8</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Semester Marks</h2>
              <p>MSE carries 30% and ESE carries 70%</p>
            </div>
            <div className="formula">MSE × 30% + ESE × 70%</div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>MSE Marks<span>/100</span></th>
                  <th>ESE Marks<span>/100</span></th>
                  <th>Final Marks<span>/100</span></th>
                  <th>Grade</th>
                </tr>
              </thead>

              <tbody>
                {subjects.map((subject) => {
                  const finalMarks = calculateFinalMarks(subject.mse, subject.ese);
                  const complete = subject.mse !== "" && subject.ese !== "";

                  return (
                    <tr key={subject.id}>
                      <td>
                        <strong>{subject.name}</strong>
                        <small>{subject.code}</small>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={subject.mse}
                          onChange={(e) => handleMarksChange(subject.id, "mse", e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={subject.ese}
                          onChange={(e) => handleMarksChange(subject.id, "ese", e.target.value)}
                        />
                      </td>

                      <td>
                        <strong className="final-mark">
                          {complete ? finalMarks.toFixed(2) : "--"}
                        </strong>
                      </td>

                      <td>
                        {complete ? (
                          <span className={`grade ${getGrade(finalMarks) === "F" ? "fail" : ""}`}>
                            {getGrade(finalMarks)}
                          </span>
                        ) : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="button-area">
            <button className="calculate-button" onClick={handleSubmit}>
              Calculate Result
            </button>
            <button className="reset-button" onClick={resetForm}>
              Reset
            </button>
          </div>
        </section>

        {showResult && (
          <section className="result-section">
            <div className="result-header">
              <div>
                <span className="success-label">SEMESTER RESULT</span>
                <h2>Result Summary</h2>
              </div>
              <div className={`status ${isPass ? "passed" : "failed"}`}>
                {isPass ? "PASSED" : "FAILED"}
              </div>
            </div>

            <div className="student-summary">
              <div><span>Student</span><strong>{student.name}</strong></div>
              <div><span>PRN</span><strong>{student.prn}</strong></div>
              <div><span>Branch</span><strong>{student.branch}</strong></div>
              <div><span>Semester</span><strong>{student.semester}</strong></div>
            </div>

            <div className="result-table">
              {results.map((subject) => (
                <div className="result-row" key={subject.id}>
                  <div>
                    <strong>{subject.name}</strong>
                    <small>{subject.code}</small>
                  </div>
                  <strong>{subject.finalMarks.toFixed(2)}</strong>
                  <span className={`grade ${subject.grade === "F" ? "fail" : ""}`}>
                    {subject.grade}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <span>Total Marks</span>
                <strong>{totalMarks.toFixed(2)}<small> / 400</small></strong>
              </div>
              <div className="summary-card">
                <span>Percentage</span>
                <strong>{percentage.toFixed(2)}%</strong>
              </div>
              <div className="summary-card">
                <span>SGPA</span>
                <strong>{cgpa.toFixed(2)}</strong>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer>
        VIT Semester Result Calculator<br />
        React Web Technology Project
      </footer>
    </div>
  );
}

export default App;
