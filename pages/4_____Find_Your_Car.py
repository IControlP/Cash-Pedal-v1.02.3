"""
Find Your Perfect Car - Personality Quiz Page
A fun, interactive quiz that matches users with their ideal vehicle
"""

import streamlit as st
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from session_manager import initialize_session_state
from theme_utils import apply_theme, get_footer_html

# Page configuration
st.set_page_config(
    page_title="Find Your Perfect Car - CashPedal",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Quiz questions with scoring categories - Fun & Playful!
QUIZ_QUESTIONS = [
    {
        "id": "point_a_to_b",
        "question": "To me, a car is just a thing to get me from point A to point B",
        "emoji": ",
        "category": "mindset",
        "impacts": {"economy": 3, "sedan": 2, "hybrid": 1, "minivan": 1, "sports": -3, "luxury": -2, "truck": -1}
    },
    {
        "id": "car_person",
        "question": "I've definitely watched a car review video at 2am... for fun",
        "emoji": ",
        "category": "mindset",
        "impacts": {"sports": 3, "luxury": 2, "truck": 2, "electric": 1, "economy": -2, "minivan": -2}
    },
    {
        "id": "mobile_wardrobe",
        "question": "My car is basically a mobile closet - there's a outfit for every occasion in there",
        "emoji": ",
        "category": "lifestyle",
        "impacts": {"suv": 2, "crossover": 2, "minivan": 2, "sedan": 1, "truck": 1, "sports": -3, "economy": -1}
    },
    {
        "id": "avoid_costs",
        "question": "I'd rather spend money on literally anything else besides my car",
        "emoji": "
        "category": "financial",
        "impacts": {"economy": 3, "hybrid": 2, "sedan": 2, "electric": 1, "luxury": -3, "sports": -3, "truck": -2}
    },
    {
        "id": "valet_moment",
        "question": "I secretly (or not so secretly) love the valet parking moment",
        "emoji": ",
        "category": "values",
        "impacts": {"luxury": 3, "sports": 3, "truck": 1, "economy": -3, "minivan": -2, "hybrid": -1}
    },
    {
        "id": "kids_chaos",
        "question": "My backseat looks like a snack explosion happened... and that's okay",
        "emoji": ",
        "category": "lifestyle",
        "impacts": {"minivan": 3, "suv": 2, "crossover": 2, "sedan": 0, "sports": -3, "luxury": -2}
    },
    {
        "id": "zoom_zoom",
        "question": "When the light turns green, I like to be the first one gone",
        "emoji": ",
        "category": "driving",
        "impacts": {"sports": 3, "luxury": 2, "electric": 2, "truck": 0, "economy": -2, "minivan": -2}
    },
    {
        "id": "planet_love",
        "question": "I feel guilty every time I fill up at a gas station",
        "emoji": "
        "category": "values",
        "impacts": {"electric": 3, "hybrid": 3, "economy": 1, "truck": -3, "sports": -2, "suv": -1}
    },
    {
        "id": "home_depot_run",
        "question": "I've definitely tried to fit something way too big into a car that was way too small",
        "emoji": ",
        "category": "practical",
        "impacts": {"truck": 3, "suv": 2, "crossover": 1, "minivan": 1, "sedan": -1, "sports": -3, "economy": -2}
    },
    {
        "id": "parking_warrior",
        "question": "I can parallel park in a spot that would make others sweat",
        "emoji": ",
        "category": "practical",
        "impacts": {"economy": 2, "sedan": 2, "sports": 1, "crossover": 0, "suv": -2, "truck": -3, "minivan": -2}
    }
]

# Vehicle type profiles for matching
VEHICLE_PROFILES = {
    "suv": {
        "name": "SUV / Crossover",
        "emoji": "",
        "tagline": "The 'I Need Options' Mobile",
        "description": "You're the friend everyone calls when they're moving apartments. Your car is ready for soccer practice, camping trips, AND looking good at brunch. Basically, you want a Swiss Army knife with wheels.",
        "perfect_for": ["People who say 'let's take my car'", "Weekend warriors", "Costco power shoppers", "Weather? What weather?"],
        "consider": ["Gas station frequent flyer miles", "Parking lot anxiety", "Everyone asks you to help them move"],
        "top_picks": [
            {"make": "Toyota", "model": "RAV4", "why": "Will probably outlive us all"},
            {"make": "Honda", "model": "CR-V", "why": "Mary Poppins bag of car space"},
            {"make": "Mazda", "model": "CX-5", "why": "Actually fun to drive (seriously)"}
        ],
        "color": "#2E7D32"
    },
    "sedan": {
        "name": "Sedan",
        "emoji": "
        "tagline": "The Sensible Queen/King",
        "description": "You've got your life together and your car reflects that. No drama, no fuss, just reliable transportation that doesn't make you cry at the pump. Your accountant would be proud.",
        "perfect_for": ["Adulting champions", "Parallel parking pros", "People who actually check their tire pressure", "Highway hypermilers"],
        "consider": ["Your IKEA trips require planning", "Slightly less 'adventure vibes'", "Your outdoorsy friends might judge"],
        "top_picks": [
            {"make": "Honda", "model": "Accord", "why": "Peak 'I make good decisions' energy"},
            {"make": "Toyota", "model": "Camry", "why": "The official car of 'it just works'"},
            {"make": "Mazda", "model": "Mazda3", "why": "Looks way more expensive than it is"}
        ],
        "color": "#1565C0"
    },
    "truck": {
        "name": "Pickup Truck",
        "emoji": ",
        "tagline": "The 'Hold My Beer' Vehicle",
        "description": "You've never said 'that won't fit' because everything fits. Whether you actually need to haul stuff or just like knowing you COULD haul stuff, trucks deliver that big capability energy.",
        "perfect_for": ["DIY legends", "Boat owners", "People who help everyone move (again)", "Tailgate party hosts"],
        "consider": ["Gas stations know you by name", "Parking structures are your nemesis", "Friends with trucks have no weekends"],
        "top_picks": [
            {"make": "Ford", "model": "F-150", "why": "There's a reason it's #1 for like 47 years"},
            {"make": "Toyota", "model": "Tacoma", "why": "Will literally never die"},
            {"make": "Ram", "model": "1500", "why": "Your living room wishes it was this comfy"}
        ],
        "color": "#F57C00"
    },
    "sports": {
        "name": "Sports Car",
        "emoji": ",
        "tagline": "The 'Life's Too Short' Machine",
        "description": "You understand that cars should make you FEEL something. Every on-ramp is an opportunity, every curve is a conversation, and practicality is someone else's problem.",
        "perfect_for": ["People who take the long way home", "Driving playlist curators", "Weekend canyon carvers", "Those who smile at engine sounds"],
        "consider": ["Your spine on bad roads", "Insurance agents might laugh/cry", "Groceries go in the passenger seat"],
        "top_picks": [
            {"make": "Mazda", "model": "MX-5 Miata", "why": "Pure joy, attainable price"},
            {"make": "Ford", "model": "Mustang", "why": "American dream on four wheels"},
            {"make": "Toyota", "model": "GR86", "why": "Engineer's love letter to driving"}
        ],
        "color": "#C62828"
    },
    "luxury": {
        "name": "Luxury Vehicle",
        "emoji": "
        "tagline": "The 'Treat Yourself' Chariot",
        "description": "You work hard and your car should reflect that. Butter-soft leather, a sound system that slaps, and a badge that says 'yes, I have arrived.' Self-care has wheels now.",
        "perfect_for": ["Corner office energy", "People who appreciate the finer things", "Massage seat enthusiasts", "Valet parking fans"],
        "consider": ["Maintenance bills need their own budget line", "Depreciation is... humbling", "You'll become a car snob (it happens)"],
        "top_picks": [
            {"make": "Lexus", "model": "ES", "why": "Luxury + Toyota reliability = chef's kiss"},
            {"make": "BMW", "model": "3 Series", "why": "That badge hits different"},
            {"make": "Mercedes-Benz", "model": "C-Class", "why": "Timeless flex"}
        ],
        "color": "#6A1B9A"
    },
    "economy": {
        "name": "Economy Car",
        "emoji": "
        "tagline": "The 'Money Isn't Everything' Genius",
        "description": "While everyone else is car-broke, you're out here living your best life with money left over for actual fun stuff. Big brain move? Getting from A to B without the financial trauma.",
        "perfect_for": ["Financial wizards", "People with actual hobbies", "City dwellers", "Anyone who's done the math"],
        "consider": ["Highway merging takes commitment", "Your friends' cars are fancier (but so are their payments)", "Basic is a feature, not a bug"],
        "top_picks": [
            {"make": "Honda", "model": "Civic", "why": "The GOAT of sensible decisions"},
            {"make": "Toyota", "model": "Corolla", "why": "50 million owners can't be wrong"},
            {"make": "Hyundai", "model": "Elantra", "why": "Punches way above its price"}
        ],
        "color": "#00695C"
    },
    "electric": {
        "name": "Electric Vehicle",
        "emoji": ",
        "tagline": "The 'Living in 2035' Pioneer",
        "description": "Gas stations? Don't know her. You're charging at home like a smartphone and smugly passing every pump. Plus that instant torque makes every green light feel like a launch sequence.",
        "perfect_for": ["Tech early adopters", "Home charging havers", "Instant torque addicts", "People who like saying 'I don't buy gas'"],
        "consider": ["Road trip planning becomes a skill", "Apartment charging is... complicated", "You WILL talk about your EV at parties"],
        "top_picks": [
            {"make": "Tesla", "model": "Model 3", "why": "The one that proved EVs are cool"},
            {"make": "Hyundai", "model": "Ioniq 6", "why": "Wild range, wilder styling"},
            {"make": "Chevrolet", "model": "Equinox EV", "why": "Finally, an affordable family EV"}
        ],
        "color": "#00838F"
    },
    "hybrid": {
        "name": "Hybrid",
        "emoji": "",
        "tagline": "The 'Best of Both Worlds' Strategist",
        "description": "You want to be eco-friendly but also want to drive to grandma's house 6 states away without a charging strategy. Having your cake and eating it too? That's just good planning.",
        "perfect_for": ["Range anxiety avoiders", "MPG obsessors", "Apartment dwellers who can't charge", "People who like watching efficiency gauges"],
        "consider": ["Two powertrains = more complexity", "Trunk space sacrifices", "EV purists might side-eye you"],
        "top_picks": [
            {"make": "Toyota", "model": "Prius", "why": "The OG hybrid, still slaying"},
            {"make": "Honda", "model": "Accord Hybrid", "why": "Stealth fuel sipper"},
            {"make": "Toyota", "model": "RAV4 Hybrid", "why": "SUV life, sedan fuel bills"}
        ],
        "color": "#558B2F"
    },
    "minivan": {
        "name": "Minivan",
        "emoji": ",
        "tagline": "The 'I've Embraced My Destiny' Legend",
        "description": "You've achieved final form. While others struggle with car seats and cargo, you're living in automotive enlightenment. Sliding doors are superior and you're not afraid to say it.",
        "perfect_for": ["Carpool champions", "Snack distribution specialists", "People who've given up pretending", "Ultimate road trip commanders"],
        "consider": ["Your cool factor... evolves", "Parking lots become your territory", "You'll defend minivans at parties now"],
        "top_picks": [
            {"make": "Honda", "model": "Odyssey", "why": "The one minivan people actually want"},
            {"make": "Toyota", "model": "Sienna", "why": "Hybrid only = stealth fuel savings"},
            {"make": "Kia", "model": "Carnival", "why": "Looks like an SUV, functions like magic"}
        ],
        "color": "#5D4037"
    }
}


def get_slider_label(value):
    """Get descriptive label for slider value"""
    labels = {
        1: "Not me at all ",
        2: "Meh, not really",
        3: "Sometimes? ,
        4: "Yeah, pretty much",
        5: "That's SO me 
    }
    return labels.get(value, "Sometimes? )


def calculate_results(answers):
    """Calculate vehicle type scores based on quiz answers"""
    scores = {
        "suv": 50,
        "sedan": 50,
        "truck": 50,
        "sports": 50,
        "luxury": 50,
        "economy": 50,
        "electric": 50,
        "hybrid": 50,
        "minivan": 50,
        "crossover": 50,
        "japanese": 50,
        "european": 50,
        "awd": 50
    }
    
    for question_id, answer in answers.items():
        # Find the question
        question = next((q for q in QUIZ_QUESTIONS if q["id"] == question_id), None)
        if question:
            # Convert 1-5 scale to -2 to +2 multiplier
            multiplier = answer - 3  # 1->-2, 2->-1, 3->0, 4->+1, 5->+2
            
            # Apply impacts
            for vehicle_type, impact in question.get("impacts", {}).items():
                if vehicle_type in scores:
                    scores[vehicle_type] += impact * multiplier
    
    # Combine related categories
    # Add crossover score to SUV
    scores["suv"] += scores.get("crossover", 0) * 0.5
    
    # Apply Japanese reliability bonus to economy and sedan
    japanese_bonus = scores.get("japanese", 50) - 50
    scores["economy"] += japanese_bonus * 0.3
    scores["sedan"] += japanese_bonus * 0.3
    
    # Apply AWD preference to SUV and crossover
    awd_bonus = scores.get("awd", 50) - 50
    scores["suv"] += awd_bonus * 0.5
    
    # Remove helper categories
    main_categories = ["suv", "sedan", "truck", "sports", "luxury", "economy", "electric", "hybrid", "minivan"]
    final_scores = {k: max(0, min(100, v)) for k, v in scores.items() if k in main_categories}
    
    return final_scores


def get_top_matches(scores, num_results=3):
    """Get top matching vehicle types"""
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_scores[:num_results]


def display_result_card(vehicle_type, score, rank):
    """Display a result card for a vehicle type"""
    profile = VEHICLE_PROFILES.get(vehicle_type, {})
    
    if rank == 1:
        st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, {profile.get('color', '#1E88E5')}22, {profile.get('color', '#1E88E5')}11);
            border-left: 5px solid {profile.get('color', '#1E88E5')};
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        ">
            <h2 style="margin:0; color: {profile.get('color', '#1E88E5')}">
                 #{rank} Match: {profile.get('emoji', ' {profile.get('name', vehicle_type.title())}
            </h2>
            <p style="font-size: 1.3rem; font-style: italic; margin: 0.5rem 0; color: #555;">
                "{profile.get('tagline', '')}"
            </p>
            <p style="margin: 1rem 0;">{profile.get('description', '')}</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div style="
            background-color: #f8f9fa;
            border-left: 4px solid {profile.get('color', '#666')};
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.5rem;
        ">
            <h3 style="margin:0; color: {profile.get('color', '#333')}">
                #{rank}: {profile.get('emoji', ' {profile.get('name', vehicle_type.title())}
            </h3>
            <p style="font-style: italic; margin: 0.3rem 0; color: #666; font-size: 0.95rem;">
                "{profile.get('tagline', '')}"
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    return profile


def main():
    """Car Personality Quiz Page"""
    # Initialize session state
    initialize_session_state()
    
    # Apply CashPedal theme (handles device/dark mode detection)
    apply_theme()
    
    # Initialize quiz state
    if 'quiz_started' not in st.session_state:
        st.session_state.quiz_started = False
    if 'quiz_complete' not in st.session_state:
        st.session_state.quiz_complete = False
    if 'quiz_answers' not in st.session_state:
        st.session_state.quiz_answers = {}
    
    # Custom CSS
    st.markdown("""
        <style>
        .quiz-header {
            text-align: center;
            padding: 2rem 0;
        }
        .quiz-title {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(90deg, #1E88E5, #7B1FA2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        .quiz-subtitle {
            font-size: 1.2rem;
            color: #666;
        }
        .question-card {
            background-color: #e3f2fd;
            border-radius: 15px;
            padding: 1.2rem;
            margin: 0.8rem 0;
            border-left: 5px solid #1E88E5;
            border: 2px solid #1E88E5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .question-card strong {
            color: #1a1a1a !important;
        }
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .question-card {
                background-color: #1e3a5f;
                border-color: #42a5f5;
            }
            .question-card strong {
                color: #ffffff !important;
            }
        }
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .question-card {
                padding: 1rem;
                margin: 0.5rem 0;
                font-size: 0.95rem;
            }
            .quiz-title {
                font-size: 1.8rem;
            }
            .quiz-subtitle {
                font-size: 1rem;
            }
        }
        .result-header {
            text-align: center;
            padding: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            color: white;
            margin-bottom: 2rem;
        }
        .stSlider > div > div > div > div {
            background: linear-gradient(90deg, #ef5350, #ffee58, #66bb6a);
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown("""
        <div class="quiz-header">
            <p class="quiz-title"> Find Your Perfect Car</p>
            <p class="quiz-subtitle">10 totally scientific* questions to discover your automotive soulmate</p>
            <p style="font-size: 0.8rem; color: #999;">*not actually scientific</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.header(" Quiz Progress")
        
        if st.session_state.quiz_complete:
            st.success(" Quiz Complete!")
            if st.button(" Retake Quiz"):
                st.session_state.quiz_started = False
                st.session_state.quiz_complete = False
                st.session_state.quiz_answers = {}
                st.rerun()
        elif st.session_state.quiz_started:
            answered = len(st.session_state.quiz_answers)
            total = len(QUIZ_QUESTIONS)
            st.progress(answered / total)
            st.write(f"Questions answered: {answered}/{total}")
        
        st.markdown("---")
        st.header(" Quick Links")
        if st.button(" Vehicle Calculator"):
            st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        if st.button(" Compare Vehicles"):
            st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
    
    # Main content
    if not st.session_state.quiz_started and not st.session_state.quiz_complete:
        # Welcome screen
        st.markdown("---")
        
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            st.markdown("""
            ###  How It Works
            
            1. **Pick Your Answer** - Select the circle that best describes you
            2. **No Wrong Answers** - Unless you lie to yourself 
            3. **Get Matched** - We'll reveal your top 3 car soulmates
            4. **Mind = Blown** - Or mildly amused. Either works.
            
            ---
            
            ###  Takes about 60 seconds!
            
            *Shorter than your last doom scroll*
            """)
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            if st.button(" Let's Do This!", use_container_width=True, type="primary"):
                st.session_state.quiz_started = True
                st.session_state.quiz_answers = {}
                st.rerun()
    
    elif st.session_state.quiz_started and not st.session_state.quiz_complete:
        # Quiz questions
        st.markdown("### How much do you agree?")
        st.caption("Select the option that best describes how you feel")
        
        # Radio button options
        options = [
            "Strongly Disagree 
            "Disagree  
            "Neutral 
            "Agree ",
            "Strongly Agree 
        ]
        
        # Display all questions
        for i, question in enumerate(QUIZ_QUESTIONS):
            st.markdown(f"""
            <div class="question-card">
                <span style="font-size: 1.5rem;">{question['emoji']}</span>
                <strong style="font-size: 1.1rem;"> {question['question']}</strong>
            </div>
            """, unsafe_allow_html=True)
            
            # Get default value (convert to index 0-4)
            default_val = st.session_state.quiz_answers.get(question['id'], 3)
            default_index = default_val - 1  # Convert 1-5 to 0-4
            
            # Create radio buttons
            answer_label = st.radio(
                f"q_{question['id']}",
                options=options,
                index=default_index,
                key=f"radio_{question['id']}",
                label_visibility="collapsed",
                horizontal=False
            )
            
            # Convert answer back to 1-5 scale
            answer = options.index(answer_label) + 1
            
            # Store answer
            st.session_state.quiz_answers[question['id']] = answer
            st.markdown("<br>", unsafe_allow_html=True)
        
        # Submit button
        st.markdown("---")
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button(" Reveal My Car Soulmate!", use_container_width=True, type="primary"):
                st.session_state.quiz_complete = True
                st.rerun()
    
    else:
        # Results page
        st.markdown("""
        <div class="result-header">
            <h1 style="margin:0;"> The Results Are In!</h1>
            <p style="margin:0.5rem 0 0 0; font-size: 1.1rem;">We've analyzed your vibe and found your automotive soulmates...</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Calculate results
        scores = calculate_results(st.session_state.quiz_answers)
        top_matches = get_top_matches(scores, 3)
        
        # Display top 3 matches
        for rank, (vehicle_type, score) in enumerate(top_matches, 1):
            profile = display_result_card(vehicle_type, score, rank)
            
            if rank == 1:
                # Detailed info for #1 match
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("####  Perfect For:")
                    for item in profile.get("perfect_for", []):
                        st.markdown(f"- {item}")
                
                with col2:
                    st.markdown("####  Consider:")
                    for item in profile.get("consider", []):
                        st.markdown(f"- {item}")
                
                st.markdown("####  Top Picks to Explore:")
                pick_cols = st.columns(3)
                for idx, pick in enumerate(profile.get("top_picks", [])):
                    with pick_cols[idx]:
                        st.markdown(f"""
                        <div style="background:#f0f0f0; padding:1rem; border-radius:10px; text-align:center;">
                            <strong>{pick['make']} {pick['model']}</strong><br>
                            <small style="color:#666;">{pick['why']}</small>
                        </div>
                        """, unsafe_allow_html=True)
                
                st.markdown("---")
        
        # Score breakdown (optional expandable)
        with st.expander(" See All Category Scores"):
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            for vehicle_type, score in sorted_scores:
                profile = VEHICLE_PROFILES.get(vehicle_type, {})
                emoji = profile.get("emoji", "
                name = profile.get("name", vehicle_type.title())
                st.progress(score / 100)
                st.caption(f"{emoji} {name}: {score:.0f}/100")
        
        # Call to action
        st.markdown("---")
        st.markdown("###  Ready to Explore Your Matches?")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button(" Calculate Costs", use_container_width=True):
                st.switch_page("pages/1___Single_Vehicle_Calculator.py")
        
        with col2:
            if st.button(" Compare Vehicles", use_container_width=True):
                st.switch_page("pages/2____Multi_Vehicle_Comparison.py")
        
        with col3:
            if st.button(" Retake Quiz", use_container_width=True):
                st.session_state.quiz_started = False
                st.session_state.quiz_complete = False
                st.session_state.quiz_answers = {}
                st.rerun()
    
    # Footer
    st.markdown("---")
    st.markdown(get_footer_html(), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
