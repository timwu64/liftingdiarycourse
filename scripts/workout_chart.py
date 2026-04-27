"""Plot workouts per month for the past year as a bar chart.

Reads DATABASE_URL from the project .env, queries the workouts table,
groups counts by month, and saves the chart to workouts-per-month.png.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import psycopg
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit("DATABASE_URL not found in .env")


def add_months(d: datetime, delta: int) -> datetime:
    total = (d.year * 12 + (d.month - 1)) + delta
    year, month = divmod(total, 12)
    return d.replace(year=year, month=month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)


def main() -> None:
    today = datetime.now()
    start_month = add_months(today, -11)

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT date_trunc('month', started_at) AS month, COUNT(*) AS count
                FROM workouts
                WHERE started_at >= %s
                GROUP BY month
                ORDER BY month
                """,
                (start_month,),
            )
            rows = cur.fetchall()

    counts_by_key = {row[0].strftime("%Y-%m"): int(row[1]) for row in rows}

    labels: list[str] = []
    counts: list[int] = []
    for i in range(12):
        m = add_months(start_month, i)
        labels.append(m.strftime("%b %Y"))
        counts.append(counts_by_key.get(m.strftime("%Y-%m"), 0))

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(labels, counts, color="#6366f1", edgecolor="#4338ca")
    ax.set_xlabel("Month")
    ax.set_ylabel("Number of Workouts")
    ax.set_title("Workouts per Month — Past Year")
    ax.set_axisbelow(True)
    ax.grid(axis="y", linestyle="--", alpha=0.4)

    for bar, value in zip(bars, counts):
        if value > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(),
                    str(value), ha="center", va="bottom", fontsize=9)

    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()

    output_path = PROJECT_ROOT / "workouts-per-month.png"
    plt.savefig(output_path, dpi=150)
    print(f"Chart saved to: {output_path}")
    print(f"Total workouts (past 12 months): {sum(counts)}")


if __name__ == "__main__":
    main()
