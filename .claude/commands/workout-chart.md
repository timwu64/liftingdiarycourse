Generate a bar chart of workouts per month for the past year.

Steps:
1. Ensure Python dependencies are installed: `pip install psycopg[binary] matplotlib python-dotenv`
2. Run the chart script: `python scripts/workout_chart.py`
3. The script reads `DATABASE_URL` from `.env`, queries the `workouts` table grouped by month over the last 12 months, and saves the chart to `workouts-per-month.png` at the project root (x-axis = month, y-axis = number of workouts).
4. Confirm the output file exists and report the total workout count printed by the script.
