"""Flag-reason vocabulary helpers (ADR-0037). `Flag.reason` is plain text;
legacy free-text rows and `other` notes share one path."""

from models.flag import FlagReason, normalize_flag_reason, stored_flag_reason


class TestStoredFlagReason:
    def test_named_reason_stores_its_key(self):
        assert stored_flag_reason(FlagReason.spam, None) == "spam"
        assert stored_flag_reason(FlagReason.harassment, None) == "harassment"

    def test_named_reason_ignores_a_stray_note(self):
        assert stored_flag_reason(FlagReason.nsfw, "extra text") == "nsfw"

    def test_other_with_note_folds_note_into_reason(self):
        assert (
            stored_flag_reason(FlagReason.other, "  reads like an ad  ")
            == "reads like an ad"
        )

    def test_other_without_note_stores_other(self):
        assert stored_flag_reason(FlagReason.other, None) == "other"
        assert stored_flag_reason(FlagReason.other, "   ") == "other"


class TestNormalizeFlagReason:
    def test_enum_keys_map_to_themselves(self):
        for reason in FlagReason:
            assert normalize_flag_reason(reason.value) == (reason, None)

    def test_legacy_free_text_renders_as_other_with_detail(self):
        assert normalize_flag_reason("inappropriate stuff") == (
            FlagReason.other,
            "inappropriate stuff",
        )

    def test_pre_enum_empty_default_renders_as_other(self):
        # server_default="" predates the enum
        assert normalize_flag_reason("") == (FlagReason.other, None)

    def test_round_trip_of_an_other_note(self):
        stored = stored_flag_reason(FlagReason.other, "reads like an ad")
        assert normalize_flag_reason(stored) == (FlagReason.other, "reads like an ad")
