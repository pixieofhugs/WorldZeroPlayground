/**
 * Default / na / Albescent / fallback — the UNAFFILIATED reference-slip kit.
 * `default` ≡ `na` ≡ Unaffiliated is ONE identity (ADR-0039/0046/0048): a clean
 * editorial "reference slip" on the global --faction-default-* tokens (flips
 * light/dark), with the spectrum rainbow used only as accent — the top band, the
 * frame around the task reference, and the active-mode border. No bespoke
 * metaphor, no faction fonts: body/display/accent are the system token faces.
 */
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import DefaultSigil from "../../../components/cards/DefaultSigil";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ErrorBanner,
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
  SaveDraftButton,
  TitleField,
} from "./controls";
import { MetataskSealStack } from "../MetataskSealStack";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

// The na kit runs entirely on the global --faction-default-* tokens so it flips
// light/dark through the cascade; the rainbow appears only as an accent.
const SURFACE = "var(--faction-default-card-bg)";
const TEXT = "var(--faction-default-card-text)";
const MUTED = "var(--faction-default-card-muted)";
const BORDER = "var(--faction-default-border)";
const RAINBOW = "var(--faction-default-rainbow)";

// Section micro-label ("How did you work?", "Give it a headline"…). Label tier:
// uppercase, letter-spaced, scanned not read (§4).
const cap: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-base)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: MUTED,
  marginBottom: "var(--space-md)",
};

export default function DefaultEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const modeOptions: Array<{ key: PraxisType; label: string; desc: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    label: t(`editPraxis.na.mode.${key}.label`),
    desc: t(`editPraxis.na.mode.${key}.desc`),
  }));

  return (
    <div
      style={{
        padding: "var(--space-2xl) var(--space-lg) var(--space-4xl)",
        fontFamily: "var(--font-body)",
        color: TEXT,
      }}
    >
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
        />

        {/* Reference-slip card: rainbow band → header → intro → task ref. */}
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 16px 40px -24px rgba(0,0,0,0.5)",
          }}
        >
          {/* 6px spectrum band across the top — the "all paths open" accent. */}
          <div style={{ height: 6, background: RAINBOW }} />

          <div style={{ padding: "var(--space-xl) var(--space-2xl) var(--space-2xl)" }}>
            {/* Header: sigil + eyebrow + display H2, autosave to the right. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
                marginBottom: "var(--space-sm)",
              }}
            >
              <DefaultSigil size={30} />
              <div>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {t("editPraxis.na.eyebrow")}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: "var(--text-heading)",
                    lineHeight: 1,
                    margin: "var(--space-xs) 0 0",
                    color: TEXT,
                  }}
                >
                  {t("editPraxis.na.pageTitle")}
                </h2>
              </div>
              <span
                style={{
                  marginLeft: "auto",
                  alignSelf: "flex-start",
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                {state.autosaveAt
                  ? t("editPraxis.na.autosaveSaved", {
                      ago: formatAutosave(state.autosaveAt),
                    })
                  : t("editPraxis.na.autosaveUnsaved")}
              </span>
            </div>

            {/* Neutral intro — a full sentence, so it reads at the content floor. */}
            <p
              style={{
                // design: 11.5px → var(--text-content) (18px) because the
                // content-text floor governs readable sentences (§4).
                fontSize: "var(--text-content)",
                lineHeight: 1.55,
                color: MUTED,
                margin: "0 0 var(--space-xl)",
                maxWidth: 460,
              }}
            >
              {t("editPraxis.na.intro")}
            </p>

            {/* Reference slip — rainbow-framed task context (padding/border trick). */}
            <div
              style={{
                borderRadius: 8,
                padding: "var(--space-xs)",
                background: RAINBOW,
                marginBottom: "var(--space-xl)",
              }}
            >
              <div
                style={{
                  background: SURFACE,
                  borderRadius: 5,
                  padding: "var(--space-lg)",
                  display: "flex",
                  gap: "var(--space-md)",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: MUTED,
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    {t("editPraxis.na.taskRefLabel")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "var(--text-content)",
                      lineHeight: 1.1,
                      color: TEXT,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {praxis.task_title}
                  </div>
                  {task?.description && (
                    <div
                      style={{
                        // design: 11px → var(--text-content) (18px) because
                        // task.description is content, below the floor (§4).
                        fontSize: "var(--text-content)",
                        lineHeight: 1.5,
                        color: MUTED,
                        marginTop: "var(--space-sm)",
                      }}
                    >
                      {task.description}
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-accent)",
                      fontSize: "var(--text-title)",
                      lineHeight: 1,
                      color: TEXT,
                    }}
                  >
                    {task?.point_value ?? 0}
                    <span
                      style={{
                        fontSize: "var(--text-base)",
                        marginLeft: "var(--space-xs)",
                        color: MUTED,
                      }}
                    >
                      {t("editPraxis.na.ptsLabel")}
                    </span>
                  </div>
                  {task && (
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: MUTED,
                        marginTop: "var(--space-xs)",
                      }}
                    >
                      {t("editPraxis.na.lvlLabel", { level: task.level_required })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mode selector — active option wears a rainbow border. */}
            {!state.controlsLocked && (
              <div style={{ marginBottom: "var(--space-xl)" }}>
                <div style={cap}>{t("editPraxis.na.modeLabel")}</div>
                <ModePicker
                  state={state}
                  skin={{
                    containerStyle: {
                      display: "flex",
                      gap: "var(--space-sm)",
                      flexWrap: "wrap",
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
                          cursor: disabled ? "not-allowed" : "pointer",
                          textAlign: "left",
                          minWidth: 150,
                          padding: "var(--space-md) var(--space-lg)",
                          borderRadius: 7,
                          background: SURFACE,
                          color: TEXT,
                          border: active
                            ? "1.5px solid transparent"
                            : `1.5px solid ${BORDER}`,
                          backgroundImage: active
                            ? `linear-gradient(${SURFACE},${SURFACE}), ${RAINBOW}`
                            : "none",
                          backgroundOrigin: "border-box",
                          backgroundClip: active
                            ? "padding-box, border-box"
                            : "border-box",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            fontWeight: 600,
                            fontSize: "var(--text-xl)",
                            lineHeight: 1,
                          }}
                        >
                          {opt.label}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            color: MUTED,
                            marginTop: "var(--space-xs)",
                          }}
                        >
                          {opt.desc}
                        </div>
                      </button>
                    ),
                  }}
                />
              </div>
            )}

            {/* Invite / opponent picker (collab + duel). */}
            {state.showInviteBox && (
              <div style={{ marginBottom: "var(--space-xl)" }}>
                <div style={cap}>
                  {state.duelMode
                    ? t("editPraxis.na.inviteLabelDuel")
                    : t("editPraxis.na.inviteLabel")}
                </div>
                <InviteSearch
                  state={state}
                  skin={{
                    fontFamily: "var(--font-body)",
                    inputBg: SURFACE,
                    inputColor: TEXT,
                    inputBorder: `1px solid ${BORDER}`,
                    acceptedBg: "var(--faction-default)",
                    acceptedColor: "var(--color-text-on-accent)",
                    placeholder: t("editPraxis.na.invitePlaceholder"),
                  }}
                />
              </div>
            )}

            {/* Metatask seals. */}
            {state.showSealStack && (
              <div style={{ marginBottom: "var(--space-xl)" }}>
                <div style={cap}>{t("editPraxis.na.metatasksLabel")}</div>
                <MetataskSealStack state={state} />
              </div>
            )}

            {/* Headline. */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <div style={{ ...cap, display: "flex", justifyContent: "space-between" }}>
                <span>{t("editPraxis.na.titleLabel")}</span>
                <span style={{ letterSpacing: 0 }}>
                  <TitleCounter length={state.title.length} color={MUTED} />
                </span>
              </div>
              <TitleField
                state={state}
                skin={{
                  placeholder: t("editPraxis.na.titlePlaceholder"),
                  inputStyle: {
                    width: "100%",
                    border: "none",
                    borderBottom: `2px solid ${BORDER}`,
                    background: "transparent",
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    color: TEXT,
                    padding: "var(--space-xs) var(--space-xs) var(--space-sm)",
                    outline: "none",
                  },
                }}
              />
            </div>

            {/* Account (body). */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <div style={{ ...cap, display: "flex", justifyContent: "space-between" }}>
                <span>{t("editPraxis.na.accountLabel")}</span>
                <span style={{ letterSpacing: 0 }}>
                  {t("editPraxis.na.accountMeta", { words: state.wordCount })}
                </span>
              </div>
              <BodyTextarea
                state={state}
                skin={{
                  rows: 6,
                  placeholder: t("editPraxis.na.bodyPlaceholder"),
                  textareaStyle: {
                    width: "100%",
                    resize: "vertical",
                    borderRadius: 7,
                    border: `1px solid ${BORDER}`,
                    background: "transparent",
                    fontFamily: "var(--font-body)",
                    lineHeight: 1.7,
                    color: TEXT,
                    padding: "var(--space-md)",
                    outline: "none",
                    boxSizing: "border-box",
                    minHeight: 140,
                  },
                }}
              />
              <BodyPreview
                state={state}
                skin={{
                  wrapperStyle: {
                    borderTop: `1px solid ${BORDER}`,
                    marginTop: "var(--space-md)",
                    paddingTop: "var(--space-sm)",
                  },
                  label: <div style={cap}>{t("editPraxis.na.previewLabel")}</div>,
                  markdownStyle: {
                    fontFamily: "var(--font-body)",
                    lineHeight: 1.7,
                    color: TEXT,
                  },
                }}
              />
            </div>

            {/* Evidence — existing media + dashed dropzone. */}
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <div style={cap}>
                {t("editPraxis.na.filesLabel")}{" "}
                <span style={{ letterSpacing: 0, textTransform: "none", color: MUTED }}>
                  {t("editPraxis.na.filesOptional")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-lg)",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {state.media.map((item) => {
                  const filename =
                    item.file_path.split("/").pop() ?? item.file_path;
                  const src = mediaUrl(item.file_path);
                  return (
                    <MediaTile
                      key={item.id}
                      caption={filename}
                      onRemove={() => void state.removeMedia(item)}
                    >
                      {item.type === "image" ? (
                        <img
                          src={src}
                          alt=""
                          style={{ width: 120, height: 120, objectFit: "cover" }}
                        />
                      ) : item.type === "video" ? (
                        <video
                          src={src}
                          style={{ width: 120, height: 120, objectFit: "cover" }}
                        />
                      ) : (
                        <MediaArt
                          art={pickArtKey(filename, "audio")}
                          width={120}
                          height={120}
                        />
                      )}
                    </MediaTile>
                  );
                })}
                <FilePicker
                  state={state}
                  skin={{
                    buttonStyle: {
                      cursor: "pointer",
                      background: "transparent",
                      border: `1.5px dashed ${BORDER}`,
                      borderRadius: 8,
                      padding: "var(--space-lg) var(--space-xl)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      color: MUTED,
                      fontFamily: "var(--font-accent)",
                      fontSize: "var(--text-base)",
                      letterSpacing: "0.06em",
                    },
                    buttonLabel: t("editPraxis.na.fileButton"),
                    helperText: t("editPraxis.na.fileHelper"),
                    helperStyle: {
                      fontSize: "var(--text-base)",
                      fontStyle: "italic",
                      color: MUTED,
                      maxWidth: 200,
                      lineHeight: 1.5,
                      fontFamily: "var(--font-display)",
                      marginTop: "var(--space-xs)",
                    },
                  }}
                />
              </div>
            </div>

            <ErrorBanner message={state.error} />

            {/* Footer CTAs. */}
            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                paddingTop: "var(--space-xl)",
                marginTop: "var(--space-xl)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
              }}
            >
              <PublishButton
                state={state}
                skin={{
                  idleLabel: t("editPraxis.na.publishIdle"),
                  busyLabel: t("editPraxis.na.publishBusy"),
                  style: {
                    cursor: state.submitting ? "wait" : "pointer",
                    border: "none",
                    borderRadius: 6,
                    padding: "var(--space-md) var(--space-xl)",
                    fontFamily: "var(--font-accent)",
                    fontSize: "var(--text-xl)",
                    letterSpacing: "0.04em",
                    color: SURFACE,
                    background: TEXT,
                  },
                }}
              />
              <SaveDraftButton state={state} />
              <DropButton
                state={state}
                skin={{
                  label: t("editPraxis.na.dropLabel"),
                  style: {
                    background: "transparent",
                    border: "none",
                    color: MUTED,
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-lg)",
                    textDecoration: "underline",
                    cursor: "pointer",
                  },
                }}
              />
              <div style={{ flex: 1 }} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "var(--text-lg)",
                  color: MUTED,
                }}
              >
                {t("editPraxis.na.footer")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MediaTileProps {
  children: React.ReactNode;
  caption: string;
  onRemove: () => void;
}

/** Neutral reference-slip thumbnail for an already-uploaded media item. */
function MediaTile({ children, caption, onRemove }: MediaTileProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ width: 120, height: 120, overflow: "hidden" }}>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("media.removeAria", { name: caption })}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--faction-default-card-bg)",
          border: `1px solid ${BORDER}`,
          color: TEXT,
          fontSize: "var(--text-md)",
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
