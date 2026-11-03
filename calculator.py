"""
Voice Calculator - Core Mathematical Logic Module
Software Engineering & DevOps Practicum

This module implements clean, modular, and robust arithmetic and scientific
mathematical operations without using Python's unsafe `eval()`.
All functions include strict input validation, type safety, and clear error handling.
"""

import math
from typing import Union

Number = Union[int, float]


def _validate_number(val: Number, name: str = "Input") -> float:
    """
    Validates that the given value is an integer or float.
    Raises TypeError if the input is not a number.
    Raises ValueError if the input is NaN or infinite.
    """
    if isinstance(val, bool):  # In Python, bool is a subclass of int
        raise TypeError(f"{name} must be a number, got boolean ({val}).")
    if not isinstance(val, (int, float)):
        raise TypeError(f"{name} must be an integer or float, got {type(val).__name__}.")
    if math.isnan(val) or math.isinf(val):
        raise ValueError(f"{name} cannot be NaN or Infinite.")
    return float(val)


def add(a: Number, b: Number) -> float:
    """
    Returns the sum of two numbers (a + b).
    """
    num_a = _validate_number(a, "First operand")
    num_b = _validate_number(b, "Second operand")
    return round(num_a + num_b, 10)


def subtract(a: Number, b: Number) -> float:
    """
    Returns the difference of two numbers (a - b).
    """
    num_a = _validate_number(a, "First operand")
    num_b = _validate_number(b, "Second operand")
    return round(num_a - num_b, 10)


def multiply(a: Number, b: Number) -> float:
    """
    Returns the product of two numbers (a * b).
    """
    num_a = _validate_number(a, "First operand")
    num_b = _validate_number(b, "Second operand")
    return round(num_a * num_b, 10)


def divide(a: Number, b: Number) -> float:
    """
    Returns the quotient of dividing a by b (a / b).
    Raises ZeroDivisionError when divisor is zero.
    """
    num_a = _validate_number(a, "Dividend")
    num_b = _validate_number(b, "Divisor")
    if num_b == 0.0:
        raise ZeroDivisionError("Cannot divide by zero.")
    return round(num_a / num_b, 10)


def percentage(value: Number, total: Number) -> float:
    """
    Calculates the given percentage of a total.
    Formula: (value / 100) * total
    Example: percentage(15, 200) -> 30.0 (15% of 200)
    """
    num_val = _validate_number(value, "Percentage value")
    num_tot = _validate_number(total, "Total value")
    return round((num_val / 100.0) * num_tot, 10)


def square(a: Number) -> float:
    """
    Returns the square of a number (a^2).
    """
    num_a = _validate_number(a, "Operand")
    return round(num_a ** 2, 10)


def square_root(a: Number) -> float:
    """
    Returns the principal square root of a non-negative number.
    Raises ValueError for negative numbers.
    """
    num_a = _validate_number(a, "Operand")
    if num_a < 0:
        raise ValueError("Cannot calculate square root of a negative number.")
    return round(math.sqrt(num_a), 10)


def power(base: Number, exponent: Number) -> float:
    """
    Returns base raised to the power of exponent (base^exponent).
    Raises ValueError for 0 raised to a negative power.
    """
    num_base = _validate_number(base, "Base")
    num_exp = _validate_number(exponent, "Exponent")
    if num_base == 0.0 and num_exp < 0:
        raise ZeroDivisionError("Zero cannot be raised to a negative power.")
    try:
        res = math.pow(num_base, num_exp)
        return round(res, 10)
    except OverflowError:
        raise OverflowError("Result exceeds maximum numeric limit.")


def sine(degrees: Number) -> float:
    """
    Returns the sine of an angle in degrees.
    """
    deg = _validate_number(degrees, "Angle")
    rad = math.radians(deg)
    return round(math.sin(rad), 10)


def cosine(degrees: Number) -> float:
    """
    Returns the cosine of an angle in degrees.
    """
    deg = _validate_number(degrees, "Angle")
    rad = math.radians(deg)
    return round(math.cos(rad), 10)


def tangent(degrees: Number) -> float:
    """
    Returns the tangent of an angle in degrees.
    Raises ValueError if angle has undefined tangent (e.g., 90, 270 deg).
    """
    deg = _validate_number(degrees, "Angle")
    if abs((deg - 90) % 180) < 1e-9:
        raise ValueError(f"Tangent is undefined for {deg} degrees.")
    rad = math.radians(deg)
    return round(math.tan(rad), 10)


def safe_evaluate_simple_expression(expression: str) -> float:
    """
    Safely parses and evaluates basic expressions like '25 + 40', '100 / 4',
    without using eval(). Designed for clean testing and CLI demonstration.
    Supported operators: +, -, *, /, ^
    """
    if not isinstance(expression, str) or not expression.strip():
        raise ValueError("Expression must be a non-empty string.")

    cleaned = expression.strip().replace(" ", "").replace("x", "*").replace("X", "*")

    for op, func in [("+", add), ("-", subtract), ("*", multiply), ("/", divide), ("^", power)]:
        # Look for operator not at start (to avoid breaking negative numbers)
        idx = cleaned.find(op, 1)
        if idx != -1:
            left_str = cleaned[:idx]
            right_str = cleaned[idx + 1 :]
            try:
                left_val = float(left_str)
                right_val = float(right_str)
            except ValueError:
                raise ValueError(f"Invalid operands in expression: '{expression}'")
            return func(left_val, right_val)

    # If single number
    try:
        return float(cleaned)
    except ValueError:
        raise ValueError(f"Unable to parse expression: '{expression}'")


if __name__ == "__main__":
    print("=" * 60)
    print(" Voice Calculator - Python Logic Demo")
    print("=" * 60)
    print(f"25 + 40       = {add(25, 40)}")
    print(f"100 - 35      = {subtract(100, 35)}")
    print(f"12 * 8        = {multiply(12, 8)}")
    print(f"100 / 4       = {divide(100, 4)}")
    print(f"15% of 200    = {percentage(15, 200)}")
    print(f"sqrt(144)     = {square_root(144)}")
    print(f"5^2           = {square(5)}")
    print(f"2^8           = {power(2, 8)}")
    print(f"sin(30 deg)   = {sine(30)}")
    print("=" * 60)

