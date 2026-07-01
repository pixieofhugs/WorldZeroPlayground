/**
 * Sticky Note — UA / Albescent / Aged Out / fallback.
 * Cork board, big yellow sticky as the editor surface, mini-stickies for modes.
 */
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

const MODE_OPTIONS: Array<{
  key: PraxisType;
  label: string;
  desc: string;
  bg: string;
}> = [
  { key: "solo", label: "solo", desc: "just me", bg: "#fb7185" },
  { key: "collab", label: "collab", desc: "a few of us", bg: "#4ade80" },
  { key: "duel", label: "duel", desc: "me v. you", bg: "#c084fc" },
];

const STICKY_YELLOW = "#fde68a";
const STICKY_PAPER = "#fffefa";
const CORK = "#c8a874";
const CORK_DEEP = "#a17c4f";
const SLATE = "#475569";
const SLATE_DEEP = "#1e293b";

export default function EditPraxisStickyNote({ state }: Props) {
  const praxis = state.praxis!;
  const task = state.task;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: CORK,
        backgroundImage: `radial-gradient(circle at 10% 10%, rgba(0,0,0,.08) 1px, transparent 1.5px), radial-gradient(circle at 30% 70%, rgba(0,0,0,.08) 1px, transparent 1.5px), radial-gradient(circle at 60% 30%, rgba(0,0,0,.08) 1px, transparent 1.5px), radial-gradient(circle at 85% 85%, rgba(0,0,0,.08) 1px, transparent 1.5px), linear-gradient(135deg, ${CORK} 0%, ${CORK_DEEP} 100%)`,
        backgroundSize: "40px 40px, 35px 35px, 50px 50px, 45px 45px, 100% 100%",
        fontFamily: "'Caveat', cursive",
        color: SLATE_DEEP,
        padding: "32px 24px 48px",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor="#fef3c7"
        />

        {/* Header sticky */}
        <div
          style={{
            background: "#60a5fa",
            padding: "10px 16px",
            transform: "rotate(-3deg)",
            display: "inline-block",
            boxShadow: "3px 4px 6px rgba(0,0,0,.2)",
            marginBottom: 18,
            position: "relative",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 14,
              height: 14,
              background: "#dc2626",
              borderRadius: "50%",
              boxShadow: "inset -2px -2px 3px rgba(0,0,0,.3)",
            }}
          />
          <div
            style={{
              marginTop: 6,
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 14,
              color: SLATE_DEEP,
              letterSpacing: "0.05em",
            }}
          >
            casual proof board
          </div>
        </div>

        {/* Title sticky — big yellow */}
        <div
          style={{
            background: STICKY_YELLOW,
            padding: "20px 28px 24px",
            transform: "rotate(-1.2deg)",
            boxShadow: "4px 6px 10px rgba(0,0,0,.22)",
            marginBottom: 28,
            position: "relative",
            backgroundImage:
              "linear-gradient(180deg, rgba(241,201,69,0.2) 0%, transparent 8%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 14,
              fontSize: 12,
              color: SLATE,
              fontFamily: "'Caveat', cursive",
              fontStyle: "italic",
            }}
          >
            {state.autosaveAt
              ? `saved ${formatAutosave(state.autosaveAt)}!`
              : "unsaved"}
          </div>
          <div style={{ marginBottom: 6 }}>
            <RainbowTitle text="edit praxis" size={42} color={SLATE_DEEP} />
          </div>
          <div
            style={{
              fontSize: 22,
              color: SLATE_DEEP,
              lineHeight: 1.25,
              marginTop: 8,
              fontFamily: "'Caveat', cursive",
            }}
          >
            <span
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: SLATE,
                marginRight: 8,
              }}
            >
              re:
            </span>
            {praxis.task_title}
          </div>
          <div style={{ marginTop: 8 }}>
            <TaskMetaInline praxis={praxis} task={task} textColor={SLATE} />
          </div>
        </div>

        {/* Mode — three small stickies */}
        {!state.controlsLocked && (
          <div
            style={{
              marginBottom: 26,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 16,
                color: "#fef3c7",
                alignSelf: "center",
                transform: "rotate(-2deg)",
                textShadow: "1px 1px 2px rgba(0,0,0,.4)",
              }}
            >
              how →
            </div>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "contents" },
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
                      background: opt.bg,
                      padding: "12px 18px",
                      border: "none",
                      cursor: disabled ? "not-allowed" : "pointer",
                      transform: `rotate(${active ? (index % 2 ? 2 : -2.5) : index % 2 ? -1 : 1}deg) scale(${active ? 1.08 : 1})`,
                      boxShadow: active
                        ? "4px 5px 8px rgba(0,0,0,.25)"
                        : "2px 3px 5px rgba(0,0,0,.15)",
                      fontFamily: "'Caveat', cursive",
                      textAlign: "left",
                      minWidth: 120,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Permanent Marker', cursive",
                        fontSize: 22,
                        color: SLATE_DEEP,
                        lineHeight: 1,
                        marginBottom: 4,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 13, color: SLATE }}>{opt.desc}</div>
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          fontFamily: "'Permanent Marker', cursive",
                          fontSize: 16,
                          color: "#dc2626",
                          transform: "rotate(20deg)",
                        }}
                      >
                        ✓
                      </span>
                    )}
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
                background: STICKY_PAPER,
                padding: "14px 20px",
                transform: "rotate(0.4deg)",
                boxShadow: "3px 4px 7px rgba(0,0,0,.2)",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: 13,
                  color: SLATE,
                  marginBottom: 6,
                }}
              >
                ↳ {praxis.type === "duel" ? "me v." : "who else?"}
              </div>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "'Caveat', cursive",
                  inputBg: "transparent",
                  inputColor: SLATE_DEEP,
                  inputBorder: `1.5px dashed ${SLATE}`,
                  acceptedBg: "#4ade80",
                  acceptedColor: SLATE_DEEP,
                  placeholder: "name or @handle",
                }}
              />
            </div>
          )}

        {/* Title sticky */}
        <div
          style={{
            background: STICKY_PAPER,
            padding: "14px 20px",
            transform: "rotate(0.6deg)",
            boxShadow: "3px 4px 7px rgba(0,0,0,.2)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 11,
              color: SLATE,
              marginBottom: 6,
              letterSpacing: "0.05em",
            }}
          >
            ↳ what'd you call it?
          </div>
          <TitleField
            state={state}
            skin={{
              placeholder: "give it a name",
              inputStyle: {
                width: "100%",
                fontFamily: "'Caveat', cursive",
                fontSize: 30,
                color: SLATE_DEEP,
                fontWeight: 700,
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: `2px dashed ${SLATE}`,
                padding: "4px 0 6px",
              },
            }}
          />
          <RainbowUnderline opacity={0.55} height={2} />
          <div style={{ marginTop: 6 }}>
            <TitleCounter length={state.title.length} color={SLATE} />
          </div>
        </div>

        {/* Body — big white sticky */}
        <div
          style={{
            background: STICKY_PAPER,
            padding: "18px 24px",
            transform: "rotate(-0.4deg)",
            boxShadow: "4px 5px 9px rgba(0,0,0,.22)",
            marginBottom: 24,
            position: "relative",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, #ff6b6b, #c41e3a 70%, #6b0c1a)",
              boxShadow: "1px 2px 3px rgba(0,0,0,.3)",
            }}
          />
          <div
            style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 12,
              color: SLATE,
              marginBottom: 10,
            }}
          >
            ↓ what happened ({state.wordCount} words · md ok)
          </div>
          <BodyTextarea
            state={state}
            skin={{
              rows: 10,
              placeholder: "just write whatever...",
              textareaStyle: {
                width: "100%",
                fontFamily: "'Caveat', cursive",
                fontSize: 18,
                lineHeight: 1.5,
                color: SLATE_DEEP,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "vertical",
                minHeight: 200,
              },
            }}
          />
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                borderTop: `1px dashed ${SLATE}`,
                marginTop: 12,
                paddingTop: 10,
              },
              label: (
                <div
                  style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: 11,
                    color: SLATE,
                    marginBottom: 6,
                  }}
                >
                  preview ↓
                </div>
              ),
              markdownStyle: {
                fontFamily: "'Caveat', cursive",
                fontSize: 18,
                lineHeight: 1.5,
                color: SLATE_DEEP,
              },
            }}
          />
        </div>

        {/* Photos */}
        <div
          style={{
            marginBottom: 26,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontFamily: "'Permanent Marker', cursive",
              fontSize: 14,
              color: "#fef3c7",
              alignSelf: "center",
              transform: "rotate(-3deg)",
              textShadow: "1px 1px 2px rgba(0,0,0,.4)",
            }}
          >
            stick anything →
          </div>
          {state.media.map((item, index) => {
            const filename = item.file_path.split("/").pop() ?? item.file_path;
            const src = mediaUrl(item.file_path);
            return (
              <PolaroidStickie
                key={item.id}
                rotation={index % 2 ? 2.5 : -2.2}
                caption={filename}
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
              </PolaroidStickie>
            );
          })}
          <FilePicker
            state={state}
            skin={{
              buttonStyle: {
                width: 152,
                height: 130,
                background: "rgba(255,254,250,.4)",
                border: `2.5px dashed ${SLATE_DEEP}`,
                cursor: "pointer",
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 16,
                color: SLATE_DEEP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 4,
                transform: "rotate(1.4deg)",
              },
              buttonLabel: "+ tack it up",
              errorColor: "#dc2626",
              helperText: "images · video · audio · max 50mb",
              helperStyle: {
                fontSize: 12,
                color: "#fef3c7",
                marginTop: 6,
                fontStyle: "italic",
                textShadow: "1px 1px 2px rgba(0,0,0,.4)",
              },
            }}
          />
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <div
            style={{
              marginBottom: 26,
              background: STICKY_PAPER,
              padding: "14px 20px",
              transform: "rotate(-0.6deg)",
              boxShadow: "3px 4px 7px rgba(0,0,0,.2)",
            }}
          >
            <div
              style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 13,
                color: SLATE,
                marginBottom: 8,
              }}
            >
              ★ bonus?
            </div>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "8px 4px",
                  background: selected ? STICKY_YELLOW : "transparent",
                  border: selected
                    ? `1.5px solid ${SLATE_DEEP}`
                    : `1.5px solid transparent`,
                  marginBottom: 4,
                  fontFamily: "'Caveat', cursive",
                }),
                titleColor: SLATE_DEEP,
                descColor: SLATE,
                pointsActiveColor: "#dc2626",
                pointsIdleColor: SLATE,
              }}
            />
          </div>
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
            marginTop: 26,
            flexWrap: "wrap",
          }}
        >
          <PublishButton
            state={state}
            skin={{
              idleLabel: "tack it up →",
              busyLabel: "tacking...",
              ornament: (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 4,
                    border: "1.5px dashed rgba(255,255,255,.5)",
                    pointerEvents: "none",
                  }}
                />
              ),
              style: {
                background: "#dc2626",
                color: STICKY_PAPER,
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 22,
                padding: "14px 28px",
                border: "none",
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                letterSpacing: "0.04em",
                transform: "rotate(-2deg)",
                boxShadow: "4px 5px 8px rgba(0,0,0,.3)",
                position: "relative",
              },
            }}
          />
          <DropButton
            state={state}
            skin={{
              label: "throw it away",
              style: {
                background: "transparent",
                border: "none",
                color: SLATE_DEEP,
                fontFamily: "'Caveat', cursive",
                fontSize: 16,
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 16,
              color: "#fef3c7",
              fontStyle: "italic",
              maxWidth: 220,
              lineHeight: 1.3,
              textShadow: "1px 1px 2px rgba(0,0,0,.4)",
              transform: "rotate(-1deg)",
            }}
          >
            ✦ small thing, badly. that's the whole point.
          </span>
        </div>
      </div>
    </div>
  );
}

interface PolaroidStickieProps {
  children: React.ReactNode;
  caption: string;
  rotation: number;
  onRemove: () => void;
}

function PolaroidStickie({
  children,
  caption,
  rotation,
  onRemove,
}: PolaroidStickieProps) {
  return (
    <div
      style={{
        position: "relative",
        background: STICKY_PAPER,
        padding: 6,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "3px 4px 7px rgba(0,0,0,.25)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 35% 35%, #fef08a, #ca8a04 70%)",
          boxShadow: "1px 1px 2px rgba(0,0,0,.3)",
        }}
      />
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          fontSize: 12,
          fontFamily: "'Caveat', cursive",
          color: SLATE_DEEP,
          textAlign: "center",
          marginTop: 3,
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
          background: "#fef3c7",
          border: `1.5px solid ${SLATE_DEEP}`,
          color: SLATE_DEEP,
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
