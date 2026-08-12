#!/usr/bin/env python3
"""Validate marker PNG dimensions and the README's declared current marker."""

from __future__ import annotations

import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MARKERS = ROOT / "markers"
README = ROOT / "README.md"


def dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if len(data) < 24 or data[1:4] != b"PNG":
        raise ValueError(path.name + " is not a PNG")
    return struct.unpack(">II", data[16:24])


def state(path: Path) -> str:
    width, height = dimensions(path)
    ratio = max(width, height) / min(width, height)
    if ratio <= 1.35:
        return "current"
    if ratio >= 4.0:
        return "outdated"
    return "invalid"


def main() -> None:
    if state(MARKERS / "current-template.png") != "current":
        raise SystemExit("current template must be square")
    if state(MARKERS / "outdated-template.png") != "outdated":
        raise SystemExit("outdated template must be wide")

    match = re.search(r"<!-- current-marker:start -->([0-9]+)<!-- current-marker:end -->", README.read_text(encoding="utf-8"))
    if not match:
        raise SystemExit("README has no current marker")
    current = MARKERS / (match.group(1) + ".png")
    if not current.is_file() or state(current) != "current":
        raise SystemExit("README current marker is missing or not square")

    for path in MARKERS.glob("[0-9]*.png"):
        expected = "current" if path == current else "outdated"
        if state(path) != expected:
            raise SystemExit(path.name + " should be " + expected)
    print("Marker " + current.stem + " is current; all previous markers are retired.")


if __name__ == "__main__":
    main()
