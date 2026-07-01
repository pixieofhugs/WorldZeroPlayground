/**
 * wow.exe — Warriors of Whimsy faction edit-praxis form.
 * Lo-fi computer-witch desktop window: pastel pink chrome, dotted grid body,
 * notepad panels, window-tab mode chips, lo-fi pink buttons, ivy + sticker charms.
 */
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
  MetatasksList,
  ModePicker,
  PublishButton,
  TitleField,
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

/* ───────── sticker + ivy atoms (inlined from the redesign kit) ───────── */

function Sparkle({
  size = 16,
  color,
  style,
}: {
  size?: number;
  color: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  );
}

function Heart({
  size = 34,
  style,
}: {
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={style}>
      <path
        d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z"
        fill="#fb7aa8"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarSticker({
  size = 26,
  color = "#f6c75e",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={style}>
      <path
        d="M14 2l3 7.3L24.5 10l-5.5 4.6L20.7 23 14 18.6 7.3 23l1.7-8.4L3.5 10 11 9.3Z"
        fill={color}
        stroke="#fff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IvyLeaf({
  x,
  y,
  rot,
  scale,
  c,
  leaf,
}: {
  x: number;
  y: number;
  rot: number;
  scale: number;
  c: string;
  leaf: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path
        d="M0 0 C -9 -3 -11 -13 -6 -20 C -2 -25 2 -25 6 -20 C 11 -13 9 -3 0 0 Z"
        fill={leaf}
        stroke={c}
        strokeWidth="1.1"
      />
      <path d="M0 -1 L0 -19" stroke={c} strokeWidth="1" opacity="0.55" />
      <path
        d="M0 -8 L-4 -12 M0 -8 L4 -12"
        stroke={c}
        strokeWidth="0.8"
        opacity="0.45"
        fill="none"
      />
    </g>
  );
}

function Ivy({
  height = 250,
  c,
  leaf,
}: {
  height?: number;
  c: string;
  leaf: string;
}) {
  const width = 76;
  const segments = 60;
  const xAt = (t: number) => 40 + 20 * Math.sin(t * Math.PI * 2.3);
  const yAt = (t: number) => 6 + t * (height - 12);
  let path = "";
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    path +=
      (i === 0 ? "M" : "L") + xAt(t).toFixed(1) + " " + yAt(t).toFixed(1) + " ";
  }
  const leafTs = [0.07, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.93];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={c}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={`M${xAt(0.02)} ${yAt(0.02)} q -10 -6 -4 -13 q 4 -4 8 0`}
        fill="none"
        stroke={c}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {leafTs.map((t, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        return (
          <IvyLeaf
            key={i}
            x={xAt(t) + side * 7}
            y={yAt(t)}
            rot={side > 0 ? 38 : -38}
            scale={i % 3 === 0 ? 1.15 : 0.95}
            c={c}
            leaf={leaf}
          />
        );
      })}
    </svg>
  );
}

export default function EditPraxisPaperCollage({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

  const pink = factionCssVar("wow");
  const pinkDeep = factionCssVar("wow", "card-accent");
  const ink = factionCssVar("wow", "card-text");
  const muted = factionCssVar("wow", "card-muted");
  const lightBg = factionCssVar("wow", "light");
  const cardFont = factionCssVar("wow", "card-font");

  const winBorder = factionCssVar("wow", "win-border");
  const titleFrom = factionCssVar("wow", "title-from");
  const titleTo = factionCssVar("wow", "title-to");
  const titleText = factionCssVar("wow", "title-text");
  const bodyBg = factionCssVar("wow", "body-bg");
  const notepadBg = factionCssVar("wow", "notepad-bg");
  const notepadBorder = factionCssVar("wow", "notepad-border");
  const dot = factionCssVar("wow", "dot");
  const ivy = factionCssVar("wow", "ivy");
  const ivyLeaf = factionCssVar("wow", "ivy-leaf");

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const eyebrowStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-body)",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: pinkDeep,
  };

  const notepadPanel: React.CSSProperties = {
    background: notepadBg,
    border: `1.5px solid ${notepadBorder}`,
    borderRadius: 8,
    padding: "14px 16px",
    position: "relative",
    zIndex: 9,
  };

  return (
    <div
      style={
        {
          fontFamily: "var(--font-body)",
          color: ink,
          padding: "32px 20px 56px",
          minHeight: "100vh",
          background: lightBg,
        } as React.CSSProperties
      }
    >
      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        {/* ivy down the left edge, behind the window */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -54,
            top: 70,
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <Ivy height={420} c={ivy} leaf={ivyLeaf} />
        </div>

        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={muted}
        />

        {/* ── the .exe window ── */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            borderRadius: 12,
            overflow: "hidden",
            border: `2px solid ${winBorder}`,
            boxShadow: "0 12px 30px rgba(190,60,120,.22)",
          }}
        >
          {/* title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "9px 13px",
              background: `linear-gradient(180deg, ${titleFrom}, ${titleTo})`,
              borderBottom: `2px solid ${winBorder}`,
            }}
          >
            <div style={{ display: "flex", gap: 5 }}>
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#fb7aa8",
                  border: "1.5px solid rgba(255,255,255,0.7)",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#f6c75e",
                  border: "1.5px solid rgba(255,255,255,0.7)",
                }}
              />
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#86cfa6",
                  border: "1.5px solid rgba(255,255,255,0.7)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 11,
                color: titleText,
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Sparkle size={11} color={titleText} /> wow.exe — edit praxis
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: titleText,
                opacity: 0.75,
                letterSpacing: "1.5px",
              }}
            >
              ▭ ✕
            </span>
          </div>

          {/* dotted body */}
          <div
            style={{
              position: "relative",
              padding: "24px 22px 26px",
              background: bodyBg,
              backgroundImage: `radial-gradient(${dot} 1.4px, transparent 1.4px)`,
              backgroundSize: "13px 13px",
            }}
          >
            {/* headline */}
            <div
              style={{
                fontFamily: cardFont,
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1,
                color: ink,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              edit praxis
              <StarSticker size={26} color="#f47aa6" />
            </div>

            {/* Task — notepad scrap */}
            <div style={{ ...notepadPanel, marginBottom: 22 }}>
              <span style={{ ...eyebrowStyle, marginBottom: 4 }}>
                re: completion of
              </span>
              <div
                style={{
                  fontFamily: cardFont,
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: ink,
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                {praxis.task_title}
              </div>
              <TaskMetaInline praxis={praxis} task={task} textColor={pinkDeep} />
            </div>

            {/* Mode — window tab chips */}
            {!state.controlsLocked && (
              <div style={{ marginBottom: 22 }}>
                <span style={{ ...eyebrowStyle, marginBottom: 10 }}>
                  how are you walking?
                </span>
                <ModePicker
                  state={state}
                  skin={{
                    containerStyle: { display: "flex", gap: 8, flexWrap: "wrap" },
                    options: MODE_OPTIONS,
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
                          cursor: disabled ? "not-allowed" : "pointer",
                          textAlign: "left",
                          background: active
                            ? `linear-gradient(180deg, ${pink}, ${pinkDeep})`
                            : notepadBg,
                          color: active ? "var(--color-text-on-accent)" : ink,
                          border: `1.5px solid ${active ? pinkDeep : notepadBorder}`,
                          borderRadius: 9,
                          padding: "11px 14px 13px",
                          fontFamily: "var(--font-body)",
                          boxShadow: active
                            ? "0 4px 10px rgba(236,95,153,.32)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: cardFont,
                            fontSize: 22,
                            fontWeight: 700,
                            marginBottom: 2,
                          }}
                        >
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.85 }}>
                          {opt.desc}
                        </div>
                      </button>
                    ),
                  }}
                />
              </div>
            )}

            {/* Invite */}
            {state.showCollabInvite &&
              !(praxis.type === "duel" && state.duelSlotFull) && (
                <div
                  style={{
                    ...notepadPanel,
                    marginBottom: 22,
                    borderStyle: "dashed",
                  }}
                >
                  <span style={{ ...eyebrowStyle, marginBottom: 10 }}>
                    ↳ {praxis.type === "duel" ? "racing" : "walking together"}
                  </span>
                  <InviteSearch
                    state={state}
                    skin={{
                      fontFamily: "var(--font-body)",
                      inputBg: bodyBg,
                      inputColor: ink,
                      inputBorder: `1.5px solid ${notepadBorder}`,
                      pillBg: lightBg,
                      acceptedBg: pink,
                      acceptedColor: "var(--color-text-on-accent)",
                      placeholder: "@ invite another walker…",
                    }}
                  />
                </div>
              )}

            {/* Title — notepad panel */}
            <div style={{ ...notepadPanel, marginBottom: 18 }}>
              <span style={{ ...eyebrowStyle, marginBottom: 8 }}>
                title · what whimsy arose?
              </span>
              <TitleField
                state={state}
                skin={{
                  placeholder: "What whimsy arose?",
                  inputStyle: {
                    width: "100%",
                    fontFamily: cardFont,
                    fontSize: 28,
                    fontWeight: 700,
                    color: ink,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    borderBottom: `2px solid ${notepadBorder}`,
                    padding: "4px 0 8px",
                  },
                }}
              />
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <TitleCounter length={state.title.length} color={muted} />
                <span style={{ ...eyebrowStyle, color: muted, fontSize: 8 }}>
                  {state.autosaveAt
                    ? `saved ${formatAutosave(state.autosaveAt)}`
                    : "unsaved"}
                </span>
              </div>
            </div>

            {/* Body — notepad panel */}
            <div style={{ ...notepadPanel, marginBottom: 18 }}>
              <span style={{ ...eyebrowStyle, marginBottom: 8 }}>
                field notes · {state.wordCount} words · markdown ok
              </span>
              <BodyTextarea
                state={state}
                skin={{
                  rows: 12,
                  placeholder: "Tonight I walked...",
                  textareaStyle: {
                    width: "100%",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    lineHeight: "24px",
                    color: ink,
                    background: bodyBg,
                    border: `1.5px solid ${notepadBorder}`,
                    borderRadius: 7,
                    padding: "16px 18px",
                    outline: "none",
                    resize: "vertical",
                    minHeight: 220,
                  },
                }}
              />
              <BodyPreview
                state={state}
                skin={{
                  wrapperStyle: {
                    marginTop: 14,
                    background: bodyBg,
                    border: `1.5px solid ${notepadBorder}`,
                    borderRadius: 7,
                    padding: "16px 18px",
                  },
                  label: (
                    <span style={{ ...eyebrowStyle, marginBottom: 6 }}>
                      preview
                    </span>
                  ),
                  markdownStyle: {
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: ink,
                  },
                }}
              />
            </div>

            {/* Media — notepad panel */}
            <div style={{ ...notepadPanel, marginBottom: 18 }}>
              <span style={{ ...eyebrowStyle, marginBottom: 12 }}>
                scraps &amp; specimens ·{" "}
                {state.media.length} pasted
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {state.media.map((item) => {
                  const filename =
                    item.file_path.split("/").pop() ?? item.file_path;
                  const src = mediaUrl(item.file_path);
                  return (
                    <MediaTile
                      key={item.id}
                      caption={filename}
                      borderColor={notepadBorder}
                      tileBg={notepadBg}
                      removeColor={pink}
                      onRemove={() => void state.removeMedia(item)}
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
                    </MediaTile>
                  );
                })}
              </div>
              <div style={{ marginTop: 14 }}>
                <FilePicker
                  state={state}
                  skin={{
                    buttonStyle: {
                      width: 152,
                      height: 110,
                      background: bodyBg,
                      border: `2px dashed ${notepadBorder}`,
                      borderRadius: 9,
                      cursor: "pointer",
                      fontFamily: cardFont,
                      fontSize: 18,
                      fontWeight: 700,
                      color: pink,
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
                    },
                  }}
                />
              </div>
            </div>

            {/* Metatasks */}
            {state.showMetatasks && (
              <div
                style={{
                  ...notepadPanel,
                  marginBottom: 18,
                  borderStyle: "dashed",
                }}
              >
                <span style={{ ...eyebrowStyle, marginBottom: 8 }}>
                  ★ optional bonus
                </span>
                <MetatasksList
                  state={state}
                  skin={{
                    rowStyle: (selected) => ({
                      padding: "8px 6px",
                      background: selected ? lightBg : "transparent",
                      border: selected
                        ? `1.5px solid ${pinkDeep}`
                        : `1.5px solid transparent`,
                      borderRadius: 6,
                      marginBottom: 4,
                    }),
                    titleColor: ink,
                    descColor: muted,
                    pointsActiveColor: pinkDeep,
                    pointsIdleColor: muted,
                  }}
                />
              </div>
            )}

            <ErrorBanner message={state.error} />

            {/* CTAs — lo-fi pink buttons */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginTop: 22,
                paddingTop: 20,
                borderTop: `1.5px dashed ${notepadBorder}`,
                flexWrap: "wrap",
              }}
            >
              <PublishButton
                state={state}
                skin={{
                  ornament: (
                    <Sparkle size={12} color="var(--color-text-on-accent)" />
                  ),
                  idleLabel: "publish",
                  busyLabel: "publishing...",
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: `linear-gradient(180deg, ${pink}, ${pinkDeep})`,
                    color: "var(--color-text-on-accent)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    padding: "11px 22px",
                    border: `1.5px solid ${pinkDeep}`,
                    borderRadius: 9,
                    cursor: state.submitting ? "wait" : "pointer",
                    boxShadow: "0 4px 12px rgba(236,95,153,.32)",
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
                    fontFamily: cardFont,
                    fontSize: 18,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* sticker charms peeking off the window edges */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            right: 6,
            transform: "rotate(14deg)",
            filter: "drop-shadow(0 2px 2.5px rgba(120,40,80,0.28))",
            zIndex: 12,
            pointerEvents: "none",
          }}
        >
          <Heart size={34} />
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -6,
            left: 30,
            transform: "rotate(-9deg)",
            filter: "drop-shadow(0 2px 2.5px rgba(120,40,80,0.28))",
            zIndex: 12,
            pointerEvents: "none",
          }}
        >
          <StarSticker size={30} color="#f6c75e" />
        </div>
      </div>
    </div>
  );
}

interface MediaTileProps {
  children: React.ReactNode;
  caption: string;
  borderColor: string;
  tileBg: string;
  removeColor: string;
  onRemove: () => void;
}

function MediaTile({
  children,
  caption,
  borderColor,
  tileBg,
  removeColor,
  onRemove,
}: MediaTileProps) {
  return (
    <div
      style={{
        position: "relative",
        background: tileBg,
        padding: "6px 6px 22px",
        borderRadius: 9,
        border: `1.5px solid ${borderColor}`,
        boxShadow: "0 3px 7px rgba(190,60,120,.16)",
      }}
    >
      <div
        style={{
          width: 140,
          height: 100,
          overflow: "hidden",
          borderRadius: 5,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 4,
          left: 8,
          right: 8,
          fontSize: 10,
          fontFamily: "var(--font-body)",
          color: borderColor,
          textAlign: "center",
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
        aria-label={`Remove ${caption}`}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: tileBg,
          border: `1.5px solid ${removeColor}`,
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
