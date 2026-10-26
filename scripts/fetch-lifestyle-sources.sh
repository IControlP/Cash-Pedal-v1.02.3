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
[ -s "$DIR/Geos20245YR.txt" ] || curl -fsSL -o "$DIR/Geos20245YR.txt" "$ACS/documentation/Geos20245YR.txt"
for z in SARPP MARPP; do
  [ -s "$DIR/bea/${z}.zip" ] || curl -fsSL -o "$DIR/bea/${z}.zip" "https://apps.bea.gov/regional/zip/${z}.zip"
  unzip -oq "$DIR/bea/${z}.zip" -d "$DIR/bea"
done
[ -s "$DIR/taxfoundation-2026.html" ] || curl -fsSL -o "$DIR/taxfoundation-2026.html" "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/"
echo "Sources ready in $DIR"
