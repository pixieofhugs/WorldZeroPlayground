/**
 * Luggage Manifest — Journeymen faction.
 * Sun-bleached travel poster, customs stamps, baggage tags, kraft + terracotta.
 */
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MarkdownPreview from "../blocks/MarkdownPreview";
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
  DropButton,
  FilePicker,
  InviteSearch,
  MetatasksList,
} from "./controls";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const MODE_OPTIONS: Array<{ key: PraxisType; label: string; desc: string }> = [
  { key: "solo", label: "SOLO", desc: "one ticket" },
  { key: "collab", label: "COLLAB", desc: "caravan" },
  { key: "duel", label: "DUEL", desc: "parallel routes" },
];

export default function EditPraxisLuggageManifest({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

  const accent = factionCssVar("journeymen");
  const accentDeep = factionCssVar("journeymen", "card-accent");
  const surface = factionCssVar("journeymen", "card-bg");
  const ink = factionCssVar("journeymen", "card-text");
  const muted = factionCssVar("journeymen", "card-muted");
  const lightBg = factionCssVar("journeymen", "light");

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: surface,
        color: ink,
        fontFamily: "'Courier Prime', monospace",
        position: "relative",
        padding: "32px 28px 48px",
        minHeight: "100vh",
        backgroundImage: `radial-gradient(ellipse at 80% 8%, rgba(217,119,6,.12), transparent 55%), radial-gradient(ellipse at 12% 92%, rgba(12,74,110,.12), transparent 50%), repeating-linear-gradient(45deg, transparent 0, transparent 6px, rgba(58,40,20,.03) 6px, rgba(58,40,20,.03) 7px)`,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        {/* Eyelet decoration */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: `4px solid ${accentDeep}`,
          }}
        />
        <div style={{ paddingLeft: 56 }}>
          <Breadcrumb
            praxisId={praxis.id}
            taskId={praxis.task_id}
            taskTitle={praxis.task_title}
            inkColor={muted}
          />

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                background: accentDeep,
                color: "var(--color-text-on-accent)",
                padding: "4px 14px",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: "0.18em",
                transform: "rotate(-2deg)",
                display: "inline-block",
                marginBottom: 12,
              }}
            >
              JOURNEYMEN · MANIFEST {praxis.id.toString().padStart(4, "0")}
            </div>
            <div>
              <RainbowTitle text="edit praxis" size={42} color={ink} />
            </div>
          </div>

          {/* Task — luggage tag */}
          <div style={{ position: "relative", marginBottom: 26 }}>
            <div
              style={{
                background: "#fffbe9",
                color: ink,
                padding: "14px 22px 14px 60px",
                border: `2px solid ${accentDeep}`,
                borderRadius: "4px 24px 24px 4px",
                position: "relative",
                transform: "rotate(-0.8deg)",
                boxShadow: "2px 3px 5px rgba(0,0,0,.12)",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${accentDeep}`,
                }}
              />
              <span
                className="eyebrow"
                style={{ color: accentDeep, fontSize: 9 }}
              >
                Re: completion of
              </span>
              <div
                style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 17,
                  lineHeight: 1.3,
                  marginTop: 6,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {praxis.task_title}
              </div>
              <TaskMetaInline
                praxis={praxis}
                task={task}
                textColor={accentDeep}
              />
            </div>
          </div>

          {/* Mode */}
          {!state.controlsLocked && (
            <div style={{ marginBottom: 24 }}>
              <span
                className="eyebrow"
                style={{
                  display: "block",
                  marginBottom: 10,
                  color: accentDeep,
                }}
              >
                Travel party
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {MODE_OPTIONS.filter((opt) =>
                  allowedModes.includes(opt.key),
                ).map((opt) => {
                  const active = praxis.type === opt.key;
                  const disabled =
                    state.modeIsLocked || state.switchingMode !== null;
                  if (state.modeIsLocked && !active) return null;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        if (!disabled) void state.changeMode(opt.key);
                      }}
                      disabled={disabled && !active}
                      style={{
                        flex: "1 1 160px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        background: active ? "#fffbe9" : lightBg,
                        color: ink,
                        border: active
                          ? `2.5px solid ${accentDeep}`
                          : `1.5px dashed ${muted}`,
                        padding: "12px 14px",
                        position: "relative",
                        clipPath:
                          "polygon(0 0, 100% 0, 100% 70%, 92% 100%, 0 100%)",
                        fontFamily: "'Bebas Neue', sans-serif",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 22,
                          letterSpacing: "0.12em",
                          color: active ? accentDeep : ink,
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Courier Prime', monospace",
                          fontSize: 10,
                          marginTop: 2,
                          color: muted,
                          fontStyle: "italic",
                        }}
                      >
                        {opt.desc}
                      </div>
                      {active && (
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 14,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: accentDeep,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invite */}
          {state.showCollabInvite &&
            !(praxis.type === "duel" && state.duelSlotFull) && (
              <div
                style={{
                  marginBottom: 24,
                  padding: "14px 18px",
                  background: "#fffbe9",
                  border: `1.5px solid ${accentDeep}`,
                  backgroundImage: `repeating-linear-gradient(135deg, transparent 0, transparent 14px, rgba(180,83,9,.06) 14px, rgba(180,83,9,.06) 28px)`,
                }}
              >
                <span
                  className="eyebrow"
                  style={{
                    color: accentDeep,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  ↳{" "}
                  {praxis.type === "duel"
                    ? "racing against"
                    : "travelling with"}
                </span>
                <InviteSearch
                  state={state}
                  skin={{
                    fontFamily: "'Courier Prime', monospace",
                    inputBg: "#fffbe9",
                    inputColor: ink,
                    inputBorder: `1.5px solid ${accentDeep}`,
                    acceptedBg: accentDeep,
                    acceptedColor: "var(--color-text-on-accent)",
                    placeholder: "@ manifest entry name...",
                  }}
                />
              </div>
            )}

          {/* Title */}
          <div style={{ marginBottom: 22 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 8, color: accentDeep }}
            >
              destination ·{" "}
              <TitleCounter length={state.title.length} color={muted} />
            </span>
            <input
              type="text"
              maxLength={200}
              value={state.title}
              onChange={(event) => state.setTitle(event.target.value)}
              placeholder="from where, to where"
              style={{
                width: "100%",
                fontFamily: "'Lora', serif",
                fontStyle: "italic",
                fontSize: 28,
                color: ink,
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: `2px solid ${accentDeep}`,
                padding: "4px 0 8px",
              }}
            />
            <RainbowUnderline />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 22 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 8, color: accentDeep }}
            >
              log entry · {state.wordCount} words · markdown ok
            </span>
            <textarea
              value={state.body}
              onChange={(event) => state.setBody(event.target.value)}
              rows={12}
              placeholder="Departed at..."
              style={{
                width: "100%",
                fontFamily: "'Courier Prime', monospace",
                fontSize: 13,
                lineHeight: "22px",
                color: ink,
                background: "#fffbe9",
                border: `1.5px solid ${accentDeep}`,
                padding: "20px 22px",
                outline: "none",
                resize: "vertical",
                minHeight: 220,
                boxShadow: "2px 3px 4px rgba(0,0,0,.08)",
              }}
            />
            {state.body.trim() && (
              <div
                style={{
                  marginTop: 14,
                  background: "#fffbe9",
                  border: `1.5px solid ${accentDeep}`,
                  padding: "20px 22px",
                }}
              >
                <span
                  className="eyebrow"
                  style={{
                    color: accentDeep,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Preview
                </span>
                <MarkdownPreview
                  source={state.body}
                  className="markdown-preview"
                  style={{
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 13,
                    lineHeight: "22px",
                    color: ink,
                  }}
                />
              </div>
            )}
          </div>

          {/* Media — baggage tags */}
          <div style={{ marginBottom: 22 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 12, color: accentDeep }}
            >
              receipts & relics · {state.media.length + state.newFiles.length}{" "}
              pinned
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {state.media.map((item, index) => {
                const filename =
                  item.file_path.split("/").pop() ?? item.file_path;
                const src = mediaUrl(item.file_path);
                return (
                  <BaggageTag
                    key={item.id}
                    rotation={[-2, 1.6, -1.4, 2.2][index % 4]}
                    caption={`★ ${filename}`}
                    accent={accentDeep}
                    onRemove={() => void state.removeMedia(item)}
                  >
                    {item.type === "image" ? (
                      <img
                        src={src}
                        alt=""
                        style={{ width: 140, height: 100, objectFit: "cover" }}
                      />
                    ) : item.type === "video" ? (
                      <video
                        src={src}
                        style={{ width: 140, height: 100, objectFit: "cover" }}
                      />
                    ) : (
                      <MediaArt art={pickArtKey(filename, "audio")} />
                    )}
                  </BaggageTag>
                );
              })}
              {state.newFiles.map((file, index) => (
                <BaggageTag
                  key={index}
                  rotation={[1.8, -2.4, 1.2, -1.6][index % 4]}
                  caption={`★ ${file.name}`}
                  accent={accentDeep}
                  onRemove={() => state.removeNewFile(index)}
                >
                  <MediaArt art={mediaArtKeysFromFile(file)} />
                </BaggageTag>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <FilePicker
                state={state}
                skin={{
                  buttonStyle: {
                    background: "transparent",
                    border: `2px dashed ${accentDeep}`,
                    cursor: "pointer",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 14,
                    color: accentDeep,
                    letterSpacing: "0.1em",
                    padding: "10px 18px",
                  },
                  buttonLabel: "+ STAMP IN",
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
          </div>

          {/* Metatasks */}
          {state.showMetatasks && (
            <div
              style={{
                marginBottom: 22,
                padding: "14px 16px",
                background: "#fffbe9",
                border: `1.5px solid ${accentDeep}`,
              }}
            >
              <span
                className="eyebrow"
                style={{
                  display: "block",
                  marginBottom: 10,
                  color: accentDeep,
                }}
              >
                ★ optional bonus stamp
              </span>
              <MetatasksList
                state={state}
                skin={{
                  rowStyle: (selected) => ({
                    padding: "8px 6px",
                    background: selected ? lightBg : "transparent",
                    border: selected
                      ? `1.5px solid ${accentDeep}`
                      : `1.5px solid transparent`,
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
              gap: 14,
              alignItems: "center",
              marginTop: 24,
              paddingTop: 22,
              borderTop: `1px solid ${accentDeep}`,
              flexWrap: "wrap",
            }}
          >
            {!state.isPublished && (
              <button
                type="button"
                onClick={() => void state.publish()}
                disabled={
                  state.saving ||
                  state.submitting ||
                  state.switchingMode !== null
                }
                style={{
                  position: "relative",
                  background: accentDeep,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 22,
                  letterSpacing: "0.12em",
                  padding: "14px 30px",
                  border: `3px solid ${ink}`,
                  borderRadius: 0,
                  cursor: state.submitting ? "wait" : "pointer",
                  transform: "rotate(-1.2deg)",
                  boxShadow: `2px 3px 0 ${ink}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 4,
                    border: `1px dashed rgba(255,255,255,.5)`,
                    pointerEvents: "none",
                  }}
                />
                {state.submitting ? "STAMPING..." : "★ STAMP & SEND ★"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void state.save()}
              disabled={state.saving || state.submitting}
              style={{
                background: "transparent",
                color: accentDeep,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13,
                letterSpacing: "0.18em",
                border: `1.5px solid ${accentDeep}`,
                padding: "10px 18px",
                cursor: state.saving ? "wait" : "pointer",
              }}
            >
              {state.saving ? "SAVING..." : "SAVE DRAFT"}
            </button>
            <DropButton
              onCancel={state.cancel}
              disabled={
                state.saving || state.submitting || state.switchingMode !== null
              }
              skin={{
                label: "✗ VOID TICKET",
                color: "#b91c1c",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13,
                letterSpacing: "0.18em",
                border: `1.5px dashed #b91c1c`,
                padding: "10px 18px",
              }}
            />
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 9,
                color: muted,
                fontFamily: "'Courier Prime', monospace",
                fontStyle: "italic",
              }}
            >
              {state.autosaveAt
                ? `↳ filed ${formatAutosave(state.autosaveAt)}`
                : "↳ not yet filed"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BaggageTagProps {
  children: React.ReactNode;
  caption: string;
  rotation: number;
  accent: string;
  onRemove: () => void;
}

function BaggageTag({
  children,
  caption,
  rotation,
  accent,
  onRemove,
}: BaggageTagProps) {
  return (
    <div
      style={{
        position: "relative",
        background: "#fffbe9",
        padding: 5,
        border: `1.5px solid ${accent}`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "2px 3px 5px rgba(0,0,0,.12)",
      }}
    >
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          fontSize: 9,
          marginTop: 4,
          fontFamily: "'Courier Prime', monospace",
          color: accent,
          textAlign: "center",
        }}
      >
        {caption}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${caption}`}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fdf6dc",
          border: `1.5px solid ${accent}`,
          color: accent,
          fontSize: 11,
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
