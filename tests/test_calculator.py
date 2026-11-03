"""
Unit Test Suite for Voice Calculator Core Logic
Using pytest for automated Continuous Integration (CI) verification.

Covers:
- Standard arithmetic: addition, subtraction, multiplication, division
- Division by zero exception handling
- Floating point and decimal precision
- Negative numbers across all operations
- Percentage calculations
- Square and square root calculations
- Square root of negative numbers exception handling
- Exponentiation / Power calculations
- Invalid input types and edge cases (NaN, Inf, booleans, string inputs)
- Trigonometric operations (sin, cos, tan)
- Safe simple expression parser
"""

import math
import os
import sys
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from calculator import (
    add,
    subtract,
    multiply,
    divide,
    percentage,
    square,
    square_root,
    power,
    sine,
    cosine,
    tangent,
    safe_evaluate_simple_expression,
)


# ==========================================
# 1. Addition Tests
# ==========================================
def test_addition_positive_integers():
    """Test addition with standard positive integers (e.g. '25 plus 40')."""
    assert add(25, 40) == 65.0


def test_addition_negative_numbers():
    """Test addition with negative numbers."""
    assert add(-15, -25) == -40.0
    assert add(50, -20) == 30.0


def test_addition_decimals():
    """Test addition with floating point numbers."""
    assert add(12.34, 5.66) == 18.0
    assert add(0.1, 0.2) == pytest.approx(0.3)


# ==========================================
# 2. Subtraction Tests
# ==========================================
def test_subtraction_positive_numbers():
    """Test basic subtraction."""
    assert subtract(100, 35) == 65.0


def test_subtraction_resulting_in_negative():
    """Test subtraction where subtrahend is greater than minuend."""
    assert subtract(20, 50) == -30.0


def test_subtraction_with_zero():
    """Test subtraction involving zero."""
    assert subtract(42, 0) == 42.0
    assert subtract(0, 42) == -42.0


# ==========================================
# 3. Multiplication Tests
# ==========================================
def test_multiplication_basic():
    """Test multiplication (e.g. 'Multiply 12 by 8')."""
    assert multiply(12, 8) == 96.0


def test_multiplication_with_zero():
    """Test multiplication by zero."""
    assert multiply(1234, 0) == 0.0
    assert multiply(0, 0) == 0.0


def test_multiplication_with_negatives():
    """Test multiplication with negative operands."""
    assert multiply(-6, 7) == -42.0
    assert multiply(-6, -7) == 42.0


def test_multiplication_decimals():
    """Test multiplication with decimal fractions."""
    assert multiply(2.5, 4.0) == 10.0
    assert multiply(0.5, 0.5) == 0.25


# ==========================================
# 4. Division Tests & Division by Zero
# ==========================================
def test_division_basic():
    """Test clean division (e.g. 'Divide 100 by 4')."""
    assert divide(100, 4) == 25.0


def test_division_with_fractions():
    """Test division producing recurring or decimal fraction."""
    assert divide(1, 2) == 0.5
    assert divide(10, 3) == pytest.approx(3.3333333333)


def test_division_negative_numbers():
    """Test division with negative numbers."""
    assert divide(-50, 5) == -10.0
    assert divide(50, -5) == -10.0
    assert divide(-50, -5) == 10.0


def test_division_by_zero_raises_exception():
    """Test that dividing by zero raises ZeroDivisionError."""
    with pytest.raises(ZeroDivisionError, match="Cannot divide by zero"):
        divide(100, 0)
    with pytest.raises(ZeroDivisionError, match="Cannot divide by zero"):
        divide(0, 0)


# ==========================================
# 5. Percentage Tests
# ==========================================
def test_percentage_standard():
    """Test calculating percentage (e.g. 'What is 15 percent of 200?')."""
    assert percentage(15, 200) == 30.0


def test_percentage_zero_and_hundred():
    """Test percentage edge cases (0% and 100%)."""
    assert percentage(0, 500) == 0.0
    assert percentage(100, 500) == 500.0


def test_percentage_decimals():
    """Test decimal percentage rates."""
    assert percentage(12.5, 80) == 10.0


# ==========================================
# 6. Square & Square Root Tests
# ==========================================
def test_square_operation():
    """Test squaring positive and negative numbers."""
    assert square(5) == 25.0
    assert square(-5) == 25.0
    assert square(0) == 0.0


def test_square_root_perfect_squares():
    """Test square root of standard square (e.g. 'square root of 144')."""
    assert square_root(144) == 12.0
    assert square_root(0) == 0.0
    assert square_root(1) == 1.0


def test_square_root_decimal():
    """Test square root of non-perfect square."""
    assert square_root(2) == pytest.approx(1.4142135624)


def test_square_root_negative_raises_exception():
    """Test that square root of negative numbers raises ValueError."""
    with pytest.raises(ValueError, match="Cannot calculate square root of a negative number"):
        square_root(-25)


# ==========================================
# 7. Power / Exponentiation Tests
# ==========================================
def test_power_positive_exponent():
    """Test power with positive base and exponent."""
    assert power(2, 8) == 256.0
    assert power(3, 3) == 27.0


def test_power_zero_exponent():
    """Test non-zero numbers raised to power 0 equal 1."""
    assert power(99, 0) == 1.0
    assert power(-5, 0) == 1.0


def test_power_negative_exponent():
    """Test negative powers (reciprocals)."""
    assert power(2, -2) == 0.25
    assert power(10, -3) == 0.001


def test_power_zero_base_negative_exponent():
    """Test 0 raised to a negative exponent raises ZeroDivisionError."""
    with pytest.raises(ZeroDivisionError):
        power(0, -2)


# ==========================================
# 8. Trigonometric Tests
# ==========================================
def test_trigonometric_functions():
    """Test sine, cosine, and tangent calculations in degrees."""
    assert sine(30) == pytest.approx(0.5)
    assert sine(90) == 1.0
    assert cosine(0) == 1.0
    assert cosine(60) == pytest.approx(0.5)
    assert tangent(45) == pytest.approx(1.0)


def test_tangent_undefined_raises_exception():
    """Test tangent for undefined angles (e.g. 90 degrees)."""
    with pytest.raises(ValueError, match="Tangent is undefined"):
        tangent(90)


# ==========================================
# 9. Invalid Input & Type Safety Tests
# ==========================================
def test_invalid_input_string():
    """Test that passing strings to math operations raises TypeError."""
    with pytest.raises(TypeError, match="must be an integer or float"):
        add("hello", 5)
    with pytest.raises(TypeError, match="must be an integer or float"):
        multiply(10, "world")


def test_invalid_input_none():
    """Test that passing None raises TypeError."""
    with pytest.raises(TypeError, match="must be an integer or float"):
        divide(None, 2)


def test_invalid_input_boolean():
    """Test that passing boolean values raises TypeError (preventing True=1 bug)."""
    with pytest.raises(TypeError, match="must be a number, got boolean"):
        add(True, 10)


def test_invalid_input_nan_and_infinity():
    """Test that passing NaN or Infinity raises ValueError."""
    with pytest.raises(ValueError, match="cannot be NaN or Infinite"):
        add(float("nan"), 10)
    with pytest.raises(ValueError, match="cannot be NaN or Infinite"):
        multiply(float("inf"), 2)


# ==========================================
# 10. Safe Simple Expression Parser Tests
# ==========================================
def test_safe_evaluate_simple_expression():
    """Test the safe non-eval arithmetic parser."""
    assert safe_evaluate_simple_expression("25 + 40") == 65.0
    assert safe_evaluate_simple_expression("12 * 8") == 96.0
    assert safe_evaluate_simple_expression("100 / 4") == 25.0
    assert safe_evaluate_simple_expression("2 ^ 8") == 256.0


def test_safe_evaluate_invalid_expression():
    """Test parser error handling on invalid string expressions."""
    with pytest.raises(ValueError):
        safe_evaluate_simple_expression("")
    with pytest.raises(ValueError):
        safe_evaluate_simple_expression("abc + def")
