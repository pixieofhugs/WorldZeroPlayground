/**
 * The Squire's Writ — Warriors of Whimsy's edit-praxis composer (#835).
 *
 * An illuminated commission on cream parchment: gilt frame, gold/plum checker
 * band, wax-seal crest in the header, and every field set on its own inset
 * parchment plate. Copy is knightly and mock-heraldic ("Title of thy Chronicle",
 * "Discard the Writ") — the words live in `forms:editPraxis.wow.*`.
 *
 * PALETTE — no new tokens (see the note in the issue thread). #838/#840 already
 * moved WOW onto the cream/gold/plum chronicle palette (ADR-0050), so the design
 * kit's "whimsy" plum (#7A4A9E light / #C79BE0 dark) is already declared as
 * `--faction-wow-card-accent`, and its gold ink is `--faction-wow-stamp-total`.
 * Minting a second plum here would have left two tokenised sources of truth for
 * one colour — exactly the drift the linter cannot see.
 *
 * Behaviour is entirely the shared controls'; this file owns only the dress.
 */
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ErrorBanner,
  TaskMetaInline,
  TitleCounter,
  formatAutosave,
} from "./shared";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import { MetataskSealStack } from "../MetataskSealStack";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

/* ───────── the wax-seal crest (inlined from the WoW identity kit) ───────── */

function WritCrest({
  size = 52,
  gold,
  plum,
  field,
  ink,
}: {
  size?: number;
  gold: string;
  plum: string;
  field: string;
  ink: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.04}
      viewBox="0 0 52 54"
      aria-hidden
      role="presentation"
    >
      {/* shield */}
      <path
        d="M26 2 L48 9 V27 C48 40 38 48 26 52 C14 48 4 40 4 27 V9 Z"
        fill={field}
        stroke={gold}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* plum chief */}
      <path
        d="M26 2 L48 9 V18 H4 V9 Z"
        fill={plum}
        stroke={gold}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* crossed batons — pool-noodle lances, knobbed */}
      <path
        d="M15 42 L37 24 M37 42 L15 24"
        stroke={gold}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="15" cy="42" r="2.6" fill={plum} stroke={gold} strokeWidth="1" />
      <circle cx="37" cy="42" r="2.6" fill={plum} stroke={gold} strokeWidth="1" />
      {/* the ✦ mark riding the chief */}
      <path
        d="M26 5.5 C26.9 9.7 28.6 11.4 32.8 12.3 C28.6 13.2 26.9 14.9 26 19.1 C25.1 14.9 23.4 13.2 19.2 12.3 C23.4 11.4 25.1 9.7 26 5.5 Z"
        fill={gold}
      />
      <circle cx="26" cy="33" r="4.2" fill={gold} stroke={ink} strokeWidth="0.8" />
    </svg>
  );
}

export default function WowEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;

  const modeOptions: Array<{ key: PraxisType; label: string; desc: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    label: t(`editPraxis.wow.mode.${key}.label`),
    desc: t(`editPraxis.wow.mode.${key}.desc`),
  }));

  /* The chronicle palette, straight off the post-#838 token block. */
  const gold = factionCssVar("wow", "chronicle-gold"); // the gilt frame + rules
  const goldInk = factionCssVar("wow", "stamp-total"); // gold that is legible AS TEXT
  const plum = factionCssVar("wow", "card-accent"); // the design's "whimsy"
  const plumDeep = factionCssVar("wow", "stamp-chip-bg"); // the plum pill ground
  const onPlum = factionCssVar("wow", "stamp-chip-text");
  const frameBg = factionCssVar("wow", "chronicle-bg");
  const panelBg = factionCssVar("wow", "chronicle-panel"); // inset parchment plate
  const panelBorder = factionCssVar("wow", "border");
  const fieldBg = factionCssVar("wow", "card-bg");
  const ink = factionCssVar("wow", "card-text");
  const muted = factionCssVar("wow", "card-muted");
  const tint = factionCssVar("wow", "light");
  const onGold = factionCssVar("wow", "on-fill"); // 8.1:1 on the gold, both themes
  const shadow = factionCssVar("wow", "chronicle-shadow");
  const displayFont = factionCssVar("wow", "card-font"); // MedievalSharp
  const bodyFont = factionCssVar("wow", "body-font"); // Lora

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const eyebrowStyle: CSSProperties = {
    display: "block",
    fontFamily: displayFont,
    fontSize: "var(--text-md)",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: goldInk,
  };

  /** Every field sits on its own inset parchment plate. */
  const plate: CSSProperties = {
    background: panelBg,
    border: `1px solid ${panelBorder}`,
    borderRadius: 12,
    padding: "var(--space-lg) var(--space-lg)",
    marginBottom: "var(--space-lg)",
  };

  const fieldStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: fieldBg,
    color: ink,
    border: `1.5px solid ${panelBorder}`,
    borderRadius: 9,
    outline: "none",
  };

  return (
    <div
      style={{
        fontFamily: bodyFont,
        color: ink,
        background: tint,
        minHeight: "100vh",
        padding: "var(--space-2xl) var(--space-lg) var(--space-5xl)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={plum}
        />

        {/* ── the writ itself ── */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            background: frameBg,
            border: `2px solid ${gold}`,
            boxShadow: `0 20px 46px -22px ${shadow}`,
          }}
        >
          {/* gold/plum checker band */}
          <div
            aria-hidden
            style={{
              height: 9,
              background: `repeating-linear-gradient(90deg, ${gold} 0 11px, ${plumDeep} 11px 22px)`,
            }}
          />

          {/* writ header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
              padding: "var(--space-lg) var(--space-xl)",
              borderBottom: `1px solid ${panelBorder}`,
              background: tint,
            }}
          >
            <WritCrest
              size={52}
              gold={gold}
              plum={plumDeep}
              field={panelBg}
              ink={ink}
            />
            <div>
              <div
                style={{
                  fontFamily: displayFont,
                  fontSize: "var(--text-title)",
                  lineHeight: 1.1,
                  color: ink,
                }}
              >
                {t("editPraxis.wow.pageTitle")}
              </div>
              <div
                style={{
                  fontFamily: bodyFont,
                  fontStyle: "italic",
                  fontSize: "var(--text-lg)",
                  color: muted,
                }}
              >
                {t("editPraxis.wow.pageSubtitle")}
              </div>
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: displayFont,
                fontSize: "var(--text-lg)",
                letterSpacing: "0.08em",
                color: plum,
                background: panelBg,
                border: `1px solid ${panelBorder}`,
                borderRadius: 20,
                padding: "var(--space-xs) var(--space-md)",
                whiteSpace: "nowrap",
              }}
            >
              {t("editPraxis.wow.draftChip")}
            </span>
          </div>

          <div style={{ padding: "var(--space-xl)" }}>
            {/* ── the quest, read only ── */}
            <div style={{ ...plate, borderLeft: `4px solid ${gold}` }}>
              <span style={{ ...eyebrowStyle, marginBottom: "var(--space-sm)" }}>
                {t("editPraxis.wow.taskRefLabel")}
              </span>
              <div
                style={{
                  fontFamily: displayFont,
                  fontSize: "var(--text-title)",
                  lineHeight: 1.15,
                  color: ink,
                  marginBottom: "var(--space-xs)",
                }}
              >
                {praxis.task_title}
              </div>
              {task?.description && (
                <div
                  style={{
                    fontFamily: bodyFont,
                    fontStyle: "italic",
                    fontSize: "var(--text-content)",
                    lineHeight: 1.5,
                    color: muted,
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  {task.description}
                </div>
              )}
              <TaskMetaInline praxis={praxis} task={task} textColor={goldInk} />
            </div>

            {/* ── manner of quest ── */}
            {!state.controlsLocked && (
              <div style={plate}>
                <span
                  style={{ ...eyebrowStyle, marginBottom: "var(--space-md)" }}
                >
                  {t("editPraxis.wow.modeLabel")}
                </span>
                <ModePicker
                  state={state}
                  skin={{
                    containerStyle: {
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-sm)",
                    },
                    options: modeOptions,
                    allowedModes,
                    renderOption: (opt, { active, disabled, onSelect }) => (
                      <button
                        key={opt.key}
                        type="button"
                        aria-pressed={active}
                        onClick={onSelect}
                        disabled={disabled && !active}
                        style={{
                          flex: "1 1 180px",
                          textAlign: "left",
                          cursor: disabled ? "not-allowed" : "pointer",
                          background: active ? tint : fieldBg,
                          border: `2px solid ${active ? gold : panelBorder}`,
                          borderRadius: 10,
                          padding: "var(--space-md)",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "var(--space-sm)",
                            fontFamily: displayFont,
                            fontSize: "var(--text-xl)",
                            color: ink,
                          }}
                        >
                          {opt.label}
                          <span style={{ color: gold }}>
                            {active ? t("editPraxis.wow.chosenMark") : ""}
                          </span>
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontFamily: bodyFont,
                            fontSize: "var(--text-lg)",
                            lineHeight: 1.4,
                            color: muted,
                            marginTop: "var(--space-xs)",
                          }}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    ),
                  }}
                />
              </div>
            )}

            {/* ── summon fellow knights ── */}
            {state.showInviteBox && (
              <div style={plate}>
                <span
                  style={{ ...eyebrowStyle, marginBottom: "var(--space-md)" }}
                >
                  {state.duelMode
                    ? t("editPraxis.wow.inviteLabelDuel")
                    : t("editPraxis.wow.inviteLabel")}
                </span>
                <InviteSearch
                  state={state}
                  skin={{
                    fontFamily: bodyFont,
                    inputBg: fieldBg,
                    inputColor: ink,
                    inputBorder: `1.5px solid ${panelBorder}`,
                    dropdownBg: panelBg,
                    dropdownBorder: `1.5px solid ${gold}`,
                    acceptedBg: plumDeep,
                    acceptedColor: onPlum,
                    pendingColor: plum,
                    placeholder: t("editPraxis.wow.invitePlaceholder"),
                  }}
                />
                <div
                  style={{
                    fontFamily: bodyFont,
                    fontStyle: "italic",
                    fontSize: "var(--text-lg)",
                    color: muted,
                    marginTop: "var(--space-sm)",
                  }}
                >
                  {t("editPraxis.wow.inviteHelper")}
                </div>
              </div>
            )}

            {/* ── title of thy chronicle ── */}
            <div style={plate}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-md)",
                  marginBottom: "var(--space-md)",
                }}
              >
                <span style={eyebrowStyle}>
                  {t("editPraxis.wow.titleLabel")}
                </span>
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontStyle: "italic",
                    fontSize: "var(--text-lg)",
                    color: muted,
                  }}
                >
                  {state.autosaveAt
                    ? t("editPraxis.wow.autosaveSaved", {
                        ago: formatAutosave(state.autosaveAt),
                      })
                    : t("editPraxis.wow.autosaveUnsaved")}
                </span>
              </div>
              <TitleField
                state={state}
                skin={{
                  placeholder: t("editPraxis.wow.titlePlaceholder"),
                  inputStyle: {
                    ...fieldStyle,
                    fontFamily: displayFont,
                    padding: "var(--space-md) var(--space-lg)",
                  },
                }}
              />
              <div
                style={{
                  textAlign: "right",
                  marginTop: "var(--space-xs)",
                }}
              >
                <TitleCounter length={state.title.length} color={muted} />
              </div>
            </div>

            {/* ── the chronicle ── */}
            <div style={plate}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-md)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                <span style={eyebrowStyle}>{t("editPraxis.wow.bodyLabel")}</span>
                <span
                  style={{
                    fontFamily: bodyFont,
                    fontStyle: "italic",
                    fontSize: "var(--text-lg)",
                    color: muted,
                  }}
                >
                  {t("editPraxis.wow.bodyWords", { words: state.wordCount })}
                </span>
              </div>
              <BodyTextarea
                state={state}
                skin={{
                  rows: 12,
                  placeholder: t("editPraxis.wow.bodyPlaceholder"),
                  toolbarButtonStyle: {
                    background: fieldBg,
                    color: ink,
                    border: `1.5px solid ${panelBorder}`,
                    borderRadius: 7,
                    fontFamily: bodyFont,
                  },
                  textareaStyle: {
                    ...fieldStyle,
                    fontFamily: bodyFont,
                    lineHeight: 1.55,
                    padding: "var(--space-md) var(--space-lg)",
                    resize: "vertical",
                    minHeight: 220,
                  },
                }}
              />
              <BodyPreview
                state={state}
                skin={{
                  wrapperStyle: {
                    marginTop: "var(--space-md)",
                    background: fieldBg,
                    border: `1px dashed ${panelBorder}`,
                    borderRadius: 9,
                    padding: "var(--space-lg)",
                  },
                  label: (
                    <span
                      style={{
                        ...eyebrowStyle,
                        color: plum,
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("editPraxis.wow.previewLabel")}
                    </span>
                  ),
                  markdownStyle: {
                    fontFamily: bodyFont,
                    lineHeight: 1.6,
                    color: ink,
                  },
                }}
              />
            </div>

            {/* ── illuminations & relics ── */}
            <div style={plate}>
              <span style={{ ...eyebrowStyle, marginBottom: "var(--space-md)" }}>
                {t("editPraxis.wow.filesLabel")}
              </span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-md)",
                  alignItems: "flex-start",
                }}
              >
                <FilePicker
                  state={state}
                  skin={{
                    buttonStyle: {
                      width: 132,
                      height: 96,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-xs)",
                      background: fieldBg,
                      border: `2px dashed ${gold}`,
                      borderRadius: 9,
                      cursor: "pointer",
                      fontFamily: displayFont,
                      fontSize: "var(--text-xl)",
                      color: plum,
                    },
                    buttonLabel: t("editPraxis.wow.fileButton"),
                    helperText: t("editPraxis.wow.fileHelper"),
                    helperStyle: {
                      fontFamily: bodyFont,
                      fontSize: "var(--text-lg)",
                      color: muted,
                      marginTop: "var(--space-xs)",
                    },
                  }}
                />
                {state.media.map((item) => {
                  const filename =
                    item.file_path.split("/").pop() ?? item.file_path;
                  const src = mediaUrl(item.file_path);
                  return (
                    <RelicTile
                      key={item.id}
                      caption={filename}
                      borderColor={panelBorder}
                      captionColor={muted}
                      removeBg={plumDeep}
                      removeColor={onPlum}
                      onRemove={() => void state.removeMedia(item)}
                    >
                      {item.type === "image" ? (
                        <img
                          src={src}
                          alt=""
                          style={{
                            width: 132,
                            height: 96,
                            objectFit: "cover",
                          }}
                        />
                      ) : item.type === "video" ? (
                        <video
                          src={src}
                          style={{
                            width: 132,
                            height: 96,
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <MediaArt art={pickArtKey(filename, "audio")} />
                      )}
                    </RelicTile>
                  );
                })}
              </div>
            </div>

            {/* ── deeds of merit ── */}
            {state.showSealStack && (
              <div style={plate}>
                <span
                  style={{ ...eyebrowStyle, marginBottom: "var(--space-md)" }}
                >
                  {t("editPraxis.wow.metatasksLabel")}
                </span>
                <MetataskSealStack state={state} />
              </div>
            )}

            <ErrorBanner message={state.error} />

            {/* ── seal it ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
                flexWrap: "wrap",
                marginTop: "var(--space-lg)",
                paddingTop: "var(--space-lg)",
                borderTop: `1px solid ${panelBorder}`,
              }}
            >
              <DropButton
                state={state}
                skin={{
                  label: t("editPraxis.wow.dropLabel"),
                  style: {
                    fontFamily: displayFont,
                    fontSize: "var(--text-xl)",
                    color: plum,
                    background: "transparent",
                    border: `2px solid ${panelBorder}`,
                    borderRadius: 8,
                    padding: "var(--space-sm) var(--space-xl)",
                    cursor: "pointer",
                  },
                }}
              />
              <span
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontFamily: bodyFont,
                  fontStyle: "italic",
                  fontSize: "var(--text-lg)",
                  color: muted,
                }}
              >
                {t("editPraxis.wow.footerNote")}
              </span>
              <PublishButton
                state={state}
                skin={{
                  idleLabel: t("editPraxis.wow.publishIdle"),
                  busyLabel: t("editPraxis.wow.publishBusy"),
                  style: {
                    fontFamily: displayFont,
                    fontSize: "var(--text-xl)",
                    letterSpacing: "0.04em",
                    color: onGold,
                    background: gold,
                    border: `2px solid ${goldInk}`,
                    borderRadius: 8,
                    padding: "var(--space-sm) var(--space-2xl)",
                    cursor: state.submitting ? "wait" : "pointer",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RelicTileProps {
  children: React.ReactNode;
  caption: string;
  borderColor: string;
  captionColor: string;
  removeBg: string;
  removeColor: string;
  onRemove: () => void;
}

/** One attached illumination: a gilt-edged thumbnail with its file name below. */
function RelicTile({
  children,
  caption,
  borderColor,
  captionColor,
  removeBg,
  removeColor,
  onRemove,
}: RelicTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div style={{ width: 132 }}>
      <div
        style={{
          position: "relative",
          width: 132,
          height: 96,
          overflow: "hidden",
          borderRadius: 9,
          border: `1.5px solid ${borderColor}`,
        }}
      >
        {children}
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("media.removeAria", { name: caption })}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "none",
            background: removeBg,
            color: removeColor,
            fontSize: "var(--text-lg)",
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: "var(--text-lg)",
          color: captionColor,
          marginTop: "var(--space-xs)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {caption}
      </div>
    </div>
  );
}
