"""Curated, fact-checked answers used when no AI API key is configured (demo mode)."""
import re

CURATED = [
    (["float", "floating", "weightless", "zero gravity", "microgravity"],
     "Why do astronauts float?",
     "Astronauts float because they are falling around Earth all the time! The space station zooms "
     "sideways so fast that as it falls, Earth's curved surface keeps falling away below it. Everything "
     "inside falls together, so it all floats — like when you go over the top of a roller coaster hill. "
     "Gravity is still there, it's just that everyone is falling at the same speed!"),
    (["live on mars", "humans live", "mars", "people on mars"],
     "Can humans live on Mars?",
     "Not yet, but scientists are working on it! Mars is very cold, its air is too thin to breathe, and it "
     "has lots of dust storms. People would need special homes, spacesuits and machines to make air and "
     "water. Robot rovers are exploring Mars right now to help us learn how. Maybe you'll help plan the "
     "first Mars base one day!"),
    (["sky blue", "blue sky", "why is the sky"],
     "Why is the sky blue?",
     "Sunlight looks white, but it's really made of all the colours of the rainbow. When sunlight zooms "
     "into our air, tiny bits of air bounce blue light around much more than red or yellow light. So "
     "blue light comes at your eyes from every part of the sky! At sunset, light travels through more air, "
     "so we see oranges and reds instead."),
    (["jupiter", "how big is jupiter", "biggest planet"],
     "How big is Jupiter?",
     "Jupiter is HUGE — it's the biggest planet in our solar system! It is about 11 times wider than Earth, "
     "and more than 1,000 Earths could fit inside it. It has a giant storm called the Great Red Spot that "
     "is bigger than our whole planet. Fun fact: a day on Jupiter is only about 10 hours long!"),
    (["black hole", "blackhole"],
     "What happens inside a black hole?",
     "A black hole is a place where gravity is so strong that nothing can escape — not even light! That's "
     "why it looks black. Scientists still don't know exactly what happens deep inside, because no light "
     "can come out to show us. Black holes are very, very far away from Earth, so they can't hurt us. "
     "They are one of the biggest mysteries in space!"),
    (["moon change", "moon shape", "phases", "half moon", "crescent", "full moon"],
     "Why does the Moon change shape?",
     "The Moon doesn't really change shape — it's always a round ball! The Sun lights up half of the Moon. "
     "As the Moon travels around Earth, we see different amounts of that sunny half. When we see all of it, "
     "it's a full moon. When we see a thin slice, it's a crescent. The whole pattern repeats about every "
     "29 and a half days."),
    (["sun hot", "how hot is the sun", "the sun", "what is the sun"],
     "How hot is the Sun?",
     "The Sun is a star — a giant ball of glowing gas. Its surface is about 5,500 °C, much hotter than any "
     "oven! Deep in its middle it's millions of degrees. The Sun is so big that about 1.3 million Earths "
     "could fit inside. Its light takes about 8 minutes to reach us."),
    (["stars twinkle", "twinkle", "what are stars", "stars"],
     "Why do stars twinkle?",
     "Stars are giant, faraway suns. They twinkle because their light has to travel through Earth's moving "
     "air, which wiggles the light a little — like looking at a coin at the bottom of a swimming pool. "
     "Astronauts in space see stars shining steadily without twinkling!"),
    (["rocket", "rockets fly", "how do rockets"],
     "How do rockets fly?",
     "Rockets burn fuel to make lots of hot gas, and they blast that gas out of the bottom really fast. "
     "Pushing gas down pushes the rocket up! It's like letting go of a blown-up balloon — the air rushes "
     "out one way and the balloon zooms the other way. Scientists call this Newton's third law."),
    (["eat", "food", "astronauts eat"],
     "What do astronauts eat?",
     "Astronauts eat lots of normal foods like tortillas, fruit, nuts, pasta and even pudding! Many foods "
     "come in pouches so crumbs don't float into machines. They use tortillas instead of bread because "
     "bread makes too many crumbs. Salt and pepper come as liquids so the grains don't float away!"),
    (["sleep", "astronauts sleep"],
     "How do astronauts sleep?",
     "On the space station there's no up or down, so astronauts sleep in sleeping bags tied to the wall. "
     "That way they don't float around and bump into things while they snooze. They often wear eye masks "
     "because the Sun rises and sets about 16 times a day as they zoom around Earth!"),
    (["toilet", "bathroom", "poop", "pee"],
     "How do astronauts go to the toilet?",
     "Space toilets use air, like a gentle vacuum cleaner, to pull everything away so nothing floats off. "
     "Astronauts strap in, use the toilet, and the fan does the rest. The water is even cleaned and "
     "recycled into drinking water!"),
    (["moon", "the moon", "how far is the moon"],
     "How far away is the Moon?",
     "The Moon is about 384,000 kilometres away. That's like driving around the whole Earth almost ten "
     "times! Astronauts first landed on the Moon in 1969, and it took them about three days to get there."),
    (["saturn", "rings"],
     "Why does Saturn have rings?",
     "Saturn's rings are made of billions of pieces of ice and rock, from tiny grains to chunks as big as "
     "houses. Scientists think they may come from moons, comets or space rocks that broke apart near "
     "Saturn. The ice reflects sunlight, which makes the rings look bright and sparkly."),
    (["earth round", "why is earth round", "planets round"],
     "Why are planets round?",
     "Planets are round because of gravity! Gravity pulls everything toward the middle equally from every "
     "side. When something is as big as a planet, gravity squishes it into a ball shape. Small space rocks "
     "don't have enough gravity, so they can be lumpy like potatoes."),
    (["become an astronaut", "be an astronaut", "astronaut job"],
     "How can I become an astronaut?",
     "Astronauts love learning! Many study science, maths, engineering or medicine, and they keep their "
     "bodies healthy and strong. They also practise teamwork and staying calm. Keep being curious, ask "
     "lots of questions and keep exploring — just like you're doing right now!"),
    (["gravity", "what is gravity"],
     "What is gravity?",
     "Gravity is an invisible pull that every object has. Big things like Earth have a strong pull, which "
     "is why when you jump, you always come back down. Gravity keeps the Moon going around Earth and the "
     "planets going around the Sun."),
    (["mars red", "red planet", "why is mars red"],
     "Why is Mars red?",
     "Mars looks red because its dust and rocks have lots of iron that has rusted — just like an old "
     "bicycle left out in the rain! The rusty dust blows all over the planet, so Mars glows red in the sky."),
    (["comet", "comets", "shooting star", "meteor"],
     "What is a shooting star?",
     "A shooting star isn't really a star! It's a tiny bit of space rock or dust, often smaller than a "
     "grain of sand, that zooms into Earth's air super fast. It gets so hot that it glows and burns up, "
     "leaving a bright streak across the sky."),
    (["galaxy", "milky way"],
     "What is a galaxy?",
     "A galaxy is a gigantic group of stars, gas and dust held together by gravity. We live in the Milky "
     "Way galaxy, which has hundreds of billions of stars! On a very dark night you can see part of it as "
     "a faint milky stripe across the sky."),
    (["aliens", "alien", "life on other planets"],
     "Are there aliens?",
     "Nobody knows yet — it's one of the biggest questions in science! Scientists are searching for tiny "
     "life, like microbes, on places such as Mars and icy moons like Europa. They also look at faraway "
     "planets around other stars. So far, Earth is the only place where we know there's life."),
    (["space station", "iss"],
     "What is the space station?",
     "The International Space Station is a giant science lab flying around Earth about 400 kilometres up. "
     "Astronauts from different countries live and work there together. It zooms around Earth about every "
     "90 minutes — that's around 16 trips a day!"),
    (["spacesuit", "space suit", "helmet"],
     "Why do astronauts wear spacesuits?",
     "Space has no air, and it can be super hot in sunlight and super cold in shadow. A spacesuit is like a "
     "tiny personal spaceship! It gives astronauts air to breathe, keeps them at a comfy temperature and "
     "protects them from bright sunlight and tiny space dust."),
    (["sun set", "night and day", "day and night", "why is it night"],
     "Why do we have day and night?",
     "Earth is always spinning like a top. When your side of Earth faces the Sun, it's daytime. As Earth "
     "keeps turning, your side moves away from the Sun and it becomes night. One full spin takes about "
     "24 hours — that's one day!"),
]

SUGGESTIONS = [
    "Why do astronauts float?",
    "Can humans live on Mars?",
    "Why is the sky blue?",
    "How big is Jupiter?",
    "What happens inside a black hole?",
    "Why does the Moon change shape?",
    "How do rockets fly?",
    "What do astronauts eat?",
]

FALLBACK = (
    "That's a great question! In demo mode I only know a set of space answers that my teachers checked "
    "for me. Try asking about astronauts floating, rockets, the Moon, Mars, Jupiter, Saturn's rings, "
    "black holes, stars or the space station!"
)


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", text.lower())


def find_curated_answer(question: str) -> tuple[str, str | None]:
    """Returns (answer, matched_question). Picks the entry whose keywords best match."""
    q = f" {_norm(question)} "
    best, best_score = None, 0
    for keywords, title, answer in CURATED:
        score = 0
        for kw in keywords:
            if f" {kw} " in q or (len(kw) > 4 and kw in q):
                score += len(kw.split()) * 2 + 1
        if score > best_score:
            best, best_score = (title, answer), score
    if best is None:
        return FALLBACK, None
    return best[1], best[0]
