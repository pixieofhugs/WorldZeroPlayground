from sqlalchemy.orm import Session
from models import Task

SEED_TASKS = [
    {
        "title": "Leave a gift for a stranger",
        "description": (
            "Find a small, thoughtful gift — something you made or something you love — "
            "and leave it somewhere a stranger will find it. Document what you left, where, and why."
        ),
        "point_value": 5,
        "level_required": 0,
    },
    {
        "title": "Have a conversation with someone you'd normally never talk to",
        "description": (
            "Strike up a real conversation — not small talk — with someone outside your usual social orbit. "
            "A stranger on a bus, a shopkeeper, a neighbor you've never met. Share what you learned."
        ),
        "point_value": 8,
        "level_required": 0,
    },
    {
        "title": "Create a map of a place that doesn't exist on any map",
        "description": (
            "Map somewhere real but unmapped: a shortcut only you know, a mental landscape, "
            "a micro-neighborhood with its own logic. Draw it by hand or digitally. "
            "Include at least five named features."
        ),
        "point_value": 10,
        "level_required": 0,
    },
    {
        "title": "Spend one hour being completely lost on purpose",
        "description": (
            "Go somewhere unfamiliar. Leave your map and GPS behind. Walk until you have no idea where you are. "
            "Stay lost for a full hour. Document what you found."
        ),
        "point_value": 6,
        "level_required": 0,
    },
    {
        "title": "Leave a story somewhere for someone to find",
        "description": (
            "Write a short story — at least a page — and hide it in a public place: "
            "a library book, a park bench, a café. Include instructions to pass it on. "
            "Photograph where you left it."
        ),
        "point_value": 12,
        "level_required": 1,
    },
    {
        "title": "Make something and give it away before the day is over",
        "description": (
            "Create something with your hands today — cooked food, a drawing, a poem, a piece of music — "
            "and give it away to someone before midnight. Document the making and the giving."
        ),
        "point_value": 10,
        "level_required": 1,
    },
    {
        "title": "Document a disappearing piece of your city",
        "description": (
            "Find something in your city that is fading: an old sign, a dying shop, a crumbling building, "
            "a vanishing tradition. Document it thoroughly before it's gone."
        ),
        "point_value": 15,
        "level_required": 1,
    },
    {
        "title": "Have a picnic somewhere completely inappropriate",
        "description": (
            "Set up a proper picnic — blanket, food, the works — somewhere it absolutely doesn't belong. "
            "A rooftop, a parking garage, an elevator lobby. Commit fully. Document the event."
        ),
        "point_value": 12,
        "level_required": 2,
    },
    {
        "title": "Teach a skill to a stranger",
        "description": (
            "Find someone who wants to learn something you know. Teach them properly — not a quick demo, "
            "but enough that they can do it themselves. Document the lesson and what they learned."
        ),
        "point_value": 18,
        "level_required": 2,
    },
    {
        "title": "Organize an event with 10+ people who don't know each other",
        "description": (
            "Bring together at least ten people who have no prior connection. "
            "Design the event so they actually interact — not just occupy the same space. "
            "Document how you did it and what happened."
        ),
        "point_value": 25,
        "level_required": 3,
    },
]


def seed_tasks(db: Session) -> None:
    if db.query(Task).count() > 0:
        return
    for data in SEED_TASKS:
        db.add(Task(**data))
    db.commit()
