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
        "label": "1) How do you mostly drive?",
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
        "label": "2) What matters most for budget?",
        "options": ["Lowest cost", "Best value", "Premium features"],
        "weights": {
            "Lowest cost": {"compact": 2, "hybrid": 1},
            "Best value": {"crossover": 2, "sedan": 1},
            "Premium features": {"luxury": 2, "suv": 1},
        },
    },
    {
        "id": "style",
        "label": "3) What style do you prefer?",
        "options": ["Sporty", "Practical", "Comfort"],
        "weights": {
            "Sporty": {"sports": 2, "sedan": 1},
            "Practical": {"crossover": 2, "suv": 1, "truck": 1},
            "Comfort": {"luxury": 2, "suv": 1, "minivan": 1},
        },
    },
    {
        "id": "passengers",
        "label": "4) How many passengers do you usually carry?",
        "options": ["1-2", "3-4", "5+"],
        "weights": {
            "1-2": {"compact": 1, "sedan": 2, "sports": 1},
            "3-4": {"sedan": 1, "crossover": 2, "hybrid": 1},
            "5+": {"suv": 2, "minivan": 2, "truck": 1},
        },
    },
    {
        "id": "cargo",
        "label": "5) How important is cargo space?",
        "options": ["Low", "Medium", "High"],
        "weights": {
            "Low": {"compact": 2, "sports": 1},
            "Medium": {"sedan": 2, "crossover": 1},
            "High": {"suv": 2, "truck": 2, "minivan": 1},
        },
    },
    {
        "id": "efficiency",
        "label": "6) How important is fuel/energy efficiency?",
        "options": ["Not very", "Somewhat", "Very important"],
        "weights": {
            "Not very": {"truck": 1, "suv": 1, "sports": 1},
            "Somewhat": {"sedan": 1, "crossover": 1, "hybrid": 1},
            "Very important": {"electric": 2, "hybrid": 2, "compact": 1},
        },
    },
    {
        "id": "climate",
        "label": "7) What climate/road conditions are most common for you?",
        "options": ["Mostly mild", "Rain/snow often", "Mixed"],
        "weights": {
            "Mostly mild": {"compact": 1, "sedan": 1, "electric": 1},
            "Rain/snow often": {"suv": 2, "truck": 2, "crossover": 1},
            "Mixed": {"crossover": 2, "suv": 1, "sedan": 1},
        },
    },
    {
        "id": "commute",
        "label": "8) Typical daily commute distance?",
        "options": ["Under 15 miles", "15-40 miles", "Over 40 miles"],
        "weights": {
            "Under 15 miles": {"electric": 2, "compact": 1, "hybrid": 1},
            "15-40 miles": {"hybrid": 2, "sedan": 1, "crossover": 1},
            "Over 40 miles": {"sedan": 2, "hybrid": 1, "suv": 1},
        },
    },
    {
        "id": "ownership",
        "label": "9) Which ownership priority fits you best?",
        "options": ["Low maintenance", "Balanced costs", "Performance first"],
        "weights": {
            "Low maintenance": {"electric": 2, "hybrid": 1, "compact": 1},
            "Balanced costs": {"sedan": 1, "crossover": 2, "hybrid": 1},
            "Performance first": {"sports": 2, "luxury": 2, "suv": 1},
        },
    },
    {
        "id": "lifestyle",
        "label": "10) Which best describes your lifestyle?",
        "options": ["Urban solo", "Growing family", "Outdoor/adventure"],
        "weights": {
            "Urban solo": {"compact": 2, "electric": 1, "sedan": 1},
            "Growing family": {"crossover": 2, "suv": 2, "minivan": 1},
            "Outdoor/adventure": {"truck": 2, "suv": 2, "crossover": 1},
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
    st.markdown("Answer all 10 questions to get a vehicle type recommendation.")
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
