"""Every row on the Notifications card has a push sender (#3678)."""

from services.notification_prefs import NOTIFICATION_EVENTS
from services.push import SENDERS


def test_every_preference_row_has_a_sender():
    assert set(SENDERS) == {event.key for event in NOTIFICATION_EVENTS}
