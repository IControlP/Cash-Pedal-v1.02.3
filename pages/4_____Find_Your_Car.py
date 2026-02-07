"""Find Your Car quiz page."""

import os
import sys

import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

QUESTIONS = [
    {
        "id": "usage",
        "label": "How do you mostly drive?",
        "options": ["City", "Highway", "Mixed", "Work/Family hauling"],
        "weights": {
            "City": {"electric": 2, "hybrid": 2, "compact": 1},
            "Highway": {"sedan": 2, "hybrid": 1, "crossover": 1},
            "Mixed": {"crossover": 2, "sedan": 1, "suv": 1},
            "Work/Family hauling": {"suv": 2, "truck": 2, "minivan": 1},
        },
    },
    {
        "id": "budget",
        "label": "What matters most for budget?",
        "options": ["Lowest cost", "Best value", "Premium features"],
        "weights": {
            "Lowest cost": {"compact": 2, "hybrid": 1},
            "Best value": {"crossover": 2, "sedan": 1},
            "Premium features": {"luxury": 2, "suv": 1},
        },
    },
    {
        "id": "style",
        "label": "What style do you prefer?",
        "options": ["Sporty", "Practical", "Comfort"],
        "weights": {
            "Sporty": {"sports": 2, "sedan": 1},
            "Practical": {"crossover": 2, "suv": 1, "truck": 1},
            "Comfort": {"luxury": 2, "suv": 1, "minivan": 1},
        },
    },
]

PROFILES = {
    "compact": "Compact/Economy Car",
    "sedan": "Sedan",
    "crossover": "Crossover",
    "suv": "SUV",
    "truck": "Truck",
    "hybrid": "Hybrid",
    "electric": "Electric Vehicle",
    "sports": "Sports Car",
    "luxury": "Luxury Vehicle",
    "minivan": "Minivan",
}


def score_answers(answers):
    scores = {k: 0 for k in PROFILES.keys()}
    for q in QUESTIONS:
        answer = answers.get(q["id"])
        if not answer:
            continue
        impacts = q["weights"].get(answer, {})
        for vehicle_type, value in impacts.items():
            if vehicle_type in scores:
                scores[vehicle_type] += value
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def main() -> None:
    initialize_session_state()
    apply_theme()

    st.set_page_config(
        page_title="Find Your Car - CashPedal",
        page_icon="🚘",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    st.title("Find Your Car")
    st.markdown("Answer a few questions to get a vehicle type recommendation.")
    st.markdown("---")

    answers = {}
    for question in QUESTIONS:
        answers[question["id"]] = st.radio(
            question["label"],
            question["options"],
            key=f"quiz_{question['id']}",
            horizontal=False,
        )

    if st.button("Show Recommendation", type="primary"):
        ranked = score_answers(answers)
        top3 = ranked[:3]
        st.subheader("Top Matches")
        for idx, (vehicle_type, score) in enumerate(top3, start=1):
            st.write(f"{idx}. **{PROFILES[vehicle_type]}** (score: {score})")

    st.markdown("---")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Open Single Vehicle Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
    with c2:
        if st.button("Open Multi-Vehicle Comparison"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")

    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
