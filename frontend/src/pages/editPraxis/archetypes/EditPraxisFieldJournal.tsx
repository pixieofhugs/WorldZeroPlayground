/**
 * Field Journal — Analog faction.
 * Off-white ruled paper, three-hole punch, paperclip mode tabs, taped polaroids.
 */
import { useRef } from "react";
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
import { DropButton } from "./controls";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const MODE_OPTIONS: Array<{ key: PraxisType; label: string; desc: string }> = [
  { key: "solo", label: "Solo", desc: "all yours." },
  { key: "collab", label: "Collaboration", desc: "invite others." },
  { key: "duel", label: "Duel", desc: "winner takes all." },
];

export default function EditPraxisFieldJournal({ state }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const praxis = state.praxis!;
  const task = state.task;

  const accent = factionCssVar("analog");
  const surface = factionCssVar("analog", "card-bg");
  const ink = factionCssVar("analog", "card-text");
  const muted = factionCssVar("analog", "card-muted");
  const tape = "rgba(220,170,90,.45)";
  const ruleRed = "#c44a3a";

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: surface,
        color: ink,
        fontFamily: "'Special Elite', 'Courier New', serif",
        position: "relative",
        padding: "38px 32px 56px 96px",
        boxShadow: "0 0 0 1px rgba(0,0,0,.08)",
        minHeight: "100vh",
      }}
    >
      {/* Three-hole binding column */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 56,
          borderRight: "1px dashed rgba(120,90,40,.3)",
          background:
            "linear-gradient(90deg, rgba(0,0,0,.04), transparent 70%)",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 16,
              top: 60 + i * 70,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "rgba(60,40,20,.35)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,.5)",
            }}
          />
        ))}
      </div>

      {/* Red margin rule */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 84,
          top: 28,
          bottom: 28,
          width: 1.5,
          background: ruleRed,
          opacity: 0.4,
        }}
      />

      <div style={{ maxWidth: 700 }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={muted}
        />

        {/* Header band */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 24,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(80,60,20,.2)",
          }}
        >
          <div>
            <div className="eyebrow" style={{ color: muted, marginBottom: 6 }}>
              Field Journal &middot; draft &middot; pp. 47
            </div>
            <RainbowTitle text="edit praxis" size={40} color={ink} />
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: 10,
              color: muted,
              lineHeight: 1.3,
            }}
          >
            <div style={{ fontStyle: "italic" }}>
              {state.saveStatus === "saving" ? "autosaving..." : ""}
            </div>
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {state.autosaveAt
                ? `autosaved ${formatAutosave(state.autosaveAt)}`
                : "unsaved"}
            </div>
          </div>
        </div>

        {/* Task pinned via tape */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -8,
              left: 30,
              width: 80,
              height: 16,
              background: tape,
              transform: "rotate(-3deg)",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -8,
              right: 30,
              width: 80,
              height: 16,
              background: tape,
              transform: "rotate(2deg)",
            }}
          />
          <div
            style={{
              background: "#fff8e3",
              border: "1px solid rgba(80,60,20,.2)",
              padding: "14px 18px",
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent 21px, rgba(80,120,180,.10) 22px)",
            }}
          >
            <span
              className="eyebrow"
              style={{ color: accent, display: "block", marginBottom: 4 }}
            >
              Proving completion of
            </span>
            <div
              style={{
                fontFamily: "'Lora', serif",
                fontStyle: "italic",
                fontSize: 22,
                lineHeight: 1.2,
                color: ink,
                marginBottom: 8,
              }}
            >
              {praxis.task_title}
            </div>
            <TaskMetaInline praxis={praxis} task={task} textColor={muted} />
          </div>
        </div>

        {/* Mode selector */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 26 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 10, color: muted }}
            >
              How do you want to do this?
            </span>
            <div style={{ display: "flex", gap: 14 }}>
              {MODE_OPTIONS.filter((opt) => allowedModes.includes(opt.key)).map(
                (opt, index) => {
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
                        flex: 1,
                        position: "relative",
                        background: active ? "#fff5d0" : "rgba(255,250,230,.5)",
                        border: active
                          ? `2px solid ${ink}`
                          : "1px dashed rgba(80,60,20,.4)",
                        padding: "14px 12px 16px",
                        fontFamily: "'Special Elite', serif",
                        color: ink,
                        textAlign: "left",
                        transform: active
                          ? `rotate(${index % 2 ? 0.6 : -0.5}deg)`
                          : `rotate(${index % 2 ? -0.3 : 0.3}deg)`,
                        boxShadow: active
                          ? "2px 3px 0 rgba(80,60,20,.15)"
                          : "none",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    >
                      <svg
                        aria-hidden
                        width="22"
                        height="44"
                        viewBox="0 0 22 44"
                        style={{ position: "absolute", top: -10, left: 14 }}
                      >
                        <path
                          d="M11 4 Q4 4, 4 12 L4 32 Q4 38, 10 38 Q16 38, 16 32 L16 14 Q16 10, 12 10 Q8 10, 8 14 L8 28"
                          fill="none"
                          stroke="#7a6a4a"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          marginTop: 8,
                          marginBottom: 4,
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{ fontSize: 10, color: muted, lineHeight: 1.3 }}
                      >
                        {opt.desc}
                      </div>
                      {active && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            right: 8,
                            fontSize: 9,
                            fontStyle: "italic",
                            color: ruleRed,
                          }}
                        >
                          ✓ chosen
                        </div>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Collab/duel invite */}
        {state.showCollabInvite &&
          !(praxis.type === "duel" && state.duelSlotFull) && (
            <InviteBlock state={state} />
          )}

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 8, color: muted }}
          >
            Title{" "}
            <span
              style={{
                fontStyle: "italic",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              · what did you do?
            </span>
          </span>
          <input
            type="text"
            maxLength={200}
            value={state.title}
            onChange={(event) => state.setTitle(event.target.value)}
            placeholder="What did you do?"
            style={{
              width: "100%",
              fontFamily: "'Lora', serif",
              fontStyle: "italic",
              fontSize: 30,
              color: ink,
              background: "transparent",
              border: "none",
              outline: "none",
              borderBottom: `2px solid ${state.title ? accent : "rgba(80,60,20,.4)"}`,
              padding: "4px 0 8px",
            }}
          />
          <RainbowUnderline />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              alignItems: "baseline",
            }}
          >
            <TitleCounter length={state.title.length} color={muted} />
            <span className="eyebrow" style={{ color: muted, fontSize: 8 }}>
              {state.saveStatus === "saved"
                ? "autosaved"
                : state.saveStatus === "saving"
                  ? "saving..."
                  : "unsaved"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
            }}
          >
            <span className="eyebrow" style={{ color: muted }}>
              The proof{" "}
              <span
                style={{
                  fontStyle: "italic",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                · markdown ok · {state.wordCount} words
              </span>
            </span>
          </div>
          <textarea
            value={state.body}
            onChange={(event) => state.setBody(event.target.value)}
            rows={14}
            placeholder="Describe what you did..."
            style={{
              width: "100%",
              fontFamily: "'Special Elite', serif",
              fontSize: 14,
              lineHeight: "24px",
              color: ink,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "vertical",
              minHeight: 220,
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(80,120,180,.20) 24px)",
              padding: "0 0 0 4px",
            }}
          />
          {state.body.trim() && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px dashed rgba(80,60,20,.3)",
              }}
            >
              <span
                className="eyebrow"
                style={{ color: muted, display: "block", marginBottom: 6 }}
              >
                Preview
              </span>
              <MarkdownPreview
                source={state.body}
                className="markdown-preview"
                style={{
                  fontFamily: "'Lora', serif",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: ink,
                }}
              />
            </div>
          )}
        </div>

        {/* Existing media */}
        {state.media.length > 0 && (
          <ExistingMediaPolaroids state={state} muted={muted} />
        )}

        {/* New media */}
        <div style={{ marginBottom: 26 }}>
          <span
            className="eyebrow"
            style={{ display: "block", marginBottom: 14, color: muted }}
          >
            Pin to page{" "}
            <span
              style={{
                fontStyle: "italic",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              · {state.newFiles.length + state.media.length} item
              {state.newFiles.length + state.media.length === 1 ? "" : "s"}
            </span>
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              alignItems: "flex-start",
            }}
          >
            {state.newFiles.map((file, index) => (
              <Polaroid
                key={index}
                rotation={[-2.4, 1.8, -1.2, 2.6][index % 4]}
                caption={file.name}
                onRemove={() => state.removeNewFile(index)}
              >
                <MediaArt art={mediaArtKeysFromFile(file)} />
              </Polaroid>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: 152,
                height: 136,
                background: "transparent",
                border: "2px dashed rgba(80,60,20,.4)",
                fontFamily: "'Special Elite', serif",
                fontSize: 11,
                color: muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: 9,
                }}
              >
                pin photo / audio
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={state.handleFileChange}
              style={{ display: "none" }}
            />
          </div>
          {state.fileError && (
            <p
              style={{
                fontSize: 11,
                color: "var(--color-danger)",
                marginTop: 8,
              }}
            >
              {state.fileError}
            </p>
          )}
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <MetatasksBlock state={state} ink={ink} muted={muted} />
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginTop: 22,
            paddingTop: 22,
            borderTop: "1px dashed rgba(80,60,20,.3)",
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
                background: accent,
                color: "var(--color-text-on-accent)",
                fontFamily: "'Special Elite', serif",
                fontSize: 16,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "14px 32px",
                border: `3px solid ${accent}`,
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                transform: "rotate(-1.5deg)",
                boxShadow: "2px 3px 0 rgba(80,60,20,.2)",
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 4,
                  border: "1px dashed rgba(255,255,255,.35)",
                  pointerEvents: "none",
                }}
              />
              {state.submitting ? "publishing..." : "publish proof →"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void state.save()}
            disabled={
              state.saving || state.submitting || state.switchingMode !== null
            }
            style={{
              background: "transparent",
              color: ink,
              fontFamily: "'Special Elite', serif",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              border: `1.5px solid ${ink}`,
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
              label: "scrap it",
              color: ruleRed,
              fontFamily: "'Special Elite', serif",
              fontSize: 11,
              textDecoration: "underline",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface PolaroidProps {
  children: React.ReactNode;
  caption: string;
  rotation: number;
  onRemove: () => void;
}

function Polaroid({ children, caption, rotation, onRemove }: PolaroidProps) {
  return (
    <div
      style={{
        position: "relative",
        background: "#fffefa",
        padding: "8px 8px 28px",
        boxShadow: "2px 3px 6px rgba(80,60,20,.18)",
        transform: `rotate(${rotation}deg)`,
        border: "1px solid rgba(0,0,0,.06)",
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
          background: "rgba(220,170,90,.55)",
        }}
      />
      <div style={{ width: 132, height: 100, overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 8,
          right: 8,
          fontSize: 9,
          fontStyle: "italic",
          color: "#1a1209",
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
          background: "#fff",
          border: "1.5px solid #c44a3a",
          color: "#c44a3a",
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

function ExistingMediaPolaroids({
  state,
  muted,
}: {
  state: EditPraxisState;
  muted: string;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <span
        className="eyebrow"
        style={{ display: "block", marginBottom: 14, color: muted }}
      >
        Already pinned
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
        {state.media.map((item, index) => {
          const src = mediaUrl(item.file_path);
          const filename = item.file_path.split("/").pop() ?? item.file_path;
          return (
            <Polaroid
              key={item.id}
              rotation={[-1.4, 2.0, -2.6, 1.6][index % 4]}
              caption={filename}
              onRemove={() => void state.removeMedia(item)}
            >
              {item.type === "image" ? (
                <img
                  src={src}
                  alt=""
                  style={{ width: 132, height: 100, objectFit: "cover" }}
                />
              ) : item.type === "video" ? (
                <video
                  src={src}
                  style={{ width: 132, height: 100, objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: 132, height: 100 }}>
                  <MediaArt art={pickArtKey(filename, "audio")} />
                </div>
              )}
            </Polaroid>
          );
        })}
      </div>
    </div>
  );
}

function InviteBlock({ state }: { state: EditPraxisState }) {
  const muted = factionCssVar("analog", "card-muted");
  const ink = factionCssVar("analog", "card-text");
  const praxis = state.praxis!;
  return (
    <div
      style={{
        marginBottom: 26,
        padding: "14px 16px",
        background: "rgba(255,250,230,.7)",
        border: "1px dashed rgba(80,60,20,.35)",
      }}
    >
      <span
        className="eyebrow"
        style={{ color: muted, display: "block", marginBottom: 8 }}
      >
        {praxis.type === "duel"
          ? "Invite your opponent"
          : "Invite collaborators"}
      </span>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        {praxis.members
          .filter((m) => m.character_id !== state.currentCharacterId)
          .map((member) => (
            <span
              key={member.id}
              style={{
                background: "var(--color-success)",
                color: "var(--color-text-on-accent)",
                fontFamily: "'Special Elite', serif",
                fontSize: 11,
                padding: "2px 10px",
              }}
            >
              {member.character_display_name}
            </span>
          ))}
        {praxis.invites
          .filter((invite) => invite.status === "pending")
          .map((invite) => (
            <span
              key={invite.id}
              style={{
                background: "transparent",
                border: "1px dashed rgba(80,60,20,.4)",
                fontFamily: "'Special Elite', serif",
                fontSize: 11,
                padding: "2px 10px",
              }}
            >
              {invite.invitee_display_name}{" "}
              <span style={{ fontStyle: "italic" }}>· pending</span>
            </span>
          ))}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={state.inviteQuery}
          onChange={(event) => state.setInviteQuery(event.target.value)}
          placeholder="search by name or @handle"
          style={{
            width: "100%",
            fontFamily: "'Special Elite', serif",
            fontSize: 13,
            padding: "8px 12px",
            background: "#fff8e3",
            color: ink,
            border: "1.5px dashed rgba(80,60,20,.4)",
            outline: "none",
          }}
          onFocus={() => {
            if (state.inviteResults.length > 0) state.setInviteOpen(true);
          }}
          onBlur={() => setTimeout(() => state.setInviteOpen(false), 200)}
        />
        {state.inviteOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 10,
              background: "#fffefa",
              border: "1px solid rgba(80,60,20,.3)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {state.inviteResults.map((character) => (
              <button
                key={character.id}
                type="button"
                disabled={state.inviting}
                onMouseDown={() => void state.sendInvite(character)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: state.inviting ? "wait" : "pointer",
                  textAlign: "left",
                  fontFamily: "'Special Elite', serif",
                  fontSize: 12,
                  color: ink,
                }}
              >
                {character.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetatasksBlock({
  state,
  ink,
  muted,
}: {
  state: EditPraxisState;
  ink: string;
  muted: string;
}) {
  return (
    <div
      style={{
        marginBottom: 26,
        padding: "14px 16px",
        background: "rgba(255,250,230,.6)",
        border: "1px solid rgba(80,60,20,.18)",
        position: "relative",
      }}
    >
      <span
        className="eyebrow"
        style={{
          position: "absolute",
          top: -10,
          left: 16,
          background: factionCssVar("analog", "card-bg"),
          padding: "0 8px",
          color: muted,
        }}
      >
        ★ optional bonus
      </span>
      {state.metaTasks.map((mt) => {
        const selected = state.appliedMetatasks.has(mt.id);
        const busy = state.applyingMetatask === mt.id;
        return (
          <button
            key={mt.id}
            type="button"
            disabled={busy}
            onClick={() => void state.toggleMetatask(mt)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              padding: "10px 4px",
              background: "transparent",
              border: "none",
              cursor: busy ? "wait" : "pointer",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                flexShrink: 0,
                border: `2px solid ${ink}`,
                background: "#fff",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected && (
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <path
                    d="M3 12 L9 18 L20 4"
                    stroke="#c44a3a"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: ink }}>{mt.title}</div>
              {mt.description && (
                <div
                  style={{
                    fontSize: 10,
                    color: muted,
                    fontFamily: "'Lora', serif",
                    fontStyle: "italic",
                  }}
                >
                  {mt.description}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: selected ? "var(--color-success)" : muted,
                whiteSpace: "nowrap",
              }}
            >
              +{mt.point_value} pts
            </span>
          </button>
        );
      })}
    </div>
  );
}
