"""Child-safety filters applied before and after the language model."""
import re

MAX_MESSAGE_CHARS = 300

_PERSONAL_PATTERNS = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),                         # email
    re.compile(r"(\+?\d[\d\s().-]{7,}\d)"),                          # phone-like numbers
    re.compile(r"\b(my|our)\s+(home\s+)?address\b", re.I),
    re.compile(r"\bi\s+live\s+(at|on|in)\b", re.I),
    re.compile(r"\bmy\s+(phone|password|school\s+is|full\s+name|last\s+name|surname)\b", re.I),
    re.compile(r"\b(street|road|avenue|lane)\s+\d+|\d+\s+\w+\s+(street|road|avenue|lane)\b", re.I),
]

_SELF_HARM = re.compile(r"\b(kill\s+myself|hurt\s+myself|suicide|want\s+to\s+die|self[-\s]?harm)\b", re.I)

_BLOCKED = re.compile(
    r"\b(kill(ing)?|murder|guns?|weapons?|bombs?|knife|knives|blood|gore|sex|sexy|porn\w*|naked|nude|"
    r"drugs?|cocaine|weed|alcohol|beer|vodka|cigarettes?|vape|gambl\w*|swear|fuck\w*|shit|bitch|"
    r"damn|bastard|hack(ing)?|steal|racis\w*|hate\s+speech)\b",
    re.I,
)

PERSONAL_INFO_REPLY = (
    "Let's keep personal things like names, addresses, schools and phone numbers private — "
    "even from friendly robots like me! Real astronauts keep secret codes safe too. "
    "What would you like to know about space?"
)
SELF_HARM_REPLY = (
    "It sounds like you might be having a really hard time. Please tell a grown-up you trust "
    "right now, like a parent, teacher or carer. You matter, and they can help you."
)
BLOCKED_REPLY = (
    "Hmm, that's not something I can talk about. I'm AstroBot, and I love questions about "
    "space, planets, rockets and astronauts! Want to ask me one of those?"
)
OUTPUT_FALLBACK = (
    "Oops, my space radio got a bit fuzzy! Let's try another space question — maybe about "
    "planets, stars or rockets?"
)


def check_input(message: str) -> tuple[str, str | None]:
    """Returns (category, canned_reply). category: ok | personal | self_harm | blocked."""
    if _SELF_HARM.search(message):
        return "self_harm", SELF_HARM_REPLY
    if any(p.search(message) for p in _PERSONAL_PATTERNS):
        return "personal", PERSONAL_INFO_REPLY
    if _BLOCKED.search(message):
        return "blocked", BLOCKED_REPLY
    return "ok", None


def check_output(text: str) -> str:
    """Make sure the model's answer is short and contains nothing inappropriate."""
    text = (text or "").strip()
    if not text or _BLOCKED.search(text) or any(p.search(text) for p in _PERSONAL_PATTERNS[:2]):
        return OUTPUT_FALLBACK
    if len(text) > 1200:
        cut = text[:1200]
        text = cut[: cut.rfind(".") + 1] or cut
    return text
