"""#2141 — text on `-plate-disc` takes the band's inks.

The disc is the one sheet in the register that does not flip, so a sheet ink on
it is the invisible failure: `-plate-ink` is the same #12151f as the disc in
light and reads 1.00:1. The two inks measured on the compass blue in BOTH themes
are the band's — `-band-ink` 7.59:1 (the mark) and `-band-quiet` 8.37:1.
"""
import io


def patch(path, edits):
    s = io.open(path, encoding="utf-8").read()
    for a, b in edits:
        assert s.count(a) == 1, (path, a[:70], s.count(a))
        s = s.replace(a, b)
    io.open(path, "w", encoding="utf-8", newline="").write(s)
    print("ok", path)


patch("frontend/src/components/taskCard/EphemeristsTaskCard.tsx", [
    (
        '                  <span style={{ fontFamily: DECO, fontSize: size.pointsSize }}>{basePoints}</span>',
        '                  {/* THE ROSE IS A DARK CHIP ON A LIGHT SHEET (#2141), so this\n'
        '                      numeral states its ink instead of inheriting the plate\'s:\n'
        '                      `-plate-ink` is the same #12151f as the disc in light and\n'
        '                      would read 1.00:1. `-plate-band-ink` is the MARK, and the\n'
        '                      compass blue is the ground it is measured on — 7.59:1 in\n'
        '                      both themes. */}\n'
        '                  <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: "var(--faction-ephemerists-plate-band-ink)" }}>{basePoints}</span>',
    ),
    (
        'marginTop: "var(--space-xs)", color: "var(--faction-ephemerists-plate-muted)" }}>',
        'marginTop: "var(--space-xs)", color: "var(--faction-ephemerists-plate-band-quiet)" }}>',
    ),
])

patch("frontend/src/pages/taskDetail/archetypes/EphemeristsTaskDetail.tsx", [
    (
        '<span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: INK }}>{modifiedPoints}</span>',
        '{/* The medallion is a dark chip in both themes; its inks are the\n'
        '              band\'s, not the sheet\'s (#2141). */}\n'
        '          <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: BAND_INK }}>{modifiedPoints}</span>',
    ),
    (
        '              marginTop: "var(--space-xs)",\n              color: CAPTION,\n            }}\n          >\n            {t("detail.points.total")}',
        '              marginTop: "var(--space-xs)",\n              color: BAND_QUIET,\n            }}\n          >\n            {t("detail.points.total")}',
    ),
    (
        '                  fontSize: "var(--text-md)",\n                  color: INK,',
        '                  fontSize: "var(--text-md)",\n                  color: BAND_INK,',
    ),
])

patch("frontend/src/pages/praxisDetail/archetypes/EphemeristsPraxisDetail.tsx", [
    (
        '            letterSpacing: "0.08em",\n            color: INK,',
        '            letterSpacing: "0.08em",\n            // The octagon is the compass blue in both themes (#2141), so the\n'
        '            // initial takes the band\'s mark rather than the sheet\'s ink.\n            color: BAND_INK,',
    ),
])

patch("frontend/src/components/praxisCard/scoreStamp/EphemeristsScoreStamp.tsx", [
    (
        '                fontSize: "var(--text-md)",\n                color: CAPTION,',
        '                fontSize: "var(--text-md)",\n                color: BAND_QUIET,',
    ),
])

patch("frontend/src/components/avatar/EphemeristsAvatar.tsx", [
    ("        textColor: INK,", "        textColor: BAND_INK,"),
])
