#!/usr/bin/env python3
"""
Migration safety checker.

Usage: python check_migration_safety.py <migration_file> [<migration_file> ...]
Exit 0 = all safe, Exit 1 = unsafe patterns found.
"""

import re
import sys
from pathlib import Path


def _extract_balanced(text: str, start: int) -> str:
    """Extract balanced parenthesis content starting at index start (must be '(')."""
    depth = 0
    in_string: str | None = None
    i = start
    while i < len(text):
        ch = text[i]
        if in_string:
            if ch == "\\":
                i += 2  # skip escaped character
                continue
            if ch == in_string:
                in_string = None
        else:
            if ch in ('"', "'"):
                in_string = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        i += 1
    return text[start:]


def check_file(path: str) -> list[str]:
    """Return list of error messages for the file, or empty list if safe."""
    source = Path(path).read_text()
    lines = source.splitlines()
    errors: list[str] = []

    # Locate the upgrade() function (top-level only)
    upgrade_start: int | None = None
    for i, line in enumerate(lines):
        if re.match(r"^def upgrade\b", line):
            upgrade_start = i
            break

    if upgrade_start is None:
        return []

    # Find where the upgrade() body ends (next top-level statement)
    upgrade_end = len(lines)
    for i in range(upgrade_start + 1, len(lines)):
        line = lines[i]
        if line and not line[0].isspace() and line.strip():
            upgrade_end = i
            break

    body_lines = lines[upgrade_start + 1 : upgrade_end]
    upgrade_body = "\n".join(body_lines)

    # Scan for op.add_column( calls
    for match in re.finditer(r"op\.add_column\(", upgrade_body):
        match_pos = match.start()
        paren_pos = match.end() - 1  # position of the opening '('

        # 1-indexed line number in the original file
        line_offset = upgrade_body[:match_pos].count("\n")
        abs_line_num = (
            upgrade_start + line_offset + 2
        )  # +1 past def line, +1 for 1-index

        # Extract the complete op.add_column(...) call
        call_text = _extract_balanced(upgrade_body, paren_pos)

        # Check suppression comment on any line covered by this call
        call_line_count = call_text.count("\n")
        covered = body_lines[line_offset : line_offset + call_line_count + 1]
        if any("# migration-safety: ok" in ln for ln in covered):
            continue

        # Only flag calls where nullable=False is explicitly set
        if "nullable=False" not in call_text:
            continue

        # Look for sa.Column( inside the call and verify server_default= is present
        col_match = re.search(r"sa\.Column\(", call_text)
        if col_match is None:
            errors.append(
                f"{path}:{abs_line_num}: op.add_column with nullable=False requires "
                "server_default= for rolling-deploy safety"
            )
            continue

        col_paren = col_match.end() - 1
        col_text = _extract_balanced(call_text, col_paren)

        if "server_default=" not in col_text:
            errors.append(
                f"{path}:{abs_line_num}: op.add_column with nullable=False requires "
                "server_default= for rolling-deploy safety"
            )

    return errors


def main() -> None:
    files = sys.argv[1:]
    errors: list[str] = []
    for f in files:
        errors.extend(check_file(f))
    if errors:
        for e in errors:
            print(e)  # noqa: T201
        sys.exit(1)


if __name__ == "__main__":
    main()
