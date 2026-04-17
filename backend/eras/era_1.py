"""
Era 1 — the founding era of World Zero.

This file is the complete, self-contained configuration for Era 1.
Everything needed to start this era lives here: factions, tasks, taunts, and rules.
"""
from game_config import EraConfig, FactionConfig, TaskDef


# =============================================================================
# FACTIONS
# =============================================================================

ERA_1_FACTIONS = {
    "ua": FactionConfig(
        slug="ua",
        name="UA",
        description="The default starting faction. Full points on all tasks. Must leave at level 3.",
        color="#6b6a7a",
        is_selectable=False,          # assigned automatically; not a choosable destination
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "ua_masters": FactionConfig(
        slug="ua_masters",
        name="UA Masters",
        description="Veterans who aged out of UA. Can sign up for any task at reduced points.",
        color="#555555",
        is_selectable=True,
        can_always_rejoin=True,       # can always be rejoined after defecting
        own_task_modifier=0.8,
        other_task_modifier=0.8,
        collab_own_modifier=0.8,
        collab_other_modifier=0.8,
        duel_win_modifier=0.8,
        duel_loss_modifier=0.8,
    ),
    "snide": FactionConfig(
        slug="snide",
        name="S.N.I.D.E.",
        description="Specialists in one-on-one competition. Bonus points for winning duels.",
        color="#8a6a20",
        is_selectable=True,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=0.7,
        collab_own_modifier=1.0,
        collab_other_modifier=0.7,
        duel_win_modifier=2.0,        # duel win: 200% of base (Snide high-risk bonus)
        duel_loss_modifier=0.0,       # duel loss: 0% of base (Snide high-risk penalty)
    ),
    "gestalt": FactionConfig(
        slug="gestalt",
        name="Gestalt",
        description="Collective-minded. Excel at their own faction's tasks; reduced elsewhere.",
        color="#14532d",
        is_selectable=True,
        can_always_rejoin=False,
        own_task_modifier=1.1,        # +10% on solo own-faction
        other_task_modifier=0.7,      # -30% on solo other-faction
        collab_own_modifier=1.1,      # +10% on collab own-faction
        collab_other_modifier=0.9,    # -10% on collab other-faction (less penalty)
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "journeymen": FactionConfig(
        slug="journeymen",
        name="Journeymen",
        description="Explorers with access to select retired tasks (Task Vision ability).",
        color="#c49a3a",
        is_selectable=True,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=0.7,
        collab_own_modifier=1.0,
        collab_other_modifier=0.7,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "analog": FactionConfig(
        slug="analog",
        name="Analog",
        description="Depth over breadth. Can repeat one task per level for points (Double Dipper).",
        color="#15803d",
        is_selectable=True,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=0.7,
        collab_own_modifier=1.0,
        collab_other_modifier=0.7,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "singularity": FactionConfig(
        slug="singularity",
        name="Singularity",
        description="TBD",
        color="#7c3aed",
        is_selectable=True,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "albescent": FactionConfig(
        slug="albescent",
        name="/Albescent",
        description="Full points and any meta tasks from any group. Unlock-only.",
        color="#6b6a7a",
        is_selectable=False,          # only available as additional character unlock
        can_always_rejoin=True,       # can always be rejoined after defecting
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "aged_out": FactionConfig(
        slug="aged_out",
        name="AgedOutOfUA",
        description="Placeholder faction for characters who hit level 3 while offline.",
        color="#6b6a7a",
        is_selectable=False,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
    "na": FactionConfig(
        slug="na",
        name="None",
        description="Sentinel value for tasks with no specific faction affiliation.",
        color="#a9a9a9",
        is_selectable=False,
        can_always_rejoin=False,
        own_task_modifier=1.0,
        other_task_modifier=1.0,
        collab_own_modifier=1.0,
        collab_other_modifier=1.0,
        duel_win_modifier=1.5,
        duel_loss_modifier=0.5,
    ),
}


# =============================================================================
# TASKS
# =============================================================================

ERA_1_TASKS = (
    TaskDef(
        title="Contribute to Shahid's Strigiformic Sketchbook",
        description='From Shahid\'s diary:\n"Wednesday, October the fourteenth.  #812 had the finest feathers ever drawn.  Still it was spurned..."\nShahid fell in love three years ago with a woman who refused to give him any attention because he presented her with a "subpar" drawing of a Eurasian eagle-owl. Since then, Shahid has tried again and again to draw her a suitable owl, only to be continually rejected.\nHelp Shahid find new inspiration by hand-drawing an owl of any species in any circumstances, especially with unusual style.',
        faction_slug="ua", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Permaculture Shock",
        description='Install a community garden (ideally in secret, or somewhere a garden may not be expected).\nTo qualify for the "community" modifier prefix, it must be in an area where you can share its bounty and responsibility, though you need not involve anyone else in its care if you believe your own thumbs to be the greenest.\nCrop variety and size is your choice, but it must yield a harvest to feed at least 3 people one meal.\nPlayers: 1 to 20',
        faction_slug="analog", level_required=6, point_value=100,
    ),
    TaskDef(
        title="Somewhere No One Needs To Be",
        description="There are many places people have physically passed through: along a path, in a store, on a game field. There are also many places people have not passed through in quite some time: the bark dust beside a building, the inside of a sewer, a random patch of grass \nHow long did a human last occupy these spaces? What could it mean for a place to exist beside humanity, not dangerous or necessarily forbidden, but ordinary and nondescript, without humanities touch for so long? What does it mean, to you?\nin a large and empty field.\nExist somewhere no one has existed in for a long time, and consider what that means.",
        faction_slug="journeymen", level_required=1, point_value=10,
    ),
    TaskDef(
        title="Lacunae",
        description="Share something which exemplifies emptiness.\nSee also: https://en.wikipedia.org/wiki/4%E2%80%B233%E2%80%B3",
        faction_slug="analog", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Knowledge Is Free",
        description="You have skills and knowledge. This is true even if you don't know it, whether by way of your unique experience of the world or by the time you've spent on something that someone else hasn't. There's more to do and know than there are years for anyone to learn it all, so everyone brings with themselves a piece of truth looking to be more whole.\nVolunteer your time teaching someone or someone's something. A skill, a practice, some amount of a field of knowledge, etc.\nLibraries are a good place for this, as a place of knowledge and creativity most libraries support workshops and other learning opportunities, which you can have a hand in leading.",
        faction_slug="gestalt", level_required=4, point_value=40,
    ),
    TaskDef(
        title="The L Word",
        description="Find someone you love. Tell them you love them.",
        faction_slug="gestalt", level_required=1, point_value=5,
    ),
    TaskDef(
        title="The Rotation Of Cubes In Your Mind",
        description='Recall one of the many cubes you\'ve no doubt experienced in your long life.\nDescribe what the cube was, what it meant, and where it came from.\nQualifying cube examples:\nRubiks Cube, The Companion Cube, Cube 2: Hypercube on DVD, Gamecube, Gateway2000s Cow Cube, a 6 sided die, a laundry machine, a poorly designed car, half a brick, several full bricks stacked into a cube, etc...\nThe object need not be perfectly cubic, so long as it embodies cubehood.\nPlayers: 1 to 2',
        faction_slug="singularity", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Feed the Animals",
        description="Find some animals and feed them. Human is an acceptable type of animal.",
        faction_slug="gestalt", level_required=1, point_value=5,
    ),
    TaskDef(
        title="It's for all of us",
        description="Make something more accessible.\nInstalling a ramp where one is missing, place/install a seat/bench somewhere, make signage larger and easier to read, install a sign where one is missing, update software with color blind options. The world is an oyster.",
        faction_slug="gestalt", level_required=5, point_value=75,
    ),
    TaskDef(
        title="A little something special",
        description="Install/place artwork in public",
        faction_slug="ua", level_required=2, point_value=10,
    ),
    TaskDef(
        title="You can learn anything",
        description="Spend 30 minutes learning a new skill/craft",
        faction_slug="ua", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Beauty through limitation",
        description="Make a piece of art that's small. 7.5cm canvas square, 50x50 pixel digital image",
        faction_slug="ua", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Stronger Together",
        description="Start a Union.",
        faction_slug="gestalt", level_required=7, point_value=500,
    ),
    TaskDef(
        title="The Seed",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 250 words.",
        faction_slug="ua", level_required=1, point_value=5,
    ),
    TaskDef(
        title="The Sprout",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 1000 words",
        faction_slug="ua", level_required=2, point_value=10,
    ),
    TaskDef(
        title="The Bud",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 5,000 words",
        faction_slug="ua", level_required=3, point_value=25,
    ),
    TaskDef(
        title="The Bloom",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 10,000 words",
        faction_slug="ua_masters", level_required=4, point_value=50,
    ),
    TaskDef(
        title="The Bush",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 15,000 words",
        faction_slug="ua_masters", level_required=5, point_value=75,
    ),
    TaskDef(
        title="The Thicket",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 25,000 words",
        faction_slug="ua_masters", level_required=6, point_value=100,
    ),
    TaskDef(
        title="The Forest",
        description="Think about something you think you know about, but haven't actually looked into. Research that assumption, and report back what you've found. Minimum 40,000 words",
        faction_slug="ua_masters", level_required=7, point_value=500,
    ),
    TaskDef(
        title="Communication is arbitrary",
        description="Invent a language. Write a paragraph in that language.",
        faction_slug="snide", level_required=5, point_value=75,
    ),
    TaskDef(
        title='"DO A KICKFLIP"',
        description="Do a kickflip. Bonus if you don't use a skateboard.",
        faction_slug="snide", level_required=2, point_value=25,
    ),
    TaskDef(
        title="There",
        description="Pick some place to travel to at random (dart thrown at a map, random wikipedia article selection, etc.). Travel there.",
        faction_slug="journeymen", level_required=4, point_value=50,
    ),
    TaskDef(
        title="Invisible White Elephant",
        description="Give someone a gift, anonymously.",
        faction_slug="gestalt", level_required=2, point_value=10,
    ),
    TaskDef(
        title="What if the curtains were red",
        description="Mod a game.",
        faction_slug="singularity", level_required=3, point_value=25,
    ),
    TaskDef(
        title="Creating Fun",
        description="Make a game.",
        faction_slug="ua_masters", level_required=4, point_value=50,
    ),
    TaskDef(
        title="You deserve it.",
        description="Forgive yourself.",
        faction_slug="gestalt", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Patron of the arts",
        description="Commission art from an artist",
        faction_slug="gestalt", level_required=3, point_value=25,
    ),
    TaskDef(
        title="Expanding your world",
        description="Learn a stranger's name",
        faction_slug="gestalt", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Closer, together",
        description="learn about and share a friend's hobby",
        faction_slug="gestalt", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Become a Villager",
        description="Advertise and provide a skill or good to your community",
        faction_slug="gestalt", level_required=4, point_value=50,
    ),
    TaskDef(
        title="One of many Cultural Bridges",
        description="Learn a new language",
        faction_slug="gestalt", level_required=4, point_value=40,
    ),
    TaskDef(
        title="Trash Transformation",
        description="Find some trash in a public place. Make it into something else.",
        faction_slug="ua", level_required=1, point_value=5,
    ),
    TaskDef(
        title="When The Sun Blinks",
        description="Experience a Solar Eclipse. Write about your experience.",
        faction_slug="journeymen", level_required=3, point_value=25,
    ),
    TaskDef(
        title="A Very Human Thing",
        description="Create a ritual to be kind to yourself. Document it.",
        faction_slug="analog", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Understanding through Data",
        description="Perform a census. On anything, of anything. Provide your details, and consider what your data says",
        faction_slug="singularity", level_required=3, point_value=25,
    ),
    TaskDef(
        title="Create a spell.",
        description="Create a spell.",
        faction_slug="albescent", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Make it your own",
        description="Remove the branding from something you own, and replace it with something else.",
        faction_slug="snide", level_required=1, point_value=5,
    ),
    TaskDef(
        title="Improv Fixture",
        description="Take an item with a logo or brand on it that you use every day. Study the item, and how it was made. Compare it to other, similar interpretations of that item made by other people. After this, throw it away and make your own version of the item.",
        faction_slug="analog", level_required=3, point_value=25,
    ),
    TaskDef(
        title="Why did you do that",
        description="break something. Write down your thoughts (what did you break, why did you choose to break it, do you feel better or worse for breaking it, is it worth fixing or replacing or putting behind you, etc.)",
        faction_slug="journeymen", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Why do I even have this actually",
        description='you have a pile somewhere in your house. The pile of things has a proper place, but it is in that pile instead. Consider why that pile exists, why those items ended up in that pile, where they are meant to go and why (is The Place convenient? Next other other Like things? Is that the righr place for such things?). Then, take an action: redefine where "the right place" is for that pile of things, and thrn make things right. Or, unpack the pile to the place where it\'s meant to go.',
        faction_slug="ua", level_required=2, point_value=10,
    ),
    TaskDef(
        title="A key to many locks",
        description="If you don't have a passport already, get one.",
        faction_slug="journeymen", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Tierlist of Me",
        description="Score your living space, according to a rubric you yourself come up with. Justify your grading.",
        faction_slug="singularity", level_required=2, point_value=10,
    ),
    TaskDef(
        title="Cultural Exchange",
        description="Interview someone from another country",
        faction_slug="gestalt", level_required=3, point_value=25,
    ),
    TaskDef(
        title="Depth through Repetition",
        description="Have a meal, and try to identify each ingredient. Then, make that meal yourself, and then try again to identify each ingredient again",
        faction_slug="analog", level_required=2, point_value=10,
    ),
    TaskDef(
        title="FLIP THE SYSTEM",
        description="TBD",
        faction_slug="snide", level_required=0, point_value=500,
    ),
)


# =============================================================================
# TAUNT TEMPLATES
# =============================================================================
# Keyed by faction slug -> trigger type -> list of template strings.
# Use {from_name} and {to_name} as placeholders.
# A generic "default" key provides fallbacks for factions without custom taunts.

ERA_1_TAUNT_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "default": {
        "score_overtake": [
            "{from_name} just passed {to_name} on the leaderboard. Awkward.",
            "{to_name}, meet {from_name}'s dust.",
            "{from_name} overtook {to_name}. The scoreboard doesn't lie.",
        ],
        "level_up": [
            "{from_name} leveled up while {to_name} was napping.",
            "{from_name} hit a new level. {to_name} remains where they are.",
        ],
        "praxis_complete": [
            "{from_name} just completed a task. {to_name} is still thinking about it.",
            "{from_name} submitted praxis. {to_name}... did not.",
        ],
    },
    "snide": {
        "score_overtake": [
            "{from_name} danced past {to_name} on the scoreboard. Elegant, really.",
            "Oh, {to_name}. {from_name} just made you look silly.",
            "{from_name} sends their regards from above {to_name} on the leaderboard.",
        ],
        "level_up": [
            "{from_name} ascended. {to_name} can see them from down there.",
        ],
        "praxis_complete": [
            "{from_name} finished what {to_name} couldn't start.",
        ],
    },
    "gestalt": {
        "score_overtake": [
            "The collective lifts {from_name} above {to_name}. Together, always.",
            "{from_name} rose past {to_name}. The whole is greater than the parts.",
        ],
        "level_up": [
            "{from_name} grew stronger through community. {to_name} walks alone.",
        ],
        "praxis_complete": [
            "{from_name} contributed to the whole. {to_name} remained apart.",
        ],
    },
    "journeymen": {
        "score_overtake": [
            "{from_name} found a path past {to_name}. The road provides.",
            "{from_name} wandered ahead of {to_name}. Not all who wander are lost.",
        ],
        "level_up": [
            "{from_name} discovered a new horizon. {to_name} hasn't packed yet.",
        ],
        "praxis_complete": [
            "{from_name} returned from the journey with proof. {to_name} stayed home.",
        ],
    },
    "analog": {
        "score_overtake": [
            "{from_name} carved past {to_name} by hand. No shortcuts.",
            "{from_name} overtook {to_name} the old-fashioned way.",
        ],
        "level_up": [
            "{from_name} leveled up through repetition. {to_name} got bored.",
        ],
        "praxis_complete": [
            "{from_name} made something real. {to_name} is still scrolling.",
        ],
    },
    "singularity": {
        "score_overtake": [
            "{from_name} computed a path past {to_name}. Inevitable.",
            "{from_name} surpassed {to_name}. The algorithm does not care.",
        ],
        "level_up": [
            "{from_name} optimized beyond {to_name}'s level.",
        ],
        "praxis_complete": [
            "{from_name} executed. {to_name} is still in the queue.",
        ],
    },
}


# =============================================================================
# ERA DEFINITION
# =============================================================================

ERA_1 = EraConfig(
    name="TestEra",
    config_key="era_1",
    max_task_signups=20,
    max_duel_participants=2,
    max_collab_participants=20,
    vote_budget_base=100,
    vote_budget_multiplier=2.0,
    level_thresholds=(0, 10, 70, 170, 330, 610, 1090, 1840, 3040),
    reset_score=True,
    reset_level=True,
    reset_faction=True,
    reset_vote_budget=True,
    reset_all_time_score=False,
    factions=ERA_1_FACTIONS,
    tasks=ERA_1_TASKS,
    taunt_templates=ERA_1_TAUNT_TEMPLATES,
)
