#!/usr/bin/env python3
"""Publish a new QOLLOCK release marker from the checked-in PNG templates."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MARKERS = ROOT / "markers"
README = ROOT / "README.md"
CURRENT = MARKERS / "current-template.png"
OUTDATED = MARKERS / "outdated-template.png"
MARKER_NAME = re.compile(r"^[1-9][0-9]*\.png$")
CURRENT_LINE = re.compile(
    r"(<!-- current-marker:start -->)[0-9]+(<!-- current-marker:end -->)"
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish the next QOLLOCK marker.")
    parser.add_argument("marker", type=int, help="Next positive integer marker")
    args = parser.parse_args()
    if args.marker < 1:
        raise SystemExit("marker must be a positive integer")
    if not CURRENT.is_file() or not OUTDATED.is_file():
        raise SystemExit("marker templates are missing")

    target = MARKERS / (str(args.marker) + ".png")
    if target.exists():
        raise SystemExit("marker already exists: " + target.name)

    retired = []
    for marker in sorted(MARKERS.iterdir()):
        if marker.is_file() and MARKER_NAME.fullmatch(marker.name):
            shutil.copyfile(OUTDATED, marker)
            retired.append(marker.name)

    shutil.copyfile(CURRENT, target)

    readme = README.read_text(encoding="utf-8")
    updated, replacements = CURRENT_LINE.subn(
        r"\g<1>" + str(args.marker) + r"\g<2>", readme, count=1
    )
    if replacements != 1:
        raise SystemExit("README current-marker marker was not found")
    README.write_text(updated, encoding="utf-8")

    print("Published marker " + str(args.marker) + ".")
    if retired:
        print("Retired: " + ", ".join(retired))


if __name__ == "__main__":
    main()
