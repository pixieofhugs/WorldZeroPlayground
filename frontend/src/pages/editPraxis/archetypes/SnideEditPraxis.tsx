/**
 * Punk Zine — S.N.I.D.E. faction.
 * Photocopier ink stock, ransom-note title, two-column markdown preview, xerox
 * photo tiles. Colours read from the faction tokens, so it tracks the punk palette.
 */
import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ErrorBanner,
  RainbowTitle,
  RainbowUnderline,
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
  MetatasksList,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const cutoutFonts = [
  "'Permanent Marker', cursive",
  "'Special Elite', serif",
  "'Anton', sans-serif",
  "'Archivo Black', sans-serif",
  "'Lora', serif",
  "'Courier Prime', monospace",
  "'Bebas Neue', sans-serif",
  "'IM Fell English', serif",
];

const MODE_FONTS: Record<PraxisType, string> = {
  solo: "'Permanent Marker', cursive",
  collab: "'UnifrakturCook', serif",
  duel: "'Bebas Neue', sans-serif",
};

function RansomChar({ ch, index }: { ch: string; index: number }) {
  if (ch === " ")
    return <span style={{ display: "inline-block", width: "0.4em" }} />;
  const palette = [
    factionCssVar("snide"),
    factionCssVar("snide", "card-accent"),
    factionCssVar("snide", "card-bg"),
    "var(--color-text-primary)",
  ];
  const bg = palette[(index * 3) % palette.length];
  const font = cutoutFonts[(index * 2 + 1) % cutoutFonts.length];
  const rot = ((index * 17) % 12) - 6;
  const sz = 26 + ((index * 5) % 12);
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: "var(--color-text-on-accent)",
        fontFamily: font,
        fontSize: sz,
        lineHeight: 1,
        fontWeight: 700,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: ransom-note letter tile; the mat is cut tight around one glyph.
        padding: "2px 6px",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the scraps overlap into a word; a 4px gutter would space them out into a row of chips.
        margin: "2px 1px",
        transform: `rotate(${rot}deg)`,
        boxShadow: "1px 1px 0 rgba(0,0,0,.2)",
        textTransform: index % 2 ? "uppercase" : "none",
      }}
    >
      {ch}
    </span>
  );
}

export default function SnideEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;

  const modeOptions: Array<{
    key: PraxisType;
    label: string;
    desc: string;
    font: string;
  }> = (["solo", "collab", "duel"] as const).map((key) => ({
    key,
    label: t(`editPraxis.snide.mode.${key}.label`),
    desc: t(`editPraxis.snide.mode.${key}.desc`),
    font: MODE_FONTS[key],
  }));

  const accent = factionCssVar("snide");
  const accentDeep = factionCssVar("snide", "card-accent");
  const surface = factionCssVar("snide", "card-bg");
  const ink = factionCssVar("snide", "card-text");
  const muted = factionCssVar("snide", "card-muted");
  const lightBg = factionCssVar("snide", "light");
  const hot = "var(--faction-snide-pink)";

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: surface,
        color: ink,
        fontFamily: "'Courier Prime', monospace",
        position: "relative",
        padding: "var(--space-3xl) var(--space-xl) var(--space-4xl)",
        minHeight: "100vh",
        backgroundImage: `repeating-linear-gradient(7deg, ${lightBg} 0, ${lightBg} 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-93deg, rgba(0,0,0,.015) 0, rgba(0,0,0,.015) 1px, transparent 1px, transparent 5px)`,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={muted}
        />

        {/* Top punk header */}
        <div style={{ marginBottom: "var(--space-lg)", position: "relative" }}>
          <div
            style={{
              background: accentDeep,
              color: "var(--color-text-on-accent)",
              padding: "var(--space-sm) var(--space-md)",
              transform: "rotate(-1.2deg)",
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.2em",
              fontSize: "var(--text-content)",
              display: "inline-block",
              boxShadow: `3px 3px 0 ${hot}`,
            }}
          >
            {t("editPraxis.snide.masthead")}
          </div>
        </div>

        <div style={{ marginBottom: "var(--space-lg)" }}>
          <RainbowTitle
            text={t("editPraxis.snide.pageTitle")}
            size={40}
            color={ink}
          />
        </div>

        {/* Task slip */}
        <div
          style={{
            position: "relative",
            marginBottom: "var(--space-xl)",
            background: surface,
            color: ink,
            padding: "var(--space-md) var(--space-lg)",
            transform: "rotate(-1deg)",
            fontFamily: "'Special Elite', serif",
            borderTop: `3px solid ${accent}`,
            borderBottom: `3px solid ${accent}`,
          }}
        >
          <span
            className="eyebrow"
            style={{ color: accentDeep, display: "block" }}
          >
            {t("editPraxis.snide.taskRefLabel")}
          </span>
          <div style={{ fontSize: "var(--text-content)", lineHeight: 1.25, marginTop: "var(--space-xs)" }}>
            {praxis.task_title}
          </div>
          {task?.description && (
            <div style={{ fontSize: "var(--text-content)", lineHeight: 1.45, color: muted, marginTop: "var(--space-xs)" }}>
              {task.description}
            </div>
          )}
          <div style={{ marginTop: "var(--space-sm)" }}>
            <TaskMetaInline
              praxis={praxis}
              task={task}
              textColor={accentDeep}
            />
          </div>
        </div>

        {/* Mode */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <div
              style={{
                display: "inline-block",
                background: lightBg,
                color: ink,
                fontFamily: "'Permanent Marker', cursive",
                fontSize: "var(--text-lg)",
                padding: "var(--space-xs) var(--space-md)",
                marginBottom: "var(--space-sm)",
                transform: "rotate(-1.5deg)",
              }}
            >
              {t("editPraxis.snide.modeLabel")}
            </div>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "flex", gap: "var(--space-md)", flexWrap: "wrap" },
                options: modeOptions,
                allowedModes,
                renderOption: (opt, { active, disabled, onSelect, index }) => {
                  const bg = active
                    ? opt.key === "duel"
                      ? hot
                      : accentDeep
                    : surface;
                  const fg = active ? "var(--color-text-on-accent)" : ink;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={active}
                      onClick={onSelect}
                      disabled={disabled && !active}
                      style={{
                        cursor: disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        background: bg,
                        color: fg,
                        border: active
                          ? `2.5px solid ${accentDeep}`
                          : `2px dashed ${accentDeep}`,
                        padding: "var(--space-md) var(--space-lg)",
                        position: "relative",
                        fontFamily: opt.font,
                        transform: `rotate(${active ? (index % 2 ? 1.5 : -1.8) : index % 2 ? -0.5 : 0.5}deg)`,
                        boxShadow: active ? `3px 3px 0 ${accentDeep}` : "none",
                        minWidth: 130,
                      }}
                    >
                      <div
                        style={{ fontSize: "var(--text-title)", lineHeight: 1, marginBottom: "var(--space-xs)" }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-base)",
                          fontFamily: "'Courier Prime', monospace",
                          opacity: 0.85,
                        }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                },
              }}
            />
          </div>
        )}

        {/* Invite */}
        {state.showInviteBox && (
            <div
              style={{
                marginBottom: "var(--space-xl)",
                padding: "var(--space-md) var(--space-lg)",
                border: `2px solid ${accentDeep}`,
                background: `repeating-linear-gradient(135deg, ${surface} 0, ${surface} 16px, ${lightBg} 16px, ${lightBg} 32px)`,
              }}
            >
              <span
                className="eyebrow"
                style={{ color: hot, display: "block", marginBottom: "var(--space-sm)" }}
              >
                {state.duelMode
                  ? t("editPraxis.snide.inviteLabelDuel")
                  : t("editPraxis.snide.inviteLabel")}
              </span>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "'Special Elite', serif",
                  inputBg: surface,
                  inputColor: ink,
                  inputBorder: `2px dashed ${accentDeep}`,
                  placeholder: state.duelMode
                    ? t("editPraxis.snide.invitePlaceholderDuel")
                    : t("editPraxis.snide.invitePlaceholder"),
                  pillBg: lightBg,
                  acceptedBg: accentDeep,
                  acceptedColor: "var(--color-text-on-accent)",
                }}
              />
            </div>
          )}

        {/* Title — ransom note + editable input */}
        <div
          style={{
            marginBottom: "var(--space-xl)",
            padding: "var(--space-lg) var(--space-md)",
            background: lightBg,
            border: `2px dashed ${accentDeep}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "var(--space-sm)",
            }}
          >
            <span className="eyebrow" style={{ color: accentDeep }}>
              {t("editPraxis.snide.titleLabel")}
            </span>
            <TitleCounter length={state.title.length} color={accentDeep} />
          </div>
          <div style={{ minHeight: 60, lineHeight: 1.4, marginBottom: "var(--space-sm)" }}>
            {state.title.split("").map((ch, index) => (
              <RansomChar key={index} ch={ch} index={index} />
            ))}
            {!state.title && (
              <span style={{ color: muted, fontStyle: "italic", fontSize: "var(--text-xl)" }}>
                {t("editPraxis.snide.titleEmptyHint")}
              </span>
            )}
          </div>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.snide.titlePlaceholder"),
              inputStyle: {
                width: "100%",
                fontFamily: "'Courier Prime', monospace",
                padding: "var(--space-xs) var(--space-sm)",
                background: surface,
                color: ink,
                border: `1.5px dashed ${accentDeep}`,
                outline: "none",
              },
            }}
          />
          <RainbowUnderline opacity={0.5} />
        </div>

        {/* Body */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: "var(--space-sm)", color: accentDeep }}
          >
            {t("editPraxis.snide.bodyLabel", { words: state.wordCount })}
          </span>
          <div style={{ position: "relative", transform: "rotate(0.3deg)" }}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 12,
                placeholder: t("editPraxis.snide.bodyPlaceholder"),
                textareaStyle: {
                  width: "100%",
                  fontFamily: "'Special Elite', serif",
                  lineHeight: 1.7,
                  color: ink,
                  background: surface,
                  border: `2px solid ${accentDeep}`,
                  padding: "var(--space-lg) var(--space-xl)",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 220,
                  boxShadow: `4px 4px 0 ${accentDeep}`,
                },
              }}
            />
          </div>
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                marginTop: "var(--space-md)",
                background: surface,
                border: `2px solid ${accentDeep}`,
                padding: "var(--space-lg) var(--space-xl)",
                columnCount: 2,
                columnGap: "var(--space-xl)",
                columnRule: `0.5px solid ${accentDeep}`,
                boxShadow: `4px 4px 0 ${accentDeep}`,
              },
              label: (
                <span
                  className="eyebrow"
                  style={{ color: accentDeep, display: "block", marginBottom: "var(--space-xs)" }}
                >
                  {t("editPraxis.snide.previewLabel")}
                </span>
              ),
              markdownStyle: {
                fontFamily: "'Special Elite', serif",
                lineHeight: 1.6,
                color: ink,
              },
            }}
          />
        </div>

        {/* Existing media */}
        {state.media.length > 0 && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "var(--space-sm)", color: accentDeep }}
            >
              {t("editPraxis.snide.mediaOnPageLabel")}
            </span>
            <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
              {state.media.map((item, index) => {
                const src = mediaUrl(item.file_path);
                const filename =
                  item.file_path.split("/").pop() ?? item.file_path;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: "relative",
                      border: `2px solid ${accentDeep}`,
                      padding: "var(--space-xs)",
                      background: surface,
                      transform: `rotate(${index % 2 ? 2 : -2.4}deg)`,
                      boxShadow: `2px 2px 0 ${accentDeep}`,
                    }}
                  >
                    <div
                      style={{
                        width: 140,
                        height: 100,
                        overflow: "hidden",
                        filter: "contrast(1.15) saturate(0.9)",
                      }}
                    >
                      {item.type === "image" ? (
                        <img
                          src={src}
                          alt=""
                          style={{
                            width: 140,
                            height: 100,
                            objectFit: "cover",
                          }}
                        />
                      ) : item.type === "video" ? (
                        <video
                          src={src}
                          style={{
                            width: 140,
                            height: 100,
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <MediaArt art={pickArtKey(filename, "audio")} />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        marginTop: "var(--space-xs)",
                        fontStyle: "italic",
                        fontFamily: "'Special Elite', serif",
                        color: accentDeep,
                      }}
                    >
                      {t("editPraxis.snide.figureCaption", { number: index + 1, name: filename })}
                    </div>
                    <button
                      type="button"
                      onClick={() => void state.removeMedia(item)}
                      aria-label={`Remove ${filename}`}
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 22,
                        height: 22,
                        background: lightBg,
                        border: `2px solid ${ink}`,
                        color: ink,
                        fontSize: "var(--text-lg)",
                        fontWeight: 700,
                        cursor: "pointer",
                        lineHeight: 1,
                        padding: 0,
                        borderRadius: "50%",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* New files */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: "var(--space-sm)", color: accentDeep }}
          >
            {t("editPraxis.snide.filesLabel")}
          </span>
          <FilePicker
            state={state}
            skin={{
              buttonStyle: {
                background: accentDeep,
                color: "var(--color-text-on-accent)",
                fontFamily: "'Permanent Marker', cursive",
                fontSize: "var(--text-xl)",
                padding: "var(--space-sm) var(--space-lg)",
                border: `2px solid ${accentDeep}`,
                cursor: "pointer",
                transform: "rotate(-1deg)",
              },
              buttonLabel: "+ paste it in",
              helperText: "images · video · audio · max 50mb each",
              helperStyle: {
                fontSize: "var(--text-sm)",
                color: muted,
                marginTop: "var(--space-xs)",
                fontStyle: "italic",
              },
            }}
          />
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <div
            style={{
              marginBottom: "var(--space-xl)",
              padding: "var(--space-md) var(--space-lg)",
              border: `2px dashed ${accentDeep}`,
              background: lightBg,
            }}
          >
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "var(--space-sm)", color: accentDeep }}
            >
              {t("editPraxis.snide.metatasksLabel")}
            </span>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "var(--space-sm)",
                  background: selected ? surface : "transparent",
                  border: selected
                    ? `1.5px solid ${accentDeep}`
                    : "1.5px solid transparent",
                  marginBottom: "var(--space-xs)",
                }),
                titleColor: ink,
                descColor: muted,
                pointsActiveColor: accentDeep,
                pointsIdleColor: muted,
              }}
            />
          </div>
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-lg)",
            alignItems: "center",
            marginTop: "var(--space-xl)",
            paddingTop: "var(--space-lg)",
            borderTop: `2px dashed ${accentDeep}`,
            flexWrap: "wrap",
          }}
        >
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.snide.dropLabel"),
              style: {
                background: "transparent",
                color: muted,
                fontFamily: "'Special Elite', serif",
                fontSize: "var(--text-md)",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              },
            }}
          />
          <div style={{ flex: 1 }} />
          <PublishButton
            state={state}
            skin={{
              idleLabel: t("editPraxis.snide.publishIdle"),
              busyLabel: t("editPraxis.snide.publishBusy"),
              ornament: (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 4,
                    border: `1.5px dashed rgba(255,255,255,.6)`,
                    pointerEvents: "none",
                  }}
                />
              ),
              style: {
                background: accent,
                color: "var(--color-text-on-accent)",
                fontFamily: "'Permanent Marker', cursive",
                fontSize: "var(--text-title)",
                padding: "var(--space-md) var(--space-xl)",
                border: `3px solid ${accentDeep}`,
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                position: "relative",
                transform: "rotate(-1.8deg)",
                boxShadow: `4px 4px 0 ${ink}`,
              },
            }}
          />
        </div>

        <div
          style={{
            marginTop: "var(--space-md)",
            fontSize: "var(--text-base)",
            color: muted,
            fontFamily: "'Special Elite', serif",
            fontStyle: "italic",
          }}
        >
          {state.autosaveAt
            ? t("editPraxis.snide.autosaveSaved", {
                ago: formatAutosave(state.autosaveAt),
              })
            : t("editPraxis.snide.autosaveUnsaved")}
        </div>
      </div>
    </div>
  );
}
