"""
Auto-append dark: Tailwind variants to className strings that don't have them.
Idempotent: skips if the dark variant is already present in the same className.

Run: python scripts/fix_dark_mode.py [--check] [path1 path2 ...]
Default scope: src/app and src/components.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (class-to-match, dark-variant-to-append)
# Order matters: specific before generic (e.g. bg-red-50 before bg-red)
RULES = [
    # Backgrounds
    ("bg-white", "dark:bg-gray-800"),
    ("bg-gray-50", "dark:bg-gray-900"),
    ("bg-gray-100", "dark:bg-gray-800"),
    ("bg-gray-200", "dark:bg-gray-700"),
    # Text colors
    ("text-gray-900", "dark:text-gray-100"),
    ("text-gray-800", "dark:text-gray-200"),
    ("text-gray-700", "dark:text-gray-300"),
    ("text-gray-600", "dark:text-gray-400"),
    ("text-gray-500", "dark:text-gray-400"),
    ("text-gray-400", "dark:text-gray-500"),
    # Borders
    ("border-gray-100", "dark:border-gray-700"),
    ("border-gray-200", "dark:border-gray-700"),
    ("border-gray-300", "dark:border-gray-600"),
    ("divide-gray-200", "dark:divide-gray-700"),
    # Hover states
    ("hover:bg-gray-50", "dark:hover:bg-gray-700"),
    ("hover:bg-gray-100", "dark:hover:bg-gray-700"),
    ("hover:text-gray-900", "dark:hover:text-gray-100"),
    # Tinted backgrounds (status pills) — add dark equivalents
    ("bg-blue-50", "dark:bg-blue-950/40"),
    ("bg-blue-100", "dark:bg-blue-900/40"),
    ("bg-green-50", "dark:bg-green-950/40"),
    ("bg-green-100", "dark:bg-green-900/40"),
    ("bg-red-50", "dark:bg-red-950/40"),
    ("bg-red-100", "dark:bg-red-900/40"),
    ("bg-amber-50", "dark:bg-amber-950/40"),
    ("bg-amber-100", "dark:bg-amber-900/40"),
    ("bg-yellow-50", "dark:bg-yellow-950/40"),
    ("bg-yellow-100", "dark:bg-yellow-900/40"),
    ("bg-purple-50", "dark:bg-purple-950/40"),
    ("bg-purple-100", "dark:bg-purple-900/40"),
    ("bg-indigo-50", "dark:bg-indigo-950/40"),
    ("bg-indigo-100", "dark:bg-indigo-900/40"),
    # Tinted text
    ("text-blue-600", "dark:text-blue-400"),
    ("text-blue-700", "dark:text-blue-300"),
    ("text-blue-800", "dark:text-blue-300"),
    ("text-green-600", "dark:text-green-400"),
    ("text-green-700", "dark:text-green-300"),
    ("text-green-800", "dark:text-green-300"),
    ("text-red-600", "dark:text-red-400"),
    ("text-red-700", "dark:text-red-300"),
    ("text-red-800", "dark:text-red-300"),
    ("text-amber-600", "dark:text-amber-400"),
    ("text-amber-700", "dark:text-amber-300"),
    ("text-amber-800", "dark:text-amber-300"),
    ("text-yellow-600", "dark:text-yellow-400"),
    ("text-yellow-700", "dark:text-yellow-300"),
    ("text-purple-600", "dark:text-purple-400"),
    ("text-purple-700", "dark:text-purple-300"),
    ("text-indigo-600", "dark:text-indigo-400"),
    ("text-indigo-700", "dark:text-indigo-300"),
]

# Build map: class -> dark variant for fast lookup
CLASS_TO_DARK = {c: d for c, d in RULES}

# Regex: find className values inside "..." or '...'
# (keep it simple — template literals with nesting are rare in this codebase)
ATTR_RE = re.compile(
    r'(className\s*=\s*)(["\'`])((?:\\.|(?!\2).)*)(\2)',
    re.DOTALL,
)

def dark_prefix(dark_variant: str) -> str:
    """Get prefix of dark variant — e.g. 'dark:bg-gray-800' -> 'dark:bg-'."""
    # Split on "-" keeps variant colons intact: "dark:bg-gray-800" -> ["dark:bg", "gray", "800"]
    first = dark_variant.split("-")[0]
    return first + "-"


def dedupe_dark_prefixes(tokens: list[str]) -> list[str]:
    """Remove earlier dark:<prefix>-* tokens when a later one exists for the same prefix.
    This lets us clean up duplicates from earlier script runs."""
    # First pass: find the LAST index for each dark:<prefix>
    last_idx: dict[str, int] = {}
    for i, t in enumerate(tokens):
        if t.startswith("dark:"):
            p = t.split("-")[0] + "-"
            last_idx[p] = i
    # Keep token if it's non-dark OR if it's the last occurrence of its prefix
    out = []
    for i, t in enumerate(tokens):
        if not t.startswith("dark:"):
            out.append(t)
        else:
            p = t.split("-")[0] + "-"
            if last_idx.get(p) == i:
                out.append(t)
            # else: skip earlier duplicate
    return out


def process_attr(attr_value: str) -> str:
    """Tokenize attr value; for each matching class token, add dark variant if no dark variant
    of the same property group already exists in the attr. Also dedupe existing dark prefixes."""
    tokens = attr_value.split()
    # Dedupe first (clean up past mistakes)
    tokens = dedupe_dark_prefixes(tokens)

    existing_dark_prefixes: set[str] = set()
    for t in tokens:
        if t.startswith("dark:"):
            p = t.split("-")[0] + "-"
            existing_dark_prefixes.add(p)

    new_tokens: list[str] = []
    added_darks: set[str] = set()

    for tok in tokens:
        new_tokens.append(tok)
        dark = CLASS_TO_DARK.get(tok)
        if not dark:
            continue
        prefix = dark_prefix(dark)
        if prefix in existing_dark_prefixes or dark in added_darks:
            continue
        new_tokens.append(dark)
        added_darks.add(dark)
        existing_dark_prefixes.add(prefix)

    return " ".join(new_tokens) if not attr_value.startswith(" ") else " " + " ".join(new_tokens)

def process_file(path: Path, check_only: bool = False) -> int:
    """Returns number of className attrs modified. Preserves original line endings."""
    try:
        raw = path.read_bytes()
    except Exception as e:
        print(f"  skip (read error): {path} — {e}")
        return 0

    # Detect line ending
    uses_crlf = b"\r\n" in raw
    content = raw.decode("utf-8")
    # Normalize to \n for processing
    if uses_crlf:
        content = content.replace("\r\n", "\n")

    changes = 0

    def replace_attr(match: re.Match) -> str:
        nonlocal changes
        prefix, quote, inner, closing = match.group(1), match.group(2), match.group(3), match.group(4)
        new_inner = process_attr(inner)
        if new_inner != inner:
            changes += 1
        return f"{prefix}{quote}{new_inner}{closing}"

    new_content = ATTR_RE.sub(replace_attr, content)

    if changes > 0 and not check_only:
        # Restore original line ending
        if uses_crlf:
            new_content = new_content.replace("\n", "\r\n")
        path.write_bytes(new_content.encode("utf-8"))

    return changes


def walk(roots: list[Path]) -> list[Path]:
    files = []
    for root in roots:
        if root.is_file():
            if root.suffix == ".tsx":
                files.append(root)
        else:
            files.extend(root.rglob("*.tsx"))
    return files


def main():
    args = sys.argv[1:]
    check_only = "--check" in args
    args = [a for a in args if a != "--check"]

    if args:
        roots = [Path(a).resolve() for a in args]
    else:
        roots = [ROOT / "src" / "app", ROOT / "src" / "components"]

    files = walk(roots)
    print(f"Scanning {len(files)} .tsx files{' (check mode)' if check_only else ''}...")

    total_changes = 0
    files_changed = 0
    for f in files:
        c = process_file(f, check_only=check_only)
        if c > 0:
            files_changed += 1
            total_changes += c
            rel = f.relative_to(ROOT)
            print(f"  {'would change' if check_only else 'fixed'} {c:3} attrs in {rel}")

    print(f"\n{'Would modify' if check_only else 'Modified'} {files_changed} files · {total_changes} className attrs total.")


if __name__ == "__main__":
    main()
