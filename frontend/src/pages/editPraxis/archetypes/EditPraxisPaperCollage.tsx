/**
 * Paper Collage — Gestalt faction.
 * Layered torn paper, hopepunk sunrise palette, taped polaroids, walker tags.
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
  { key: "solo", label: "solo", desc: "one set of footprints" },
  { key: "collab", label: "collab", desc: "in step with others" },
  { key: "duel", label: "duel", desc: "two paths, one prize" },
];

export default function EditPraxisPaperCollage({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

  const accent = factionCssVar("gestalt");
  const accentDeep = factionCssVar("gestalt", "card-accent");
  const surface = factionCssVar("gestalt", "card-bg");
  const ink = factionCssVar("gestalt", "card-text");
  const muted = factionCssVar("gestalt", "card-muted");
  const lightBg = factionCssVar("gestalt", "light");

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: surface,
        color: ink,
        fontFamily: "'Lora', serif",
        position: "relative",
        padding: "32px 28px 48px",
        minHeight: "100vh",
        backgroundImage: `radial-gradient(ellipse at 80% 8%, rgba(255,138,91,.16), transparent 55%), radial-gradient(ellipse at 18% 18%, rgba(126,200,227,.14), transparent 50%), radial-gradient(ellipse at 92% 88%, rgba(47,165,106,.12), transparent 55%)`,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={muted}
        />

        {/* Header — torn-paper banner */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              background: `linear-gradient(95deg, ${accent} 0%, ${accentDeep} 60%, ${factionCssVar("gestalt", "card-accent")} 100%)`,
              color: "var(--color-text-on-accent)",
              padding: "10px 18px 14px",
              clipPath:
                "polygon(0 0, 100% 0, 99% 88%, 94% 100%, 86% 92%, 74% 100%, 60% 90%, 46% 100%, 32% 92%, 18% 100%, 6% 92%, 0 100%)",
              display: "inline-block",
              transform: "rotate(-0.6deg)",
              fontFamily: "'Caveat', cursive",
              fontSize: 14,
              letterSpacing: "0.04em",
              fontWeight: 700,
            }}
          >
            ☀ GESTALT FIELD NOTES · scrap 19 ☀
          </div>
          <div style={{ marginTop: 14 }}>
            <RainbowTitle text="edit praxis" size={42} color={ink} />
          </div>
        </div>

        {/* Task — torn scrap */}
        <div
          style={{
            position: "relative",
            marginBottom: 26,
            background: lightBg,
            color: ink,
            padding: "14px 20px",
            clipPath:
              "polygon(2% 6%, 8% 0, 22% 4%, 38% 0, 56% 5%, 74% 1%, 92% 4%, 100% 12%, 98% 88%, 92% 100%, 76% 96%, 60% 100%, 42% 96%, 24% 100%, 10% 96%, 0 88%, 4% 40%)",
            transform: "rotate(-1.2deg)",
            borderLeft: `5px solid ${accent}`,
            boxShadow: "2px 3px 6px rgba(0,0,0,.08)",
          }}
        >
          <span className="eyebrow" style={{ color: accentDeep }}>
            Re: completion of
          </span>
          <div
            style={{
              fontFamily: "'Lora', serif",
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.25,
              marginTop: 6,
              marginBottom: 8,
            }}
          >
            {praxis.task_title}
          </div>
          <TaskMetaInline praxis={praxis} task={task} textColor={accentDeep} />
        </div>

        {/* Mode */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 24 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 10, color: accentDeep }}
            >
              How are you walking?
            </span>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {MODE_OPTIONS.filter((opt) => allowedModes.includes(opt.key)).map(
                (opt, index) => {
                  const active = praxis.type === opt.key;
                  const disabled =
                    state.modeIsLocked || state.switchingMode !== null;
                  if (state.modeIsLocked && !active) return null;
                  const palette = ["#ff8a5b", accentDeep, "#7ec8e3"];
                  const c = palette[index % palette.length];
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
                        flex: "1 1 180px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        textAlign: "left",
                        background: active ? c : lightBg,
                        color: active ? "var(--color-text-on-accent)" : ink,
                        border: `1.5px solid ${c}`,
                        padding: "14px 14px 16px",
                        fontFamily: "'Lora', serif",
                        clipPath: "polygon(2% 8%, 100% 0, 98% 92%, 0 100%)",
                        transform: `rotate(${active ? (index % 2 ? 0.8 : -0.6) : index % 2 ? -0.4 : 0.4}deg)`,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          fontStyle: "italic",
                          fontSize: 22,
                          marginBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Caveat', cursive",
                          fontSize: 14,
                          opacity: 0.85,
                        }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Invite */}
        {state.showCollabInvite &&
          !(praxis.type === "duel" && state.duelSlotFull) && (
            <div
              style={{
                marginBottom: 24,
                padding: "14px 16px",
                background: `linear-gradient(180deg, ${lightBg}, transparent)`,
                border: `1.5px dashed ${accent}`,
              }}
            >
              <span
                className="eyebrow"
                style={{
                  display: "block",
                  marginBottom: 10,
                  color: accentDeep,
                  fontWeight: 700,
                }}
              >
                ↳ {praxis.type === "duel" ? "racing" : "walking together"}
              </span>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "'Caveat', cursive",
                  inputBg: "transparent",
                  inputColor: ink,
                  inputBorder: `1.5px dashed ${accentDeep}`,
                  pillBg: lightBg,
                  acceptedBg: accent,
                  acceptedColor: "var(--color-text-on-accent)",
                  placeholder: "@ invite another walker…",
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
            title{" "}
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                textTransform: "none",
                letterSpacing: 0,
                fontSize: 14,
              }}
            >
              · what gestalt arose?
            </span>
          </span>
          <input
            type="text"
            maxLength={200}
            value={state.title}
            onChange={(event) => state.setTitle(event.target.value)}
            placeholder="What gestalt arose?"
            style={{
              width: "100%",
              fontFamily: "'Lora', serif",
              fontStyle: "italic",
              fontSize: 30,
              color: ink,
              background: "transparent",
              border: "none",
              outline: "none",
              borderBottom: `2px solid ${accentDeep}`,
              padding: "4px 0 8px",
            }}
          />
          <RainbowUnderline opacity={0.55} />
          <div
            style={{
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <TitleCounter length={state.title.length} color={muted} />
            <span className="eyebrow" style={{ color: muted, fontSize: 8 }}>
              {state.autosaveAt
                ? `pasted in ${formatAutosave(state.autosaveAt)}`
                : "unpasted"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 22 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 8, color: accentDeep }}
          >
            field notes ·{" "}
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                textTransform: "none",
                letterSpacing: 0,
                fontSize: 13,
              }}
            >
              {state.wordCount} words · markdown ok
            </span>
          </span>
          <textarea
            value={state.body}
            onChange={(event) => state.setBody(event.target.value)}
            rows={12}
            placeholder="Tonight I walked..."
            style={{
              width: "100%",
              fontFamily: "'Lora', serif",
              fontSize: 14,
              lineHeight: "24px",
              color: ink,
              background: lightBg,
              border: `1.5px solid ${accentDeep}`,
              padding: "20px 22px",
              outline: "none",
              resize: "vertical",
              minHeight: 220,
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(90,122,74,.18) 24px)",
              boxShadow: "2px 3px 4px rgba(0,0,0,.06)",
            }}
          />
          {state.body.trim() && (
            <div
              style={{
                marginTop: 14,
                background: lightBg,
                border: `1.5px solid ${accentDeep}`,
                padding: "20px 22px",
              }}
            >
              <span
                className="eyebrow"
                style={{ color: accentDeep, display: "block", marginBottom: 6 }}
              >
                Preview
              </span>
              <MarkdownPreview
                source={state.body}
                className="markdown-preview"
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: ink,
                }}
              />
            </div>
          )}
        </div>

        {/* Media — polaroids */}
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 12, color: accentDeep }}
          >
            scraps & specimens · {state.media.length + state.newFiles.length}{" "}
            pasted
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            {state.media.map((item, index) => {
              const filename =
                item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <PolaroidScrap
                  key={item.id}
                  caption={filename}
                  rotation={[-2.6, 1.8, -1.4, 2.2][index % 4]}
                  borderColor={accentDeep}
                  paperBg="#fff5d9"
                  removeColor={accent}
                  paperBorder={accent}
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
                </PolaroidScrap>
              );
            })}
            {state.newFiles.map((file, index) => (
              <PolaroidScrap
                key={index}
                caption={file.name}
                rotation={[1.6, -2.2, 2.6, -1.4][index % 4]}
                borderColor={accentDeep}
                paperBg="#fff5d9"
                removeColor={accent}
                paperBorder={accent}
                onRemove={() => state.removeNewFile(index)}
              >
                <MediaArt art={mediaArtKeysFromFile(file)} />
              </PolaroidScrap>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <FilePicker
              state={state}
              skin={{
                buttonStyle: {
                  width: 152,
                  height: 110,
                  background: "transparent",
                  border: `2px dashed ${accentDeep}`,
                  cursor: "pointer",
                  fontFamily: "'Caveat', cursive",
                  fontSize: 16,
                  color: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 4,
                },
                buttonLabel: "+ paste in a scrap",
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
              background: lightBg,
              border: `1.5px dashed ${accentDeep}`,
            }}
          >
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 8, color: accentDeep }}
            >
              ★ optional bonus
            </span>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "8px 6px",
                  background: selected ? "#fff5d9" : "transparent",
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
            borderTop: `1px dashed ${accentDeep}`,
            flexWrap: "wrap",
          }}
        >
          {!state.isPublished && (
            <button
              type="button"
              onClick={() => void state.publish()}
              disabled={
                state.saving || state.submitting || state.switchingMode !== null
              }
              style={{
                position: "relative",
                background: `linear-gradient(95deg, #ff8a5b, ${accent})`,
                color: "var(--color-text-on-accent)",
                fontFamily: "'Lora', serif",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 700,
                padding: "14px 30px",
                border: `3px solid ${ink}`,
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                transform: "rotate(-1deg)",
                boxShadow: `3px 4px 0 ${accentDeep}`,
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
              {state.submitting ? "pressing..." : "☀ press & publish →"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void state.save()}
            disabled={state.saving || state.submitting}
            style={{
              background: "transparent",
              color: accentDeep,
              fontFamily: "'Courier Prime', monospace",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              border: `1.5px solid ${accentDeep}`,
              padding: "10px 18px",
              cursor: state.saving ? "wait" : "pointer",
            }}
          >
            {state.saving ? "saving..." : "save draft"}
          </button>
          <div style={{ flex: 1 }} />
          <DropButton
            onCancel={state.cancel}
            disabled={
              state.saving || state.submitting || state.switchingMode !== null
            }
            skin={{
              label: "tear off & toss",
              color: "#ff8a5b",
              fontFamily: "'Caveat', cursive",
              fontSize: 18,
              fontStyle: "italic",
              textDecoration: "underline wavy",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface PolaroidScrapProps {
  children: React.ReactNode;
  caption: string;
  rotation: number;
  borderColor: string;
  paperBg: string;
  removeColor: string;
  paperBorder: string;
  onRemove: () => void;
}

function PolaroidScrap({
  children,
  caption,
  rotation,
  borderColor,
  paperBg,
  removeColor,
  paperBorder,
  onRemove,
}: PolaroidScrapProps) {
  return (
    <div
      style={{
        position: "relative",
        background: paperBg,
        padding: "6px 6px 22px",
        boxShadow: "2px 3px 5px rgba(0,0,0,.12)",
        transform: `rotate(${rotation}deg)`,
        border: `1px solid ${paperBorder}`,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(-2deg)",
          width: 56,
          height: 14,
          background: "rgba(168,198,154,.6)",
        }}
      />
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 8,
          right: 8,
          fontSize: 10,
          fontFamily: "'Caveat', cursive",
          color: "#1a1f15",
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
          background: "#fff8e8",
          border: `1.5px solid ${borderColor}`,
          color: removeColor,
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
