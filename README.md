# Table predictor

A season-by-season Premier League table prediction league. Every predictor
ranks all 20 teams before the season starts; this site scores each prediction
against how the season actually finished and ranks predictors by accuracy.

Static site — HTML/CSS/vanilla JS, data as JSON. No build step, no backend.
Deploys straight to GitHub Pages.

## Live structure

```
index.html          Page shell
css/style.css        Design system
js/scoring.js         Scoring engine (also usable from Node, see below)
js/app.js             Rendering + interactivity
data/<season>/
  predictions.json    One row per predictor: { name, ranks: { team: position } }
  results.json         { teams: [...], table: { team: finalPosition } }
scripts/
  convert_questionpro.py    Converts a QuestionPro raw-data export into predictions.json
  convert_2024_25_excel.py  One-off converter for the legacy Excel workbook
```

## Scoring method

For each team: `delta = |actual position - predicted position|`.
Team accuracy: `(19 - delta) / 19` — exact call = 1.0, worst possible call
(e.g. predicting the eventual champions to finish last) = 0.0.

A predictor's score is the average accuracy across all 20 teams (equal
weights, matching the original spreadsheet's default). This is implemented
once in `js/scoring.js` and was validated against the legacy 2024/25 Excel
workbook's own computed leaderboard — the numbers match to the decimal.

## Adding a new season

1. Export the survey from QuestionPro as an Excel raw-data file.
2. Run:
   ```
   python3 scripts/convert_questionpro.py path/to/export.xlsx 2026-27 data/2026-27 --exclude <any junk response IDs>
   ```
   This writes `data/2026-27/predictions.json`. Check the printed "Skipped
   rows" list — anything flagged `test_response` is reported but only
   dropped if you pass its Response ID via `--exclude`.
3. Once the season finishes, add `data/2026-27/results.json` by hand (or
   script it from a table source) using the same shape as the existing
   files — `teams` array and `table: { team: finalPosition }`.
4. Add `"2026-27"` to the `SEASONS` array at the top of `js/app.js`.
5. Commit and push — GitHub Pages picks it up automatically.

## Notes on this season's data (2025-26)

- 18 raw responses; one (`139321048`, name "345345") was excluded as test
  junk. One other row is flagged `test_response` by QuestionPro but has a
  real respondent name (Ismayil Aliyev) attached — that one was kept.
- `results.json` for 2025-26 was compiled from public reporting on the
  season's final table (Arsenal champions, confirmed 24 May 2026); double
  check it against an official source before treating it as final record.

## Local development

Any static file server works, e.g.:
```
python3 -m http.server 8000
```
then open `http://localhost:8000`.
