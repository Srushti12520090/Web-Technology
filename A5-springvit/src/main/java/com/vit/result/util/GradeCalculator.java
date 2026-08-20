package com.vit.result.util;

/**
 * Converts a subject's total marks (out of 100, after applying the
 * MSE 30% / ESE 70% weighting) into a letter grade and grade point,
 * following a typical VIT-style 10-point scale.
 */
public final class GradeCalculator {

    private GradeCalculator() { }

    public static String getGrade(double total) {
        if (total >= 90) return "O";
        if (total >= 80) return "A+";
        if (total >= 70) return "A";
        if (total >= 60) return "B+";
        if (total >= 55) return "B";
        if (total >= 50) return "C";
        if (total >= 45) return "D";
        if (total >= 40) return "P";
        return "F";
    }

    public static int getGradePoint(double total) {
        if (total >= 90) return 10;
        if (total >= 80) return 9;
        if (total >= 70) return 8;
        if (total >= 60) return 7;
        if (total >= 55) return 6;
        if (total >= 50) return 5;
        if (total >= 45) return 4;
        if (total >= 40) return 3;
        return 0;
    }
}
