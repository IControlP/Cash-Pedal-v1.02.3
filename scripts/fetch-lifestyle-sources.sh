#!/usr/bin/env bash
# Downloads the public source files the lifestyle data is built from.
# Usage: scripts/fetch-lifestyle-sources.sh [cache-dir]   (default: .cache/lifestyle)
set -euo pipefail
DIR="${1:-.cache/lifestyle}"
mkdir -p "$DIR/bea"
ACS=https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF
for t in b01003 b25064 b25077 b25031 b25103; do
  [ -s "$DIR/acsdt5y2024-$t.dat" ] || curl -fsSL -o "$DIR/acsdt5y2024-$t.dat" "$ACS/data/5YRData/acsdt5y2024-$t.dat"
done
for t in b25064 b25077 b25031 b25103; do
  [ -s "$DIR/acsdt1y2024-$t.dat" ] || curl -fsSL -o "$DIR/acsdt1y2024-$t.dat" "$ACS/data/1YRData/acsdt1y2024-$t.dat"
done
[ -s "$DIR/Geos20245YR.txt" ] || curl -fsSL -o "$DIR/Geos20245YR.txt" "$ACS/documentation/Geos20245YR.txt"
for z in SARPP MARPP; do
  [ -s "$DIR/bea/${z}.zip" ] || curl -fsSL -o "$DIR/bea/${z}.zip" "https://apps.bea.gov/regional/zip/${z}.zip"
  unzip -oq "$DIR/bea/${z}.zip" -d "$DIR/bea"
done
[ -s "$DIR/taxfoundation-2026.html" ] || curl -fsSL -o "$DIR/taxfoundation-2026.html" "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/"
# MIT Living Wage Calculator typical expenses (child care) — one small page per
# state and per metro area. Cached; re-run only to refresh. Polite: 3 parallel, short pause.
mkdir -p "$DIR/mit/states" "$DIR/mit/metros"
for f in 01 02 04 05 06 08 09 10 11 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56; do
  [ -s "$DIR/mit/states/$f.html" ] || { curl -fsSL --retry 2 -o "$DIR/mit/states/$f.html" "https://livingwage.mit.edu/states/$f" || rm -f "$DIR/mit/states/$f.html"; sleep 0.3; }
done
python3 - "$DIR" <<'PY' | xargs -P 3 -I{} sh -c 'f="$0/mit/metros/{}.html"; [ -s "$f" ] || { curl -fsSL --retry 2 -o "$f" "https://livingwage.mit.edu/metros/{}" || rm -f "$f"; sleep 0.3; }' "$DIR"
import csv, sys
rows = csv.reader(open(sys.argv[1] + "/bea/MARPP_MSA_2008_2024.csv", encoding="latin-1"))
seen = set()
for r in rows:
    if r and r[0].strip().strip('"').isdigit() and r[0].strip('" ') not in ("00000", "00999"):
        seen.add(r[0].strip('" '))
print("\n".join(sorted(seen)))
PY
echo "Sources ready in $DIR"
