/**
 * Warriors of Whimsy MOBILE composer (#836) — The Squire's Writ on a phone.
 *
 * Same single-column composer every faction gets on mobile (#494/#498): a
 * Write/Preview segmented toggle instead of a stacked textarea+preview, a fluid
 * media grid, and a sticky submit bar riding above the tab bar. The WoW kit has
 * no mobile composer design of its own (its section 09 is the Field Desk, a home
 * surface), so this file dresses the settled mobile structure in the writ
 * identity shipped on desktop by #835: gilt frame, gold/plum checker rule,
 * wax-seal mark, and each field on its own inset parchment plate.
 *
 * PALETTE — no new tokens. Reads the same post-#838/#840 chronicle block the
 * desktop archetype does (ADR-0050): `--faction-wow-card-accent` IS the kit's
 * plum, `--faction-wow-stamp-total` its legible gold ink, `-chronicle-*` the
 * parchment. Nothing here mints or repoints a colour.
 *
 * Consumes `useEditPraxis` verbatim through the shared skinnable controls — no
 * editor, upload, or submit logic lives here. Presentation-only.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import { ErrorBanner, TaskMetaInline, TitleCounter, formatAutosave } from "../archetypes/shared";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  PublishButton,
  TitleField,
} from "../archetypes/controls";
import { MetataskSealStack } from "../MetataskSealStack";
import type { EditPraxisState } from "../useEditPraxis";
import {
  DefaultModePicker,
  MobileStickyBar,
  SegToggle,
  type ComposerTab,
} from "./shared";

/* The chronicle palette, straight off the post-#838 token block. */
const GOLD = factionCssVar("wow", "chronicle-gold"); // gilt frame + rules
const GOLD_INK = factionCssVar("wow", "stamp-total"); // gold that is legible AS TEXT
const PLUM = factionCssVar("wow", "card-accent"); // the kit's "whimsy"
const PLUM_DEEP = factionCssVar("wow", "stamp-chip-bg"); // the plum pill ground
const ON_PLUM = factionCssVar("wow", "stamp-chip-text");
const FRAME_BG = factionCssVar("wow", "chronicle-bg");
const PANEL_BG = factionCssVar("wow", "chronicle-panel"); // inset parchment plate
const PANEL_BORDER = factionCssVar("wow", "border");
const FIELD_BG = factionCssVar("wow", "card-bg");
const INK = factionCssVar("wow", "card-text");
const MUTED = factionCssVar("wow", "card-muted");
const TINT = factionCssVar("wow", "light");
const ON_GOLD = factionCssVar("wow", "on-fill"); // 8.1:1 on the gold, both themes
const SHADOW = factionCssVar("wow", "chronicle-shadow");
const DISPLAY = factionCssVar("wow", "card-font"); // MedievalSharp
const BODY = factionCssVar("wow", "body-font"); // Lora

const eyebrow: CSSProperties = {
  display: "block",
  fontFamily: DISPLAY,
  fontSize: "var(--text-md)",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: GOLD_INK,
};

/** The wax seal, reduced to a phone-sized roundel: gilt rim, plum wax, ✦ mark. */
function WaxSeal({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden role="presentation">
      <circle cx="15" cy="15" r="13" fill={PLUM_DEEP} stroke={GOLD} strokeWidth="2" />
      <circle
        cx="15"
        cy="15"
        r="9.5"
        fill="none"
        stroke={GOLD}
        strokeWidth="0.9"
        strokeDasharray="2 2"
      />
      <path
        d="M15 6.5c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z"
        fill={GOLD}
      />
    </svg>
  );
}

/** A hairline of the gold/plum checker band the writ is framed in. */
function CheckerRule() {
  return (
    <div
      aria-hidden
      style={{
        height: 6,
        background: `repeating-linear-gradient(90deg, ${GOLD} 0 9px, ${PLUM_DEEP} 9px 18px)`,
      }}
    />
  );
}

/**
 * One field on its own inset parchment plate: gilt frame, checker rule, an
 * eyebrow-titled header (with an optional right-hand aside for counters), and
 * the control below. Fluid — no fixed width anywhere, so it survives 375px.
 */
function Plate({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: 14,
        overflow: "hidden",
        background: FRAME_BG,
        border: `1.5px solid ${GOLD}`,
        boxShadow: `0 10px 24px -14px ${SHADOW}`,
      }}
    >
      <CheckerRule />
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          background: TINT,
          borderBottom: `1px solid ${PANEL_BORDER}`,
        }}
      >
        <span style={eyebrow}>{title}</span>
        {aside}
      </div>
      <div style={{ padding: "var(--space-md)", background: PANEL_BG }}>{children}</div>
    </section>
  );
}

/** Italic marginalia — autosave line, word count, the closing note. */
function Marginalia({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: BODY,
        fontStyle: "italic",
        fontSize: "var(--text-lg)",
        color: MUTED,
      }}
    >
      {children}
    </span>
  );
}

export default function WowEditPraxis({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  return (
    <div
      data-skin="wow"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
        fontFamily: BODY,
        color: INK,
        background: FRAME_BG,
      }}
    >
      {/* ── writ header + Write/Preview toggle ── */}
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <WaxSeal />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: DISPLAY,
                fontSize: "var(--text-title)",
                lineHeight: 1.05,
                color: INK,
              }}
            >
              {t("editPraxis.wow.pageTitle")}
            </h1>
            <Marginalia>
              {state.autosaveAt
                ? t("editPraxis.wow.autosaveSaved", {
                    ago: formatAutosave(state.autosaveAt),
                  })
                : t("editPraxis.wow.autosaveUnsaved")}
            </Marginalia>
          </div>
          <span
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              fontFamily: DISPLAY,
              fontSize: "var(--text-lg)",
              letterSpacing: "0.08em",
              color: PLUM,
              background: PANEL_BG,
              border: `1px solid ${PANEL_BORDER}`,
              borderRadius: 20,
              padding: "var(--space-xs) var(--space-sm)",
              whiteSpace: "nowrap",
            }}
          >
            {t("editPraxis.wow.draftChip")}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: {
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              background: PANEL_BG,
              border: `1.5px solid ${GOLD}`,
              borderRadius: 999,
            },
            buttonStyle: (active) => ({
              padding: "var(--space-sm)",
              borderRadius: 999,
              border: active ? `1.5px solid ${GOLD_INK}` : "1.5px solid transparent",
              fontFamily: DISPLAY,
              fontSize: "var(--text-lg)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: active ? GOLD : "transparent",
              color: active ? ON_GOLD : MUTED,
            }),
          }}
        />
      </header>

      {/* ── the quest, read only ── */}
      <div
        style={{
          padding: "var(--space-md)",
          background: PANEL_BG,
          border: `1px solid ${PANEL_BORDER}`,
          borderLeft: `4px solid ${GOLD}`,
          borderRadius: 12,
        }}
      >
        <span style={{ ...eyebrow, marginBottom: "var(--space-xs)" }}>
          {t("editPraxis.wow.taskRefLabel")}
        </span>
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: "var(--text-content)",
            lineHeight: 1.15,
            color: INK,
            marginBottom: "var(--space-xs)",
          }}
        >
          {praxis.task_title}
        </div>
        <TaskMetaInline praxis={praxis} task={task} textColor={GOLD_INK} />
      </div>

      {tab === "write" ? (
        <>
          {/* Mode — Solo · Collab · Duel, above the title (scrolls with content) */}
          <DefaultModePicker state={state} />

          <Plate
            title={t("editPraxis.wow.titleLabel")}
            aside={<TitleCounter length={state.title.length} color={MUTED} />}
          >
            <TitleField
              state={state}
              skin={{
                placeholder: t("editPraxis.wow.titlePlaceholder"),
                inputStyle: {
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: DISPLAY,
                  color: INK,
                  background: FIELD_BG,
                  border: `1.5px solid ${PANEL_BORDER}`,
                  borderRadius: 9,
                  padding: "var(--space-sm) var(--space-md)",
                  outline: "none",
                },
              }}
            />
          </Plate>

          <Plate
            title={t("editPraxis.wow.bodyLabel")}
            aside={
              <Marginalia>
                {t("editPraxis.wow.bodyWords", { words: state.wordCount })}
              </Marginalia>
            }
          >
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t("editPraxis.wow.bodyPlaceholder"),
                toolbarButtonStyle: {
                  background: FIELD_BG,
                  color: INK,
                  border: `1.5px solid ${PANEL_BORDER}`,
                  borderRadius: 7,
                  fontFamily: BODY,
                },
                textareaStyle: {
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: BODY,
                  lineHeight: 1.55,
                  color: INK,
                  background: FIELD_BG,
                  border: `1.5px solid ${PANEL_BORDER}`,
                  borderRadius: 9,
                  padding: "var(--space-md)",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 180,
                },
              }}
            />
          </Plate>

          {state.showInviteBox && (
            <Plate
              title={
                state.duelMode
                  ? t("editPraxis.wow.inviteLabelDuel")
                  : t("editPraxis.wow.inviteLabel")
              }
              aside={<Marginalia>{t("editPraxis.wow.inviteHelper")}</Marginalia>}
            >
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: BODY,
                  inputBg: FIELD_BG,
                  inputColor: INK,
                  inputBorder: `1.5px solid ${PANEL_BORDER}`,
                  dropdownBg: PANEL_BG,
                  dropdownBorder: `1.5px solid ${GOLD}`,
                  acceptedBg: PLUM_DEEP,
                  acceptedColor: ON_PLUM,
                  pendingColor: PLUM,
                  placeholder: t("editPraxis.wow.invitePlaceholder"),
                }}
              />
            </Plate>
          )}

          <Plate
            title={t("editPraxis.wow.filesLabel")}
            aside={<Marginalia>{t("editPraxis.wow.fileHelper")}</Marginalia>}
          >
            <RelicGrid state={state} />
          </Plate>

          {state.showSealStack && (
            <Plate title={t("editPraxis.wow.metatasksLabel")}>
              <MetataskSealStack state={state} />
            </Plate>
          )}
        </>
      ) : (
        <Plate title={t("editPraxis.wow.previewLabel")}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: "var(--text-title)",
              lineHeight: 1.15,
              color: INK,
              marginBottom: "var(--space-sm)",
            }}
          >
            {state.title || t("editPraxis.wow.titlePlaceholder")}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
              <RelicGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                background: FIELD_BG,
                border: `1px dashed ${PANEL_BORDER}`,
                borderRadius: 9,
                padding: "var(--space-md)",
              },
              markdownStyle: {
                fontFamily: BODY,
                lineHeight: 1.6,
                color: INK,
              },
            }}
          />
        </Plate>
      )}

      <ErrorBanner message={state.error} />

      {/* ── seal it ── */}
      <MobileStickyBar
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          padding: "var(--space-md) 0 var(--space-xs)",
          background: "var(--color-nav-bg)",
          backdropFilter: "blur(var(--nav-blur))",
          borderTop: `1.5px solid ${GOLD}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.wow.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: PLUM,
                fontFamily: DISPLAY,
                fontSize: "var(--text-lg)",
                whiteSpace: "nowrap",
                cursor: "pointer",
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            ornament: <WaxSeal size={18} />,
            idleLabel: t("editPraxis.wow.publishIdle"),
            busyLabel: t("editPraxis.wow.publishBusy"),
            style: {
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              background: GOLD,
              color: ON_GOLD,
              fontFamily: DISPLAY,
              fontSize: "var(--text-lg)",
              letterSpacing: "0.06em",
              padding: "var(--space-md) var(--space-lg)",
              border: `2px solid ${GOLD_INK}`,
              borderRadius: 12,
              cursor: state.submitting ? "wait" : "pointer",
            },
          }}
        />
      </MobileStickyBar>
    </div>
  );
}

/** Fluid 3-column grid of illuminations & relics, each in a gilt-edged tile. */
function RelicGrid({
  state,
  readOnly = false,
}: {
  state: EditPraxisState;
  readOnly?: boolean;
}) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--space-sm)",
      }}
    >
      {state.media.map((item) => {
        const filename = item.file_path.split("/").pop() ?? item.file_path;
        const src = mediaUrl(item.file_path);
        return (
          <div
            key={item.id}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              overflow: "hidden",
              borderRadius: 9,
              border: `1.5px solid ${GOLD}`,
              background: FIELD_BG,
            }}
          >
            {item.type === "image" ? (
              <img
                src={src}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : item.type === "video" ? (
              <video
                src={src}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <MediaArt art={pickArtKey(filename, "audio")} width={120} height={120} />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => void state.removeMedia(item)}
                aria-label={t("media.removeAria", { name: filename })}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: PLUM_DEEP,
                  border: `1px solid ${GOLD}`,
                  color: ON_PLUM,
                  fontSize: "var(--text-lg)",
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <FilePicker
          state={state}
          skin={{
            buttonStyle: {
              aspectRatio: "1 / 1",
              width: "100%",
              background: FIELD_BG,
              border: `2px dashed ${GOLD}`,
              borderRadius: 9,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-xs)",
              fontFamily: DISPLAY,
              fontSize: "var(--text-xl)",
              color: PLUM,
            },
            buttonLabel: t("editPraxis.wow.fileButton"),
          }}
        />
      )}
    </div>
  );
}
