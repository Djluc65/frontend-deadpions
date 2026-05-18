import csv
import os
import re


ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "i18n_audit.csv")

IGNORE_DIRS = {
    "node_modules",
    "ios",
    "android",
    "web",
    "__tests__",
    "tests",
    ".expo",
    ".expo-home",
    ".git",
}
EXTS = {".js", ".jsx", ".ts", ".tsx"}


def walk(dir_path: str):
    for base, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for fn in files:
            if os.path.splitext(fn)[1] in EXTS:
                yield os.path.join(base, fn)


def rel(p: str) -> str:
    return os.path.relpath(p, ROOT)


def line_no(txt: str, idx: int) -> int:
    return txt.count("\n", 0, idx) + 1


def clean(s: str) -> str:
    s = s.replace("\\n", "\n").replace("\\t", "\t")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def looks_like_secret(s: str) -> bool:
    if s.startswith(("sk_", "pk_", "SG.", "mongodb")):
        return True
    if ".apps.googleusercontent.com" in s:
        return True
    if "ca-app-pub-" in s:
        return True
    if re.fullmatch(r"[A-Fa-f0-9]{16,}", s or ""):
        return True
    return False


def skip(s: str) -> bool:
    if not s:
        return True
    if len(s) < 2:
        return True
    if len(s) > 220:
        return True
    if looks_like_secret(s):
        return True
    if s.startswith(("http://", "https://", "/", "../", "./")):
        return True
    if re.fullmatch(r"[0-9.]+", s):
        return True
    return False


RE_TEXT = re.compile(r"<Text\b[^>]*>([\s\S]*?)</Text>")
RE_PLACEHOLDER = re.compile(
    r"\bplaceholder\s*=\s*(?:\{\s*)?(?:\"([^\"]*)\"|'([^']*)')(?:\s*\})?"
)
RE_TITLE = re.compile(r"\btitle\s*=\s*(?:\{\s*)?(?:\"([^\"]*)\"|'([^']*)')(?:\s*\})?")
RE_APPALERT = re.compile(
    r"\bappAlert\(\s*(?:\"([^\"]*)\"|'([^']*)')\s*,\s*(?:\"([^\"]*)\"|'([^']*)')",
    re.DOTALL,
)
RE_STACK = re.compile(r"<Stack\.Screen\s+name\s*=\s*(?:\{\s*)?(?:\"([^\"]*)\"|'([^']*)')")
RE_TAB = re.compile(r"<Tab\.Screen\s+name\s*=\s*(?:\{\s*)?(?:\"([^\"]*)\"|'([^']*)')")


def main():
    entries = []
    seen = set()

    def add(kind: str, value: str, file: str, ln: int, extra: str = ""):
        value = clean(value)
        if skip(value):
            return
        key = (kind, value, file, ln, extra)
        if key in seen:
            return
        seen.add(key)
        entries.append((kind, value, file, ln, extra))

    # Routes
    for nav in [
        os.path.join(SRC, "navigation", "AppNavigator.js"),
        os.path.join(SRC, "navigation", "HomeTabNavigator.js"),
    ]:
        if not os.path.exists(nav):
            continue
        txt = open(nav, "r", encoding="utf-8").read()
        for m in RE_STACK.finditer(txt):
            add("route_stack", m.group(1) or m.group(2) or "", rel(nav), line_no(txt, m.start()))
        for m in RE_TAB.finditer(txt):
            add("route_tab", m.group(1) or m.group(2) or "", rel(nav), line_no(txt, m.start()))

    # UI strings
    for fp in walk(SRC):
        txt = open(fp, "r", encoding="utf-8").read()
        r = rel(fp)

        for m in RE_TEXT.finditer(txt):
            raw = m.group(1)
            if "{" in raw or "}" in raw:
                continue
            val = clean(raw)
            if val and not re.fullmatch(r"[\W_]+", val):
                add("text", val, r, line_no(txt, m.start()))

        for m in RE_PLACEHOLDER.finditer(txt):
            add("placeholder", m.group(1) or m.group(2) or "", r, line_no(txt, m.start()))

        for m in RE_TITLE.finditer(txt):
            add("title", m.group(1) or m.group(2) or "", r, line_no(txt, m.start()))

        for m in RE_APPALERT.finditer(txt):
            title = m.group(1) or m.group(2) or ""
            msg = m.group(3) or m.group(4) or ""
            add("alert_title", title, r, line_no(txt, m.start()))
            add("alert_message", msg, r, line_no(txt, m.start()))

    # translations values (FR/EN)
    tr = os.path.join(SRC, "utils", "translations.js")
    if os.path.exists(tr):
        cur = None
        for i, line in enumerate(open(tr, "r", encoding="utf-8").read().splitlines(), start=1):
            m = re.match(r"\s*(fr|en)\s*:\s*\{\s*$", line)
            if m:
                cur = m.group(1)
                continue
            if cur:
                if re.match(r"\s*\}\s*,?\s*$", line):
                    cur = None
                    continue
                m2 = re.match(r"\s*([a-zA-Z0-9_]+)\s*:\s*'([^']*)'\s*,?\s*$", line)
                if m2:
                    key = f"{cur}.{m2.group(1)}"
                    add("translation", m2.group(2), rel(tr), i, key)

    entries.sort(key=lambda x: (x[0], x[2], x[3], x[1]))

    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["kind", "value", "file", "line", "extra"])
        w.writerows(entries)

    print(f"OK: wrote {len(entries)} rows to {OUT}")


if __name__ == "__main__":
    main()
