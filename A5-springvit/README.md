# VIT Semester Result Preparation System

A responsive Spring Boot + MySQL web app for preparing one semester's result
for VIT students, using 4 fixed subjects with **MSE (30%) + ESE (70%)** weighting.

## Grading scale used

| Total (out of 100) | Grade | Grade Point |
|---|---|---|
| 90–100 | O | 10 |
| 80–89 | A+ | 9 |
| 70–79 | A | 8 |
| 60–69 | B+ | 7 |
| 55–59 | B | 6 |
| 50–54 | C | 5 |
| 45–49 | D | 4 |
| 40–44 | P | 3 |
| < 40 | F | 0 (Fail) |

`Total = (MSE/50 × 30) + (ESE/100 × 70)`. SGPA is the credit-weighted average
of grade points across the 4 subjects (each subject defaults to 4 credits).

## Tech stack

- Java (Spring Boot 3.3.4, Spring MVC, Spring Data JPA, Thymeleaf)
- MySQL (via XAMPP)
- HTML5 / CSS3 (custom responsive design, no frontend framework) + vanilla JS
- Maven

## 1. Prerequisites

1. **JDK** — Spring Boot 3.3.x is built/tested against Java 17–23. The `pom.xml`
   targets Java 21 (LTS) for maximum compatibility. If you have **JDK 26**
   installed, it will generally still run the app fine (JVM bytecode is
   backward compatible), but if you hit toolchain errors in VS Code, either:
   - point VS Code's Java extension at a JDK 21 installation, or
   - bump `<java.version>` in `pom.xml` to match your installed JDK.
2. **XAMPP** — install from https://www.apachefriends.org and start the
   **MySQL** module from the XAMPP Control Panel (Apache is only needed if
   you want to browse via phpMyAdmin).
3. **VS Code** with:
   - "Extension Pack for Java" (Microsoft)
   - "Spring Boot Extension Pack" (VMware/Pivotal)
   - (optional) "MySQL" extension, or use phpMyAdmin at `http://localhost/phpmyadmin`

## 2. Database setup

You don't need to create anything manually — `application.properties` uses
`createDatabaseIfNotExist=true` and `spring.jpa.hibernate.ddl-auto=update`,
so the app creates the `vit_result_db` database and all tables automatically
the first time it runs (as long as XAMPP's MySQL service is running on
`localhost:3306`).

If you'd rather set it up by hand, run `database_setup.sql` in phpMyAdmin or
the MySQL console — it creates the same schema and seeds the 4 subjects.

Default credentials assumed (standard XAMPP setup): user `root`, no password.
If your MySQL has a different user/password, edit:

```
src/main/resources/application.properties
  spring.datasource.username=...
  spring.datasource.password=...
```

## 3. Run the project in VS Code

1. Open the `vit-result-management` folder in VS Code.
2. Let the Java extension index the Maven project (bottom-right progress bar).
3. Start XAMPP MySQL.
4. Open `ResultManagementApplication.java` and click **Run** (the ▶ button
   above `main`), or use the Spring Boot Dashboard panel and click the
   run icon next to the project.
   - Alternatively, from a terminal in the project folder: `mvn spring-boot:run`
5. Visit **http://localhost:8080** in your browser.

## 4. Using the app

- **Dashboard (`/`)** — lists all students with quick links to view their
  result, edit, or delete them.
- **Add Student (`/students/new`)** — enter registration number, name,
  branch, semester, then MSE/ESE marks for each of the 4 subjects. A live
  preview shows the weighted total as you type.
- **Result (`/students/{id}/result`)** — shows subject-wise MSE/ESE
  breakdown, grade, grade point, total marks, overall percentage, SGPA, and
  PASS/FAIL status. Includes a "Print / Save as PDF" button.

The 4 subjects (Data Structures & Algorithms, DBMS, Operating Systems,
Computer Networks) are pre-loaded via `data.sql`. To change them, edit that
file (or the `subject` table directly) before first data entry.

## 5. Project structure

```
vit-result-management/
├── pom.xml
├── database_setup.sql              (optional manual schema)
├── src/main/java/com/vit/result/
│   ├── ResultManagementApplication.java
│   ├── model/            Student, Subject, Mark (JPA entities)
│   ├── repository/       Spring Data JPA repositories
│   ├── service/          ResultService (grade/SGPA calculation)
│   ├── controller/       StudentController (all routes)
│   ├── dto/               StudentForm, MarkInput, SubjectResult, ResultSummary
│   └── util/              GradeCalculator
└── src/main/resources/
    ├── application.properties
    ├── data.sql            (seeds the 4 subjects)
    ├── templates/          index.html, add-student.html, result.html
    └── static/css, static/js
```

## 6. Responsive design notes

- Layout uses CSS Grid/Flexbox with a mobile breakpoint at `720px`.
- On small screens the results table collapses into stacked cards
  (`data-label` attributes drive the mobile row labels).
- The subject mark-entry form uses a 2-column grid that becomes 1 column
  on mobile.
- A dedicated `@media print` stylesheet hides navigation/buttons so the
  result page prints cleanly (or saves as PDF via the browser's print dialog).
