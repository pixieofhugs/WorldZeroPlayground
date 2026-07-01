/**
 * Masters Gazette / "Masters Thesis" — UA Masters faction.
 * Bone paper, blackletter masthead, IM Fell English body, ornamental engraving frames.
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

const MODE_OPTIONS: Array<{ key: PraxisType; label: string; desc: string }> = [
  { key: "solo", label: "Sōlŏ", desc: "a private closure" },
  { key: "collab", label: "Collaboration", desc: "a quiet conspiracy" },
  { key: "duel", label: "Duel", desc: "a wager of letters" },
];

const HOUSE_BLUE = "#1e3a8a";
const STRUCK_RED = "#b91c1c";

export default function EditPraxisGazette({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

  const surface = factionCssVar("ua_masters", "card-bg");
  const ink = factionCssVar("ua_masters", "card-text");
  const muted = factionCssVar("ua_masters", "card-muted");
  const accent = factionCssVar("ua_masters");
  const accentDeep = factionCssVar("ua_masters", "card-accent");
  const lightBg = factionCssVar("ua_masters", "light");

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: surface,
        color: ink,
        fontFamily: "'IM Fell English', serif",
        position: "relative",
        padding: "40px 32px 48px",
        minHeight: "100vh",
        backgroundImage: `radial-gradient(ellipse at 80% 12%, rgba(42,42,48,.10), transparent 55%), radial-gradient(ellipse at 12% 92%, rgba(42,42,48,.08), transparent 50%)`,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        {/* Floating struck phrase */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            left: -8,
            fontFamily: "'IM Fell English', serif",
            fontStyle: "italic",
            fontSize: 11,
            color: STRUCK_RED,
            textDecoration: "line-through",
            transform: "rotate(-2deg)",
            opacity: 0.85,
            maxWidth: 180,
          }}
        >
          this is not for you
        </div>

        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={muted}
        />

        {/* Top double-rule */}
        <div
          style={{
            borderTop: `2px solid ${ink}`,
            borderBottom: `0.5px solid ${ink}`,
            height: 6,
            marginBottom: 14,
          }}
        />

        {/* Masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 6,
          }}
        >
          <div
            style={{ fontSize: 9, fontStyle: "italic", letterSpacing: "0.1em" }}
          >
            № {praxis.id} · vol. xviii
          </div>
          <div
            style={{
              fontSize: 10,
              fontStyle: "italic",
              letterSpacing: "0.1em",
              color: muted,
            }}
          >
            ❦ ❦ ❦
          </div>
          <div
            style={{ fontSize: 9, fontStyle: "italic", letterSpacing: "0.1em" }}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div
            style={{
              fontFamily: "'UnifrakturCook', serif",
              fontSize: 56,
              color: ink,
              letterSpacing: "0.02em",
              lineHeight: 1,
              position: "relative",
              display: "inline-block",
            }}
          >
            Masters Thesis
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-3deg)",
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: HOUSE_BLUE,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: 0.85,
                mixBlendMode: "multiply",
              }}
            >
              house
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              fontStyle: "italic",
              color: muted,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Of Closures, Loops, &amp; Quiet Resolutions
          </div>
        </div>

        <div
          style={{
            borderTop: `0.5px solid ${ink}`,
            borderBottom: `2px solid ${ink}`,
            height: 6,
            marginBottom: 22,
          }}
        />

        {/* Sub-banner */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <span
            className="eyebrow"
            style={{
              color: muted,
              fontFamily: "'IM Fell English', serif",
              letterSpacing: "0.3em",
              display: "block",
            }}
          >
            ↓ a draft, in the editor's hand ↓
          </span>
          <div style={{ marginTop: 10 }}>
            <RainbowTitle
              text="edit praxis"
              size={42}
              color={ink}
              fontFamily="'IM Fell English', serif"
            />
          </div>
        </div>

        {/* Task */}
        <div
          style={{
            marginBottom: 24,
            padding: "18px 22px",
            border: `1px solid ${ink}`,
            background: lightBg,
            position: "relative",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 4,
              border: `0.5px solid ${ink}`,
              pointerEvents: "none",
            }}
          />
          <span
            className="eyebrow"
            style={{
              color: ink,
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              letterSpacing: "0.22em",
              fontSize: 9,
              display: "block",
              textAlign: "center",
            }}
          >
            ❧ Re: completion of ·{" "}
            <span style={{ color: HOUSE_BLUE }}>UA Masters</span> ❧
          </span>
          <div
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              fontSize: 22,
              lineHeight: 1.3,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            &ldquo;{praxis.task_title}&rdquo;
          </div>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <TaskMetaInline praxis={praxis} task={task} textColor={muted} />
          </div>
        </div>

        {/* Mode */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 24 }}>
            <span
              className="eyebrow"
              style={{
                display: "block",
                marginBottom: 12,
                color: ink,
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                letterSpacing: "0.2em",
                fontSize: 10,
              }}
            >
              ⁘ Manner of Proof ⁘
            </span>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "flex", gap: 0, border: `1px solid ${ink}` },
                options: MODE_OPTIONS,
                allowedModes,
                renderOption: (opt, { active, disabled, onSelect, index }) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={active}
                    onClick={onSelect}
                    disabled={disabled && !active}
                    style={{
                      flex: 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      background: active ? ink : lightBg,
                      color: active ? surface : ink,
                      border: "none",
                      borderLeft: index > 0 ? `1px solid ${ink}` : "none",
                      padding: "14px 16px",
                      fontFamily: "'IM Fell English', serif",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontStyle: "italic",
                        fontSize: 22,
                        lineHeight: 1.05,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85 }}>
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
                marginBottom: 24,
                padding: "14px 18px",
                border: `1px solid ${ink}`,
                background: lightBg,
              }}
            >
              <span
                className="eyebrow"
                style={{
                  color: HOUSE_BLUE,
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: "italic",
                  letterSpacing: "0.2em",
                  fontSize: 10,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                ❧ {praxis.type === "duel" ? "the wager" : "co-conspirators"}
              </span>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "'IM Fell English', serif",
                  inputBg: "transparent",
                  inputColor: ink,
                  inputBorder: `1px solid ${ink}`,
                  acceptedBg: HOUSE_BLUE,
                  acceptedColor: surface,
                  placeholder: "invite by name or @handle...",
                }}
              />
            </div>
          )}

        {/* Title */}
        <div style={{ marginBottom: 22 }}>
          <span
            className="eyebrow"
            style={{
              display: "block",
              marginBottom: 8,
              color: ink,
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            headline
          </span>
          <TitleField
            state={state}
            skin={{
              placeholder: "On the closing of...",
              inputStyle: {
                width: "100%",
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                fontSize: 30,
                color: ink,
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: `2px solid ${ink}`,
                padding: "4px 0 8px",
                textAlign: "center",
              },
            }}
          />
          <RainbowUnderline opacity={0.55} height={2} />
          <div
            style={{
              textAlign: "center",
              marginTop: 8,
              fontSize: 10,
              fontStyle: "italic",
              color: muted,
              letterSpacing: "0.1em",
            }}
          >
            — by the editor, in the year of {new Date().getFullYear()} —
          </div>
          <div style={{ marginTop: 6, textAlign: "center" }}>
            <TitleCounter length={state.title.length} color={muted} />
          </div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{
              color: ink,
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              letterSpacing: "0.2em",
              display: "block",
              marginBottom: 8,
            }}
          >
            the account · {state.wordCount} words · markdown ok
          </span>
          <BodyTextarea
            state={state}
            skin={{
              rows: 14,
              placeholder: "The kitchen-light loop closed today...",
              textareaStyle: {
                width: "100%",
                fontFamily: "'IM Fell English', serif",
                fontSize: 15,
                lineHeight: 1.55,
                color: ink,
                background: lightBg,
                border: `1px solid ${ink}`,
                padding: "20px 22px",
                outline: "none",
                resize: "vertical",
                minHeight: 240,
              },
            }}
          />
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                marginTop: 14,
                background: lightBg,
                border: `1px solid ${ink}`,
                padding: "22px 24px",
                columnCount: 2,
                columnGap: 28,
                columnRule: `0.5px solid ${muted}`,
              },
              label: (
                <span
                  className="eyebrow"
                  style={{
                    color: muted,
                    letterSpacing: "0.2em",
                    display: "block",
                    marginBottom: 6,
                    columnSpan: "all",
                  }}
                >
                  Set in type
                </span>
              ),
              markdownStyle: {
                fontFamily: "'IM Fell English', serif",
                fontSize: 14,
                lineHeight: 1.5,
                color: ink,
              },
            }}
          />
        </div>

        {/* Plates */}
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{
              display: "block",
              marginBottom: 12,
              color: ink,
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              letterSpacing: "0.2em",
              textAlign: "center",
            }}
          >
            ⁘ Engraved plates · {state.media.length + state.newFiles.length} ⁘
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              justifyContent: "center",
            }}
          >
            {state.media.map((item, index) => {
              const filename =
                item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <PlateFrame
                  key={item.id}
                  number={index + 1}
                  caption={filename}
                  ink={ink}
                  bg={lightBg}
                  surface={surface}
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
                </PlateFrame>
              );
            })}
            {state.newFiles.map((file, index) => (
              <PlateFrame
                key={index}
                number={state.media.length + index + 1}
                caption={file.name}
                ink={ink}
                bg={lightBg}
                surface={surface}
                onRemove={() => state.removeNewFile(index)}
              >
                <MediaArt art={mediaArtKeysFromFile(file)} />
              </PlateFrame>
            ))}
            <FilePicker
              state={state}
              skin={{
                buttonStyle: {
                  width: 156,
                  height: 134,
                  background: "transparent",
                  border: `1.5px dashed ${ink}`,
                  cursor: "pointer",
                  fontFamily: "'IM Fell English', serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: ink,
                },
                buttonLabel: "+ engrave a plate",
              }}
            />
          </div>
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <div
            style={{
              marginBottom: 22,
              padding: "14px 18px",
              border: `1px solid ${ink}`,
              background: lightBg,
            }}
          >
            <span
              className="eyebrow"
              style={{
                display: "block",
                marginBottom: 10,
                color: HOUSE_BLUE,
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                letterSpacing: "0.2em",
              }}
            >
              ⁘ Optional Stipulation ⁘
            </span>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "8px 6px",
                  background: selected ? surface : "transparent",
                  border: selected
                    ? `1px solid ${ink}`
                    : `1px solid transparent`,
                  marginBottom: 4,
                }),
                titleColor: ink,
                descColor: muted,
                pointsActiveColor: HOUSE_BLUE,
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
            paddingTop: 22,
            borderTop: `1px solid ${ink}`,
            flexWrap: "wrap",
          }}
        >
          <PublishButton
            state={state}
            skin={{
              idleLabel: "❦ Press & Seal ❦",
              busyLabel: "Sealing...",
              ornament: (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 4,
                    border: `1px solid ${surface}`,
                    opacity: 0.5,
                    pointerEvents: "none",
                  }}
                />
              ),
              style: {
                position: "relative",
                background: HOUSE_BLUE,
                color: surface,
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                fontSize: 18,
                padding: "14px 30px",
                border: `2px solid ${ink}`,
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                letterSpacing: "0.05em",
                boxShadow: `2px 3px 0 ${ink}`,
              },
            }}
          />
          <DropButton
            state={state}
            skin={{
              label: "abandon this story",
              style: {
                background: "transparent",
                border: "none",
                color: muted,
                fontFamily: "'IM Fell English', serif",
                fontStyle: "italic",
                fontSize: 11,
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: "italic",
              fontSize: 11,
              color: muted,
            }}
          >
            {state.autosaveAt
              ? `the editor sealed this ${formatAutosave(state.autosaveAt)}`
              : "unsealed"}
          </span>
        </div>

        {/* Bottom rule */}
        <div
          style={{
            borderTop: `2px solid ${ink}`,
            marginTop: 18,
            paddingTop: 8,
            fontSize: 9,
            fontStyle: "italic",
            color: muted,
            textAlign: "center",
            letterSpacing: "0.18em",
          }}
        >
          ⁘ printed in the editor's room ·{" "}
          <span style={{ color: HOUSE_BLUE }}>house</span> · all loops conserved
          ⁘
          {/* Suppress linter — accent/accentDeep are reserved for future ornamental flourishes. */}
          <span style={{ display: "none" }}>
            {accent}
            {accentDeep}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PlateFrameProps {
  children: React.ReactNode;
  number: number;
  caption: string;
  ink: string;
  bg: string;
  surface: string;
  onRemove: () => void;
}

function PlateFrame({
  children,
  number,
  caption,
  ink,
  bg,
  surface,
  onRemove,
}: PlateFrameProps) {
  return (
    <figure
      style={{
        position: "relative",
        margin: 0,
        background: bg,
        padding: "8px 8px 26px",
        border: `1px solid ${ink}`,
      }}
    >
      <div
        style={{
          width: 140,
          height: 100,
          overflow: "hidden",
          filter: "sepia(0.18) contrast(1.05)",
          border: `0.5px solid ${ink}`,
        }}
      >
        {children}
      </div>
      <figcaption
        style={{
          position: "absolute",
          bottom: 6,
          left: 8,
          right: 8,
          fontSize: 10,
          fontFamily: "'IM Fell English', serif",
          fontStyle: "italic",
          color: ink,
          textAlign: "center",
        }}
      >
        Plate {number}. — {caption}
      </figcaption>
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
          background: surface,
          border: `1px solid ${ink}`,
          color: ink,
          fontSize: 11,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </figure>
  );
}
