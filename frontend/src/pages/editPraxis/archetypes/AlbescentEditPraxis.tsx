/**
 * Albescent edit-praxis archetype — FILE AN ACCOUNT.
 *
 * The vellum-correspondence counterpart to the read page (AlbescentPraxisDetail)
 * and the register cards: a returned task entered into the Register as a plain
 * account, "no more than was done". A white sheet with an architectural inset
 * border, the surveyor's Mark, Cormorant Garamond italic display, a quiet mono
 * for labels, and the faction's ceremonial voice ("The Manner", "The Account",
 * "Enter into the Register"). The sheet never dims — Albescent is always-light,
 * so every --faction-albescent-* token reads identically in both themes and we
 * style with them directly without touching data-theme.
 *
 * Albescent is a FIRST-CLASS identity here (not a ua alias): the explicit
 * ARCHETYPE_BY_SLUG['albescent'] entry beats the albescent→ua alias via
 * pickVariant, so this renders immediately. Behaviour (autosave, mode-switch
 * guards, invite, media, publish) comes from the shared control primitives; this
 * archetype owns only presentation. Ported from
 * docs/design/albescent-kit/Albescent Edit Praxis.dc.html. No hardcoded hex
 * (CLAUDE.md) — every colour is a --faction-albescent-* token or an ink() wash.
 */
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import type { CSSProperties, ReactNode } from "react";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import AlbescentMark from "../../../components/cards/AlbescentMark";
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
  MetatasksList,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const FONT = "var(--faction-albescent-card-font)";
const MONO = "var(--faction-albescent-mono)";
const INK = "var(--faction-albescent-card-text)";
const SHEET = "var(--faction-albescent-card-bg)";
const WARM = "var(--faction-albescent-surface-warm)";
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

/** Quiet mono section label with a trailing serif gloss and a hairline rule. */
function MannerLabel({ label, gloss }: { label: string; gloss?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: ink(30),
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {gloss && (
        <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 13, color: ink(40), whiteSpace: "nowrap" }}>
          {gloss}
        </span>
      )}
      <span style={{ flex: 1, height: 1, background: ink(7) }} />
    </div>
  );
}

export default function AlbescentEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;
  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const modeOptions: Array<{ key: PraxisType; label: string; desc: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    label: t(`editPraxis.albescent.mode.${key}.label`),
    desc: t(`editPraxis.albescent.mode.${key}.desc`),
  }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 72% 58% at 50% 38%, rgba(255,255,255,0.58) 0%, transparent 100%), var(--faction-albescent-page)",
        fontFamily: MONO,
        color: INK,
        padding: "24px 24px 90px",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={ink(34)}
        />

        {/* The sheet */}
        <div
          style={{
            position: "relative",
            background: SHEET,
            border: `1px solid ${ink(10)}`,
            boxShadow: "0 2px 18px rgba(0,0,0,0.055), 0 1px 3px rgba(0,0,0,0.04)",
            padding: "40px 46px 44px",
          }}
        >
          {/* architectural inset hairline */}
          <div style={{ position: "absolute", inset: 6, border: `1px solid ${ink(5)}`, pointerEvents: "none" }} />

          {/* masthead */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              paddingBottom: 18,
              borderBottom: `1px solid ${ink(7)}`,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                fontFamily: MONO,
                fontSize: 8.5,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: ink(30),
              }}
            >
              <AlbescentMark size={13} />
              {t("editPraxis.albescent.masthead", { number: praxis.id })}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 7.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: ink(26),
                borderBottom: `1px solid ${ink(18)}`,
                paddingBottom: 1,
              }}
            >
              {state.autosaveAt
                ? t("editPraxis.albescent.autosaveSaved", {
                    ago: formatAutosave(state.autosaveAt),
                  })
                : t("editPraxis.albescent.autosaveUnsaved")}
            </span>
          </div>

          {/* title + preamble */}
          <h1
            style={{
              position: "relative",
              fontFamily: FONT,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 56,
              lineHeight: 1.0,
              color: INK,
              margin: "26px 0 8px",
            }}
          >
            {t("editPraxis.albescent.pageTitle")}
          </h1>
          <p
            style={{
              position: "relative",
              fontFamily: FONT,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 16,
              lineHeight: 1.5,
              color: ink(50),
              maxWidth: 480,
              marginBottom: 30,
            }}
          >
            {t("editPraxis.albescent.preamble")}
          </p>

          {/* reference slip */}
          <div
            style={{
              position: "relative",
              display: "flex",
              gap: 16,
              alignItems: "center",
              border: `1px solid ${ink(7)}`,
              background: WARM,
              padding: "15px 18px",
              marginBottom: 34,
            }}
          >
            <AlbescentMark size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 7.5,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: ink(30),
                  marginBottom: 5,
                }}
              >
                {t("editPraxis.albescent.refLabel", {
                  number: praxis.task_id,
                })}
              </div>
              <div
                style={{
                  fontFamily: FONT,
                  fontStyle: "italic",
                  fontSize: 24,
                  lineHeight: 1.05,
                  color: INK,
                  marginBottom: 7,
                  overflowWrap: "anywhere",
                }}
              >
                {praxis.task_title}
              </div>
              {task?.description && (
                <div style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.5, color: ink(40), marginBottom: 6, overflowWrap: "anywhere" }}>
                  {task.description}
                </div>
              )}
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.08em", color: ink(40) }}>
                {t("editPraxis.albescent.pointsLabel", {
                  points: praxis.task_point_value,
                })}
              </div>
            </div>
          </div>

          {/* The Manner — mode picker */}
          {!state.controlsLocked && (
            <div style={{ position: "relative", marginBottom: 32 }}>
              <MannerLabel
                label={t("editPraxis.albescent.modeLabel")}
                gloss={t("editPraxis.albescent.modeMeta")}
              />
              <ModePicker
                state={state}
                skin={{
                  containerStyle: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
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
                        cursor: disabled && !active ? "not-allowed" : "pointer",
                        textAlign: "left",
                        padding: "14px 16px",
                        width: "100%",
                        background: active ? INK : SHEET,
                        color: active ? "var(--faction-albescent-page)" : INK,
                        border: `1px solid ${active ? INK : ink(12)}`,
                        transition: "all 160ms",
                      }}
                    >
                      <div style={{ fontFamily: FONT, fontStyle: "italic", fontWeight: 400, fontSize: 22, lineHeight: 1 }}>
                        {opt.label}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: "0.06em", marginTop: 6, opacity: 0.7 }}>
                        {opt.desc}
                      </div>
                    </button>
                  ),
                }}
              />
            </div>
          )}

          {/* Invitees / challenger */}
          {state.showInviteBox && (
            <div style={{ position: "relative", marginBottom: 32 }}>
              <MannerLabel
                label={
                  praxis.type === "duel"
                    ? t("editPraxis.albescent.inviteLabelDuel")
                    : t("editPraxis.albescent.inviteLabel")
                }
              />
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: FONT,
                  inputBg: WARM,
                  inputColor: INK,
                  inputBorder: `1px solid ${ink(12)}`,
                  dropdownBg: SHEET,
                  dropdownBorder: `1px solid ${ink(12)}`,
                  acceptedBg: INK,
                  acceptedColor: "var(--faction-albescent-page)",
                  placeholder: t("editPraxis.albescent.invitePlaceholder"),
                }}
              />
            </div>
          )}

          {/* The Closing Line — the title */}
          <div style={{ position: "relative", marginBottom: 32 }}>
            <MannerLabel
              label={t("editPraxis.albescent.titleLabel")}
              gloss={t("editPraxis.albescent.titleMeta")}
            />
            <TitleField
              state={state}
              skin={{
                placeholder: t("editPraxis.albescent.titlePlaceholder"),
                inputStyle: {
                  width: "100%",
                  border: "none",
                  borderBottom: `1px solid ${ink(18)}`,
                  background: "transparent",
                  fontFamily: FONT,
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: 26,
                  color: INK,
                  padding: "4px 2px 10px",
                  outline: "none",
                },
              }}
            />
            <div style={{ marginTop: 8 }}>
              <TitleCounter length={state.title.length} color={ink(34)} />
            </div>
          </div>

          {/* The Account — the body */}
          <div style={{ position: "relative", marginBottom: 32 }}>
            <MannerLabel
              label={t("editPraxis.albescent.bodyLabel")}
              gloss={t("editPraxis.albescent.bodyMeta", {
                words: state.wordCount,
              })}
            />
            <BodyTextarea
              state={state}
              skin={{
                rows: 7,
                placeholder: t("editPraxis.albescent.bodyPlaceholder"),
                textareaStyle: {
                  width: "100%",
                  resize: "vertical",
                  border: `1px solid ${ink(10)}`,
                  background: WARM,
                  fontFamily: FONT,
                  fontSize: 18,
                  lineHeight: 1.75,
                  color: INK,
                  padding: "16px 18px",
                  outline: "none",
                  minHeight: 200,
                },
              }}
            />
            <BodyPreview
              state={state}
              skin={{
                wrapperStyle: { borderTop: `1px solid ${ink(7)}`, marginTop: 14, paddingTop: 12 },
                label: (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 8,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: ink(30),
                      marginBottom: 8,
                    }}
                  >
                    {t("editPraxis.albescent.previewLabel")}
                  </div>
                ),
                markdownStyle: { fontFamily: FONT, fontStyle: "italic", fontSize: 15, lineHeight: 1.75, color: ink(62) },
              }}
            />
          </div>

          {/* The Plates — media */}
          <div style={{ position: "relative", marginBottom: 32 }}>
            <MannerLabel
              label={t("editPraxis.albescent.filesLabel")}
              gloss={t("editPraxis.albescent.filesMeta")}
            />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              {state.media.map((item) => {
                const filename = item.file_path.split("/").pop() ?? item.file_path;
                const src = mediaUrl(item.file_path);
                return (
                  <PlateFrame key={item.id} caption={filename} onRemove={() => void state.removeMedia(item)}>
                    {item.type === "image" ? (
                      <img src={src} alt="" style={{ width: 140, height: 100, objectFit: "cover", display: "block" }} />
                    ) : item.type === "video" ? (
                      <video src={src} style={{ width: 140, height: 100, objectFit: "cover", display: "block" }} />
                    ) : (
                      <MediaArt art={pickArtKey(filename, "audio")} />
                    )}
                  </PlateFrame>
                );
              })}
              <FilePicker
                state={state}
                skin={{
                  buttonStyle: {
                    width: 152,
                    height: 130,
                    background: WARM,
                    border: `1px dashed ${ink(16)}`,
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: ink(40),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 4,
                  },
                  buttonLabel: t("editPraxis.albescent.fileButton"),
                  errorColor: "var(--color-danger)",
                  helperText: t("editPraxis.albescent.fileHelper"),
                  helperStyle: { fontFamily: MONO, fontSize: 8, letterSpacing: "0.08em", color: ink(30), marginTop: 8 },
                }}
              />
            </div>
          </div>

          {/* Further merit — metatasks */}
          {state.showMetatasks && (
            <div style={{ position: "relative", marginBottom: 32 }}>
              <MannerLabel label={t("editPraxis.albescent.metatasksLabel")} />
              <MetatasksList
                state={state}
                skin={{
                  rowStyle: (selected) => ({
                    padding: "8px 10px",
                    background: selected ? WARM : "transparent",
                    border: selected ? `1px solid ${ink(10)}` : "1px solid transparent",
                    marginBottom: 4,
                    fontFamily: FONT,
                  }),
                  titleColor: INK,
                  descColor: ink(45),
                  pointsActiveColor: INK,
                  pointsIdleColor: ink(35),
                }}
              />
            </div>
          )}

          <ErrorBanner message={state.error} />

          {/* File bar */}
          <div
            style={{
              position: "relative",
              borderTop: `1px solid ${ink(7)}`,
              paddingTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <PublishButton
              state={state}
              skin={{
                idleLabel: t("editPraxis.albescent.publishIdle"),
                busyLabel: t("editPraxis.albescent.publishBusy"),
                style: {
                  cursor: state.submitting ? "wait" : "pointer",
                  border: `1px solid ${INK}`,
                  background: INK,
                  color: "var(--faction-albescent-page)",
                  fontFamily: FONT,
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: 20,
                  letterSpacing: "0.02em",
                  padding: "12px 30px",
                  whiteSpace: "nowrap",
                },
              }}
            />
            <DropButton
              state={state}
              skin={{
                label: t("editPraxis.albescent.dropLabel"),
                style: {
                  cursor: "pointer",
                  border: `1px solid ${ink(12)}`,
                  background: "transparent",
                  color: ink(50),
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "14px 18px",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A framed plate for one piece of evidence — the sheet's quiet polaroid. */
function PlateFrame({
  children,
  caption,
  onRemove,
}: {
  children: ReactNode;
  caption: string;
  onRemove: () => void;
}) {
  const { t } = useTranslation("forms");
  const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`;
  const frame: CSSProperties = {
    position: "relative",
    background: SHEET,
    border: `1px solid ${ink(10)}`,
    padding: 5,
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  };
  return (
    <div style={frame}>
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>{children}</div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 8,
          letterSpacing: "0.04em",
          color: ink(40),
          textAlign: "center",
          marginTop: 4,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {caption}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("media.removeAria", { name: caption })}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: SHEET,
          border: `1.5px solid ${INK}`,
          color: INK,
          fontSize: 12,
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
