"""Seed content for planets, missions, quizzes and badges. Safe to run many times (upserts by key)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Badge, Mission, Planet, Quiz, QuizQuestion

PLANETS = [
    dict(slug="sun", name="The Sun", kind="star", order_index=0, color="#FFB938",
         tagline="Our very own star!",
         description="The Sun is a giant ball of super-hot glowing gas. It gives Earth light and warmth, "
                     "and its gravity keeps all the planets travelling around it.",
         fun_facts=["About 1.3 million Earths could fit inside the Sun!",
                    "Sunlight takes about 8 minutes to travel to Earth.",
                    "The Sun is a star — the same kind of thing as the twinkly stars at night, just much closer."],
         distance_from_sun="It IS the centre of our solar system", distance_million_km=0,
         temperature="About 5,500 °C on the surface", diameter_km=1392700,
         size_comparison="109 times wider than Earth", moons=None,
         day_length="Spins once about every 27 days", year_length="Circles the galaxy every ~230 million years"),
    dict(slug="mercury", name="Mercury", kind="planet", order_index=1, color="#A9A3A0",
         tagline="The speedy little planet",
         description="Mercury is the smallest planet and the closest to the Sun. It is rocky and covered in "
                     "craters, a bit like our Moon.",
         fun_facts=["A year on Mercury is only 88 Earth days long — it zooms around the Sun!",
                    "Mercury has almost no air, so the days are scorching and the nights are freezing.",
                    "Mercury is only a little bigger than Earth's Moon."],
         distance_from_sun="58 million km", distance_million_km=58,
         temperature="From −180 °C at night to 430 °C in the day", diameter_km=4879,
         size_comparison="About one-third as wide as Earth", moons=0,
         day_length="59 Earth days to spin once", year_length="88 Earth days"),
    dict(slug="venus", name="Venus", kind="planet", order_index=2, color="#E8B96A",
         tagline="The hottest planet",
         description="Venus is covered in thick yellow clouds that trap heat like a super-strong blanket. "
                     "That makes it the hottest planet, even hotter than Mercury!",
         fun_facts=["Venus spins backwards compared with most planets, so the Sun rises in the west.",
                    "A day on Venus is longer than its year!",
                    "Venus is the brightest planet in our night sky."],
         distance_from_sun="108 million km", distance_million_km=108,
         temperature="About 465 °C — hot enough to melt lead", diameter_km=12104,
         size_comparison="Almost the same size as Earth", moons=0,
         day_length="243 Earth days to spin once", year_length="225 Earth days"),
    dict(slug="earth", name="Earth", kind="planet", order_index=3, color="#3E8EDE",
         tagline="Our home planet",
         description="Earth is the only planet we know of with life. It has liquid water, air to breathe, "
                     "and just the right temperature for plants, animals and people.",
         fun_facts=["About 70% of Earth is covered by oceans.",
                    "Earth's air protects us from space rocks — most burn up as shooting stars.",
                    "Earth is the only planet not named after a god or goddess."],
         distance_from_sun="150 million km", distance_million_km=150,
         temperature="About 15 °C on average", diameter_km=12742,
         size_comparison="The biggest of the rocky planets", moons=1,
         day_length="24 hours", year_length="365 days"),
    dict(slug="mars", name="Mars", kind="planet", order_index=4, color="#D9643A",
         tagline="The red planet",
         description="Mars is a cold, dusty, rocky planet. Its red colour comes from rusty iron in the soil. "
                     "Robot rovers are exploring Mars right now!",
         fun_facts=["Mars has the tallest volcano in the solar system: Olympus Mons, about 3 times taller than Mount Everest.",
                    "Mars has two small moons called Phobos and Deimos.",
                    "Scientists have found signs that Mars had rivers and lakes long ago."],
         distance_from_sun="228 million km", distance_million_km=228,
         temperature="About −65 °C on average", diameter_km=6779,
         size_comparison="About half as wide as Earth", moons=2,
         day_length="24 hours 37 minutes", year_length="687 Earth days"),
    dict(slug="jupiter", name="Jupiter", kind="planet", order_index=5, color="#D8A878",
         tagline="The giant of the solar system",
         description="Jupiter is the biggest planet. It is a gas giant, which means it has no solid ground "
                     "to stand on — just swirling clouds and storms.",
         fun_facts=["Jupiter's Great Red Spot is a storm bigger than the whole Earth!",
                    "More than 1,000 Earths could fit inside Jupiter.",
                    "Jupiter spins so fast that a day there lasts only about 10 hours."],
         distance_from_sun="778 million km", distance_million_km=778,
         temperature="About −110 °C at the cloud tops", diameter_km=139820,
         size_comparison="11 times wider than Earth", moons=95,
         day_length="About 10 hours", year_length="About 12 Earth years"),
    dict(slug="saturn", name="Saturn", kind="planet", order_index=6, color="#E6CF8C",
         tagline="The planet with beautiful rings",
         description="Saturn is a gas giant famous for its bright rings. The rings are made of billions of "
                     "pieces of ice and rock, from tiny grains to chunks as big as houses.",
         fun_facts=["Saturn is so light for its size that it would float in a giant bathtub!",
                    "Saturn has more known moons than any other planet.",
                    "Its biggest moon, Titan, has lakes of liquid methane."],
         distance_from_sun="1.4 billion km", distance_million_km=1434,
         temperature="About −140 °C", diameter_km=116460,
         size_comparison="9 times wider than Earth", moons=274,
         day_length="About 10.7 hours", year_length="About 29 Earth years"),
    dict(slug="uranus", name="Uranus", kind="planet", order_index=7, color="#8FD9E0",
         tagline="The sideways planet",
         description="Uranus is an ice giant. It is tipped over on its side, so it rolls around the Sun "
                     "like a ball instead of spinning like a top.",
         fun_facts=["Uranus looks blue-green because of a gas called methane.",
                    "Each pole gets about 42 years of sunshine, then 42 years of darkness.",
                    "Uranus was the first planet discovered using a telescope."],
         distance_from_sun="2.9 billion km", distance_million_km=2871,
         temperature="About −195 °C", diameter_km=50724,
         size_comparison="4 times wider than Earth", moons=28,
         day_length="About 17 hours", year_length="About 84 Earth years"),
    dict(slug="neptune", name="Neptune", kind="planet", order_index=8, color="#4D6FE0",
         tagline="The windy blue planet",
         description="Neptune is the farthest planet from the Sun. It is a dark, cold, deep-blue ice giant "
                     "with the fastest winds in the solar system.",
         fun_facts=["Winds on Neptune can blow at about 2,000 km per hour!",
                    "Neptune takes 165 Earth years to go around the Sun once.",
                    "Neptune was found using maths before anyone saw it in a telescope."],
         distance_from_sun="4.5 billion km", distance_million_km=4495,
         temperature="About −200 °C", diameter_km=49244,
         size_comparison="Almost 4 times wider than Earth", moons=16,
         day_length="About 16 hours", year_length="About 165 Earth years"),
]

MISSIONS = [
    dict(code="zero_gravity", order_index=1, xp_reward=100, difficulty="Easy", color="#66CDEB",
         title="Zero Gravity Challenge",
         short_description="Float through space, grab 5 stars and dock at the space station.",
         learning_goal="In space you keep drifting until something pushes you the other way.",
         instructions=["Use the arrow keys, WASD or the on-screen buttons to fire your jetpack.",
                       "You keep floating after you let go — tap gently to steer!",
                       "Collect all 5 golden stars.",
                       "Dodge the space rocks. 3 bumps and the mission ends.",
                       "Fly into the glowing space station to finish."]),
    dict(code="space_navigation", order_index=2, xp_reward=120, difficulty="Easy", color="#C99BFA",
         title="Space Navigation",
         short_description="Plan a safe route through the asteroid field to reach each planet.",
         learning_goal="Navigators plan a route before launching and avoid dangers along the way.",
         instructions=["Look at the star map: your rocket, the planet and the asteroids.",
                       "Press the arrow buttons to plan your route, one step at a time.",
                       "Press Launch to fly your route.",
                       "Hit an asteroid or run out of fuel? Fix your plan and try again.",
                       "Reach all 3 planets to complete the mission."]),
    dict(code="equipment_expert", order_index=3, xp_reward=150, difficulty="Medium", color="#A8E6CF",
         title="Space Equipment Expert",
         short_description="Drag each piece of astronaut gear into the group where it belongs.",
         learning_goal="Every part of an astronaut's gear has an important job.",
         instructions=["Drag a piece of equipment into one of the three groups.",
                       "If it's right, you'll learn what the item does.",
                       "If it's wrong, it bounces back — read the hint and try again.",
                       "Sort all 9 items to become an Equipment Expert!"]),
    dict(code="moon_landing", order_index=4, xp_reward=200, difficulty="Hard", color="#FFCB69",
         title="Moon Landing",
         short_description="Control your lander's thrusters and touch down gently on a safe pad.",
         learning_goal="Landers fire rockets downward to slow down against the Moon's gravity.",
         instructions=["The Moon's gravity pulls your lander down.",
                       "Hold UP (or the Thrust button) to fire the main engine and slow down.",
                       "Use LEFT and RIGHT to stop drifting sideways.",
                       "Land on a green pad, slower than 2.5 m/s.",
                       "Watch your fuel — it runs out!"]),
    dict(code="emergency_rescue", order_index=5, xp_reward=250, difficulty="Hard", color="#FFB8D0",
         title="Space Emergency Rescue",
         short_description="Stay calm and pick the safest action in 4 space emergencies.",
         learning_goal="Astronauts stay calm, work as a team and follow safety checklists.",
         instructions=["Read each emergency story carefully.",
                       "Choose what a well-trained astronaut should do.",
                       "Learn why the safe choice is right.",
                       "Get at least 3 of 4 right to save the crew!"]),
]

QUIZZES = [
    dict(slug="solar-system", title="Solar System Quiz", xp_per_correct=10,
         description="How much do you know about the Sun and the planets?",
         questions=[
             ("Which planet is closest to the Sun?", ["Venus", "Mercury", "Mars", "Earth"], 1,
              "Mercury is the closest planet to the Sun and zooms around it in just 88 days."),
             ("Which is the biggest planet?", ["Saturn", "Earth", "Jupiter", "Neptune"], 2,
              "Jupiter is the giant of the solar system — more than 1,000 Earths could fit inside!"),
             ("Why is Mars red?", ["It is on fire", "Rusty iron in its soil", "It is made of strawberries", "Red paint from rovers"], 1,
              "Mars has lots of iron in its dust and rocks, and it has rusted, making the planet look red."),
             ("Which planet has the most famous rings?", ["Saturn", "Mercury", "Mars", "Venus"], 0,
              "Saturn's bright rings are made of billions of chunks of ice and rock."),
             ("What is the Sun?", ["A planet", "A moon", "A star", "A comet"], 2,
              "The Sun is a star — a giant ball of hot glowing gas."),
             ("Which is the hottest planet?", ["Mercury", "Venus", "Mars", "Jupiter"], 1,
              "Venus is the hottest because its thick clouds trap heat like a blanket."),
             ("Which planet do we live on?", ["Mars", "Neptune", "Earth", "Uranus"], 2,
              "Earth is our home — the only planet we know with life."),
             ("Which planet spins on its side?", ["Uranus", "Jupiter", "Mercury", "Earth"], 0,
              "Uranus is tipped over, so it rolls around the Sun on its side."),
         ]),
    dict(slug="astronaut-life", title="Astronaut Life Quiz", xp_per_correct=10,
         description="Do you know how astronauts live and work in space?",
         questions=[
             ("Why do astronauts float on the space station?",
              ["There is no gravity at all", "They are falling around Earth together with the station", "They are very light", "Magic boots"], 1,
              "The station and astronauts are always falling around Earth together, so they float. Gravity is still there!"),
             ("What do astronauts breathe in space?", ["Space air", "Oxygen they bring with them", "Nothing", "Water"], 1,
              "Space has no air, so astronauts bring oxygen with them in tanks and machines."),
             ("Why do astronauts exercise every day in space?",
              ["To keep their muscles and bones strong", "To win prizes", "Because it is boring", "To make the station go faster"], 0,
              "Floating makes muscles and bones weaker, so astronauts exercise about two hours a day."),
             ("How do astronauts sleep?", ["In a normal bed", "In a sleeping bag tied to the wall", "Standing on the floor", "They never sleep"], 1,
              "They zip into sleeping bags attached to the wall so they don't float around."),
             ("What does a safety tether do?", ["Plays music", "Keeps an astronaut attached so they don't float away", "Makes oxygen", "Cooks food"], 1,
              "The tether is a strong cord that clips astronauts to the spacecraft during spacewalks."),
             ("Who helps astronauts from Earth?", ["Mission Control", "The Moon", "Nobody", "Penguins"], 0,
              "Mission Control is a team on Earth that watches over and helps astronauts all the time."),
             ("What is a spacewalk?", ["Walking on Earth", "Going outside the spacecraft in a spacesuit", "A dance", "A walk on a treadmill"], 1,
              "A spacewalk is when an astronaut goes outside the spacecraft to fix or build things."),
             ("Why is a helmet visor gold?", ["It looks fancy", "To block the Sun's bright light", "To see in the dark", "It is made of real gold coins"], 1,
              "A thin gold layer reflects the Sun's very strong light and heat to protect the astronaut's eyes."),
         ]),
]

BADGES = [
    dict(code="first_rocket_launch", order_index=1, name="First Rocket Launch", icon="rocket", color="#FF8A65",
         description="You built a rocket and launched it into space!",
         how_to_earn="Build a complete rocket in the Rocket Lab and launch it."),
    dict(code="planet_explorer", order_index=2, name="Planet Explorer", icon="globe", color="#66CDEB",
         description="You visited lots of worlds in the solar system.",
         how_to_earn="Explore 5 planets (or the Sun) in the 3D Solar System."),
    dict(code="zero_gravity_champion", order_index=3, name="Zero Gravity Champion", icon="feather", color="#C99BFA",
         description="You mastered floating in zero gravity.",
         how_to_earn="Complete the Zero Gravity Challenge."),
    dict(code="equipment_expert", order_index=4, name="Space Equipment Expert", icon="wrench", color="#A8E6CF",
         description="You know what every piece of astronaut gear does.",
         how_to_earn="Complete the Space Equipment Expert mission."),
    dict(code="moon_landing_hero", order_index=5, name="Moon Landing Hero", icon="moon", color="#FFCB69",
         description="You landed safely on the Moon!",
         how_to_earn="Complete the Moon Landing mission."),
    dict(code="mission_commander", order_index=6, name="Mission Commander", icon="crown", color="#FFB8D0",
         description="You completed every training mission.",
         how_to_earn="Complete all 5 training missions."),
    dict(code="quiz_master", order_index=7, name="Space Quiz Master", icon="brain", color="#8C9EFF",
         description="Your space knowledge is out of this world!",
         how_to_earn="Score 80% or more on a space quiz."),
    dict(code="galaxy_explorer", order_index=8, name="Galaxy Explorer", icon="sparkles", color="#FFD54F",
         description="You explored the whole solar system!",
         how_to_earn="Explore the Sun and all 8 planets."),
]


def _upsert(db: Session, model, key: str, rows: list[dict]):
    for row in rows:
        obj = db.scalar(select(model).where(getattr(model, key) == row[key]))
        if obj is None:
            db.add(model(**row))
        else:
            for k, v in row.items():
                setattr(obj, k, v)


def seed_content(db: Session) -> None:
    _upsert(db, Planet, "slug", PLANETS)
    _upsert(db, Mission, "code", MISSIONS)
    _upsert(db, Badge, "code", BADGES)
    for q in QUIZZES:
        quiz = db.scalar(select(Quiz).where(Quiz.slug == q["slug"]))
        if quiz is None:
            quiz = Quiz(slug=q["slug"], title=q["title"], description=q["description"],
                        xp_per_correct=q["xp_per_correct"])
            db.add(quiz)
        else:
            quiz.title, quiz.description, quiz.xp_per_correct = q["title"], q["description"], q["xp_per_correct"]
        db.flush()
        existing = {qq.order_index: qq for qq in quiz.questions}
        for i, (text, options, correct, explanation) in enumerate(q["questions"], start=1):
            qq = existing.get(i)
            if qq is None:
                quiz.questions.append(QuizQuestion(order_index=i, question=text, options=options,
                                                   correct_index=correct, explanation=explanation))
            else:
                qq.question, qq.options, qq.correct_index, qq.explanation = text, options, correct, explanation
    db.commit()
