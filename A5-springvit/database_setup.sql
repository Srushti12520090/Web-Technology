-- Optional: run this manually in phpMyAdmin / MySQL console if you don't
-- want to rely on Hibernate's auto-create (spring.jpa.hibernate.ddl-auto=update).
-- The application will create these automatically on first run either way.

CREATE DATABASE IF NOT EXISTS vit_result_db;
USE vit_result_db;

CREATE TABLE IF NOT EXISTS subject (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL UNIQUE,
    subject_name VARCHAR(100) NOT NULL,
    credits INT DEFAULT 4
);

CREATE TABLE IF NOT EXISTS student (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reg_no VARCHAR(20) NOT NULL UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    branch VARCHAR(50),
    semester INT
);

CREATE TABLE IF NOT EXISTS mark (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT,
    subject_id BIGINT,
    mse_marks DOUBLE,
    ese_marks DOUBLE,
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject(id)
);

INSERT IGNORE INTO subject (id, subject_code, subject_name, credits) VALUES
(1, 'BCSE301L', 'Data Structures and Algorithms', 4),
(2, 'BCSE302L', 'Database Management Systems', 4),
(3, 'BCSE303L', 'Operating Systems', 4),
(4, 'BCSE304L', 'Computer Networks', 4);
