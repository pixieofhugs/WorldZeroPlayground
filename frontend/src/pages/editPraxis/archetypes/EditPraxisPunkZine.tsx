/**
 * Punk Zine — S.N.I.D.E. faction.
 * Photocopier ink stock, ransom-note title, two-column markdown preview, xerox
 * photo tiles. Colours read from the faction tokens, so it tracks the punk palette.
 */
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { mediaArtKeysFromFile, pickArtKey } from "../blocks/useMediaArt";
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

const MODE_OPTIONS: Array<{
  key: PraxisType;
  label: string;
  desc: string;
  font: string;
}> = [
  {
    key: "solo",
    label: "SOLO",
    desc: "just me",
    font: "'Permanent Marker', cursive",
  },
  {
    key: "collab",
    label: "COLLAB",
    desc: "a gang of us",
    font: "'UnifrakturCook', serif",
  },
  {
    key: "duel",
    label: "D U E L",
    desc: "me v. them",
    font: "'Bebas Neue', sans-serif",
  },
];

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
        padding: "2px 6px",
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

export default function EditPraxisPunkZine({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

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
        padding: "34px 28px 48px",
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
        <div style={{ marginBottom: 18, position: "relative" }}>
          <div
            style={{
              background: accentDeep,
              color: "var(--color-text-on-accent)",
              padding: "8px 14px",
              transform: "rotate(-1.2deg)",
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.2em",
              fontSize: 18,
              display: "inline-block",
              boxShadow: `3px 3px 0 ${hot}`,
            }}
          >
            ZINE #47 ·· S.N.I.D.E. ·· FREE / STEAL ME
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <RainbowTitle text="edit praxis" size={40} color={ink} />
        </div>

        {/* Task slip */}
        <div
          style={{
            position: "relative",
            marginBottom: 24,
            background: surface,
            color: ink,
            padding: "14px 18px",
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
            Re: completion of
          </span>
          <div style={{ fontSize: 18, lineHeight: 1.25, marginTop: 6 }}>
            {praxis.task_title}
          </div>
          <div style={{ marginTop: 8 }}>
            <TaskMetaInline
              praxis={praxis}
              task={task}
              textColor={accentDeep}
            />
          </div>
        </div>

        {/* Mode */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                display: "inline-block",
                background: lightBg,
                color: ink,
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 13,
                padding: "3px 12px",
                marginBottom: 10,
                transform: "rotate(-1.5deg)",
              }}
            >
              how shall we DO this??
            </div>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "flex", gap: 12, flexWrap: "wrap" },
                options: MODE_OPTIONS,
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
                        padding: "12px 16px",
                        position: "relative",
                        fontFamily: opt.font,
                        transform: `rotate(${active ? (index % 2 ? 1.5 : -1.8) : index % 2 ? -0.5 : 0.5}deg)`,
                        boxShadow: active ? `3px 3px 0 ${accentDeep}` : "none",
                        minWidth: 130,
                      }}
                    >
                      <div
                        style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
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
        {state.showCollabInvite &&
          !(praxis.type === "duel" && state.duelSlotFull) && (
            <div
              style={{
                marginBottom: 22,
                padding: "14px 16px",
                border: `2px solid ${accentDeep}`,
                background: `repeating-linear-gradient(135deg, ${surface} 0, ${surface} 16px, ${lightBg} 16px, ${lightBg} 32px)`,
              }}
            >
              <span
                className="eyebrow"
                style={{ color: hot, display: "block", marginBottom: 8 }}
              >
                {praxis.type === "duel" ? "✗ THE OPPOSITION ✗" : "WHO ELSE"}
              </span>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "'Special Elite', serif",
                  inputBg: surface,
                  inputColor: ink,
                  inputBorder: `2px dashed ${accentDeep}`,
                  placeholder:
                    praxis.type === "duel"
                      ? "@ who are you fighting?"
                      : "@ who else?",
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
            marginBottom: 22,
            padding: "18px 14px",
            background: lightBg,
            border: `2px dashed ${accentDeep}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span className="eyebrow" style={{ color: accentDeep }}>
              HEADLINE · cut from anywhere
            </span>
            <TitleCounter length={state.title.length} color={accentDeep} />
          </div>
          <div style={{ minHeight: 60, lineHeight: 1.4, marginBottom: 10 }}>
            {state.title.split("").map((ch, index) => (
              <RansomChar key={index} ch={ch} index={index} />
            ))}
            {!state.title && (
              <span style={{ color: muted, fontStyle: "italic", fontSize: 14 }}>
                (snip letters out of magazines · paste here)
              </span>
            )}
          </div>
          <TitleField
            state={state}
            skin={{
              placeholder: "type your headline · we'll cut the letters for you",
              inputStyle: {
                width: "100%",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 13,
                padding: "6px 10px",
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
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 8, color: accentDeep }}
          >
            ↳ the manifesto · {state.wordCount} words · markdown ok
          </span>
          <div style={{ position: "relative", transform: "rotate(0.3deg)" }}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 12,
                placeholder: "lead with the lie. bury the truth in paragraph five...",
                textareaStyle: {
                  width: "100%",
                  fontFamily: "'Special Elite', serif",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: ink,
                  background: surface,
                  border: `2px solid ${accentDeep}`,
                  padding: "20px 22px",
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
                marginTop: 14,
                background: surface,
                border: `2px solid ${accentDeep}`,
                padding: "20px 22px",
                columnCount: 2,
                columnGap: 22,
                columnRule: `0.5px solid ${accentDeep}`,
                boxShadow: `4px 4px 0 ${accentDeep}`,
              },
              label: (
                <span
                  className="eyebrow"
                  style={{ color: accentDeep, display: "block", marginBottom: 6 }}
                >
                  Preview
                </span>
              ),
              markdownStyle: {
                fontFamily: "'Special Elite', serif",
                fontSize: 12,
                lineHeight: 1.6,
                color: ink,
              },
            }}
          />
        </div>

        {/* Existing media */}
        {state.media.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 10, color: accentDeep }}
            >
              ↳ already glued in
            </span>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
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
                      padding: 6,
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
                        fontSize: 9,
                        marginTop: 4,
                        fontStyle: "italic",
                        fontFamily: "'Special Elite', serif",
                        color: accentDeep,
                      }}
                    >
                      FIG. {index + 1} · {filename}
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
                        fontSize: 12,
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
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 10, color: accentDeep }}
          >
            ↳ glue in proof · photos / audio / receipts
          </span>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {state.newFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                  border: `2px solid ${accentDeep}`,
                  padding: 6,
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
                    filter: "contrast(1.15)",
                  }}
                >
                  <MediaArt art={mediaArtKeysFromFile(file)} />
                </div>
                <div
                  style={{
                    fontSize: 9,
                    marginTop: 4,
                    color: accentDeep,
                    fontStyle: "italic",
                  }}
                >
                  FIG. {state.media.length + index + 1} · {file.name}
                </div>
                <button
                  type="button"
                  onClick={() => state.removeNewFile(index)}
                  aria-label={`Remove ${file.name}`}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    background: lightBg,
                    border: `2px solid ${ink}`,
                    color: ink,
                    fontSize: 12,
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
            ))}
          </div>
          <FilePicker
            state={state}
            skin={{
              buttonStyle: {
                background: accentDeep,
                color: "var(--color-text-on-accent)",
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 14,
                padding: "8px 18px",
                border: `2px solid ${accentDeep}`,
                cursor: "pointer",
                transform: "rotate(-1deg)",
              },
              buttonLabel: "+ paste it in",
              helperText: "images · video · audio · max 50mb each",
              helperStyle: {
                fontSize: 9,
                color: muted,
                marginTop: 6,
                fontStyle: "italic",
              },
            }}
          />
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <div
            style={{
              marginBottom: 22,
              padding: "14px 16px",
              border: `2px dashed ${accentDeep}`,
              background: lightBg,
            }}
          >
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 10, color: accentDeep }}
            >
              ★ optional bonus
            </span>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "10px 8px",
                  background: selected ? surface : "transparent",
                  border: selected
                    ? `1.5px solid ${accentDeep}`
                    : "1.5px solid transparent",
                  marginBottom: 4,
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
            gap: 16,
            alignItems: "center",
            marginTop: 24,
            paddingTop: 20,
            borderTop: `2px dashed ${accentDeep}`,
            flexWrap: "wrap",
          }}
        >
          <PublishButton
            state={state}
            skin={{
              idleLabel: "xerox & staple",
              busyLabel: "xeroxing...",
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
                fontSize: 22,
                padding: "14px 28px",
                border: `3px solid ${accentDeep}`,
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                position: "relative",
                transform: "rotate(-1.8deg)",
                boxShadow: `4px 4px 0 ${ink}`,
              },
            }}
          />
          <div style={{ flex: 1 }} />
          <DropButton
            state={state}
            skin={{
              label: "cancel",
              style: {
                background: "transparent",
                color: muted,
                fontFamily: "'Special Elite', serif",
                fontSize: 11,
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              },
            }}
          />
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 10,
            color: muted,
            fontFamily: "'Special Elite', serif",
            fontStyle: "italic",
          }}
        >
          {state.autosaveAt
            ? `↳ photocopied & filed ${formatAutosave(state.autosaveAt)}`
            : "↳ unsaved · staple it before it walks off"}
        </div>
      </div>
    </div>
  );
}
