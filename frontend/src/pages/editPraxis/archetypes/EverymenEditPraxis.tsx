/**
 * The Everymen — Edit Praxis form.
 * The praxis-filing form takes the task's faction treatment; the Everymen
 * frame it as a union WORK REPORT filed at the hall: a stamped red masthead,
 * a job-reference slip, the crew (mode) selector, the job headline, the
 * report body, proof-of-work attachments, and a "STAMP & FILE" action bar.
 * Theme-aware through the --everymen* / --faction-everymen* token cascade.
 */
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import type { MediaItemOut } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ErrorBanner,
  TaskMetaInline,
  formatAutosave,
} from "./shared";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  InviteSearch,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const INK = "var(--everymen-ink)";
const RED = "var(--everymen-red)";
const GOLD = "var(--everymen-gold)";
const CREAM = "var(--everymen-cream)";
const PAPER = "var(--everymen-paper)";
const PAPER_TEXT = "var(--everymen-paper-text)";
const MUTED = "var(--everymen-muted)";
const OLIVE = "var(--everymen-olive)";
const ACCENT_FONT = "var(--faction-everymen-card-font)";
const BODY_FONT = "var(--font-body)";

const RED_GOLD_RULE =
  "repeating-linear-gradient(90deg, var(--everymen-red) 0 16px, var(--everymen-gold) 16px 26px)";

/** Union cog sigil. Inlined poster atom from the Everymen kit. */
function CogMark({
  size = 17,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block" }}
    >
      <g fill={color}>
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="11"
            y="0.5"
            width="2"
            height="5"
            rx="0.5"
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

/** Union stencil field label with a red/gold tape underline. */
function FieldLabel({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        marginBottom: 9,
      }}
    >
      <span
        style={{
          fontFamily: ACCENT_FONT,
          fontSize: 16,
          letterSpacing: "0.12em",
          color: RED,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {meta && (
        <span
          style={{
            fontFamily: BODY_FONT,
            fontSize: 9,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: MUTED,
            whiteSpace: "nowrap",
          }}
        >
          {meta}
        </span>
      )}
      <span
        aria-hidden
        style={{
          flex: 1,
          height: 2,
          background:
            "repeating-linear-gradient(90deg, var(--everymen-red) 0 12px, var(--everymen-gold) 12px 20px)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export default function EverymenEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const fileRef = useRef<HTMLInputElement>(null);
  const praxis = state.praxis!;
  const task = state.task;

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const modeOptions: Array<{ key: PraxisType; name: string; sub: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    name: t(`editPraxis.everymen.mode.${key}.label`),
    sub: t(`editPraxis.everymen.mode.${key}.desc`),
  }));
  const reportNo = String(praxis.id).padStart(4, "0");
  const totalProof = state.media.length;

  return (
    <div
      style={
        {
          fontFamily: BODY_FONT,
          color: PAPER_TEXT,
          background: "var(--everymen-paper-deep)",
          minHeight: "100vh",
          padding: "32px 24px 56px",
        } as React.CSSProperties
      }
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={MUTED}
        />

        {/* Masthead ribbon */}
        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: RED,
            color: CREAM,
            padding: "8px 18px 8px 16px",
            boxShadow: `5px 5px 0 ${INK}`,
          }}
        >
          <CogMark size={17} color={CREAM} />
          <span
            style={{
              fontFamily: ACCENT_FONT,
              fontSize: 18,
              letterSpacing: "0.16em",
              whiteSpace: "nowrap",
            }}
          >
            {t("editPraxis.everymen.masthead", { number: reportNo })}
          </span>
        </div>

        {/* Big title */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            margin: "16px 0 4px",
          }}
        >
          <div
            style={{
              fontFamily: ACCENT_FONT,
              fontSize: 58,
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              color: PAPER_TEXT,
            }}
          >
            {t("editPraxis.everymen.pageTitle")}
          </div>
          <div
            style={{
              textAlign: "right",
              fontFamily: BODY_FONT,
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
              lineHeight: 1.4,
              paddingBottom: 6,
            }}
          >
            <div>
              {state.saveStatus === "saving"
                ? t("editPraxis.everymen.savingStatus")
                : ""}
            </div>
            <div>
              {state.autosaveAt
                ? t("editPraxis.everymen.autosaveSaved", {
                    ago: formatAutosave(state.autosaveAt),
                  })
                : t("editPraxis.everymen.autosaveUnsaved")}
            </div>
          </div>
        </div>
        <div
          style={{
            height: 4,
            width: 180,
            background: RED_GOLD_RULE,
            marginBottom: 24,
          }}
        />

        {/* Job reference slip */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            border: `1.5px solid ${INK}`,
            background: PAPER,
            marginBottom: 30,
            display: "flex",
          }}
        >
          <div
            style={{
              width: 8,
              background: RED,
              flexShrink: 0,
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 13px, color-mix(in srgb, var(--everymen-cream) 55%, transparent) 13px 15px)",
            }}
          />
          <div style={{ flex: 1, padding: "15px 18px" }}>
            <div
              style={{
                fontFamily: BODY_FONT,
                fontSize: 8.5,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 4,
              }}
            >
              {t("editPraxis.everymen.taskRefLabel")}
            </div>
            <div
              style={{
                fontFamily: ACCENT_FONT,
                fontSize: 30,
                lineHeight: 0.96,
                color: PAPER_TEXT,
                marginBottom: 8,
              }}
            >
              {praxis.task_title}
            </div>
            {task?.description && (
              <div style={{ fontFamily: ACCENT_FONT, fontSize: 13, lineHeight: 1.5, color: MUTED, marginBottom: 8 }}>
                {task.description}
              </div>
            )}
            <TaskMetaInline praxis={praxis} task={task} textColor={RED} />
          </div>
        </div>

        {/* The crew (mode selector) */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 28 }}>
            <FieldLabel>{t("editPraxis.everymen.modeLabel")}</FieldLabel>
            <ModePicker
              state={state}
              skin={{
                containerStyle: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
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
                      position: "relative",
                      cursor: disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      padding: "13px 15px",
                      background: active ? RED : PAPER,
                      color: active ? CREAM : PAPER_TEXT,
                      border: `2px solid ${INK}`,
                      fontFamily: BODY_FONT,
                      boxShadow: active ? `4px 4px 0 ${INK}` : "none",
                      transform: active ? "translate(-1px,-1px)" : "none",
                      transition: "all 110ms",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: ACCENT_FONT,
                        fontSize: 24,
                        lineHeight: 1,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {opt.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        letterSpacing: "0.04em",
                        marginTop: 3,
                        opacity: active ? 0.9 : 0.7,
                      }}
                    >
                      {opt.sub}
                    </div>
                    {active && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 9,
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: GOLD,
                          boxShadow: `0 0 0 2px ${INK}`,
                        }}
                      />
                    )}
                  </button>
                ),
              }}
            />
          </div>
        )}

        {/* Collab invite / duel challenge */}
        {state.showInviteBox && <InviteBlock state={state} />}

        {/* The job (headline) */}
        <div style={{ marginBottom: 28 }}>
          <FieldLabel
            meta={t("editPraxis.everymen.titleMeta", {
              length: state.title.length,
            })}
          >
            {t("editPraxis.everymen.titleLabel")}
          </FieldLabel>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.everymen.titlePlaceholder"),
              inputStyle: {
                width: "100%",
                border: "none",
                borderBottom: `2px solid ${INK}`,
                background: "transparent",
                fontFamily: ACCENT_FONT,
                fontSize: 26,
                letterSpacing: "0.01em",
                color: PAPER_TEXT,
                padding: "4px 2px 8px",
                outline: "none",
              },
            }}
          />
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: 9,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
              marginTop: 6,
            }}
          >
            {state.saveStatus === "saved"
              ? t("editPraxis.everymen.saveState.saved")
              : state.saveStatus === "saving"
                ? t("editPraxis.everymen.saveState.saving")
                : t("editPraxis.everymen.saveState.idle")}
          </div>
        </div>

        {/* The report (body) */}
        <div style={{ marginBottom: 28 }}>
          <FieldLabel
            meta={t("editPraxis.everymen.bodyMeta", {
              words: state.wordCount,
            })}
          >
            {t("editPraxis.everymen.bodyLabel")}
          </FieldLabel>
          <BodyTextarea
            state={state}
            skin={{
              rows: 9,
              placeholder: t("editPraxis.everymen.bodyPlaceholder"),
              textareaStyle: {
                width: "100%",
                resize: "vertical",
                border: `1.5px solid ${INK}`,
                background: PAPER,
                fontFamily: BODY_FONT,
                fontSize: 13,
                lineHeight: 1.6,
                color: PAPER_TEXT,
                padding: "13px 15px",
                outline: "none",
                minHeight: 200,
              },
            }}
          />
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                marginTop: 14,
                borderLeft: `4px solid ${RED}`,
                paddingLeft: 14,
              },
              label: (
                <div
                  style={{
                    fontFamily: BODY_FONT,
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: MUTED,
                    marginBottom: 6,
                  }}
                >
                  {t("editPraxis.everymen.previewLabel")}
                </div>
              ),
              markdownStyle: {
                fontFamily: BODY_FONT,
                fontSize: 13,
                lineHeight: 1.6,
                color: PAPER_TEXT,
              },
            }}
          />
        </div>

        {/* Already pinned proof */}
        {state.media.length > 0 && (
          <ExistingProof state={state} />
        )}

        {/* Proof of work */}
        <div style={{ marginBottom: 30 }}>
          <FieldLabel
            meta={t("editPraxis.everymen.filesMeta", { pinned: totalProof })}
          >
            {t("editPraxis.everymen.filesLabel")}
          </FieldLabel>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                border: `2px dashed ${INK}`,
                background: "transparent",
                color: PAPER_TEXT,
                fontFamily: BODY_FONT,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "11px 18px",
              }}
            >
              <span
                style={{
                  fontFamily: ACCENT_FONT,
                  fontSize: 18,
                  color: RED,
                  lineHeight: 0.6,
                }}
              >
                +
              </span>{" "}
              {t("editPraxis.everymen.fileButton")}
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
                marginTop: 9,
              }}
            >
              {state.fileError}
            </p>
          )}
        </div>

        {/* Metatasks */}
        {state.showMetatasks && <MetatasksBlock state={state} />}

        <ErrorBanner message={state.error} />

        {/* File bar */}
        <div
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--everymen-paper-text) 22%, transparent)",
            paddingTop: 22,
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <PublishButton
            state={state}
            skin={{
              idleLabel: t("editPraxis.everymen.publishIdle"),
              busyLabel: t("editPraxis.everymen.publishBusy"),
              style: {
                cursor: state.submitting ? "wait" : "pointer",
                border: `2px solid ${INK}`,
                background: state.submitting ? OLIVE : RED,
                color: CREAM,
                fontFamily: ACCENT_FONT,
                fontSize: 26,
                letterSpacing: "0.1em",
                padding: "12px 30px",
                whiteSpace: "nowrap",
                boxShadow: `5px 5px 0 ${INK}`,
                transition: "background 150ms",
              },
            }}
          />
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.everymen.dropLabel"),
              style: {
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                color: MUTED,
                fontFamily: BODY_FONT,
                fontSize: 11,
                fontStyle: "italic",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ProofSlipProps {
  children: React.ReactNode;
  caption: string;
  onRemove: () => void;
}

/** A stamped proof slip — the Everymen take on a pinned attachment. */
function ProofSlip({ children, caption, onRemove }: ProofSlipProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        width: 152,
        background: PAPER,
        border: `1.5px solid ${INK}`,
        boxShadow: `3px 3px 0 ${INK}`,
        padding: 6,
      }}
    >
      <div style={{ width: "100%", height: 100, overflow: "hidden" }}>
        {children}
      </div>
      <div
        style={{
          fontFamily: BODY_FONT,
          fontSize: 9,
          letterSpacing: "0.04em",
          color: PAPER_TEXT,
          marginTop: 6,
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
          background: RED,
          border: `2px solid ${INK}`,
          color: CREAM,
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

function ExistingProof({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  return (
    <div style={{ marginBottom: 28 }}>
      <FieldLabel>{t("editPraxis.everymen.onFileLabel")}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {state.media.map((item: MediaItemOut) => {
          const src = mediaUrl(item.file_path);
          const filename =
            item.file_path.split("/").pop() ?? item.file_path;
          return (
            <ProofSlip
              key={item.id}
              caption={filename}
              onRemove={() => void state.removeMedia(item)}
            >
              {item.type === "image" ? (
                <img
                  src={src}
                  alt=""
                  style={{ width: "100%", height: 100, objectFit: "cover" }}
                />
              ) : item.type === "video" ? (
                <video
                  src={src}
                  style={{ width: "100%", height: 100, objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: 100 }}>
                  <MediaArt art={pickArtKey(filename, "audio")} />
                </div>
              )}
            </ProofSlip>
          );
        })}
      </div>
    </div>
  );
}

function InviteBlock({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  // Delegates to the shared InviteSearch so collab-invite and duel-challenge (#311)
  // behaviour stay identical across archetypes; the crew-frame chrome stays bespoke.
  return (
    <div
      style={{
        marginBottom: 28,
        padding: "14px 16px",
        background: PAPER,
        border: `1.5px dashed ${INK}`,
      }}
    >
      <FieldLabel>
        {state.duelMode
          ? t("editPraxis.everymen.inviteLabelDuel")
          : t("editPraxis.everymen.inviteLabel")}
      </FieldLabel>
      <InviteSearch
        state={state}
        skin={{
          fontFamily: BODY_FONT,
          inputBg: CREAM,
          inputColor: INK,
          inputBorder: `1.5px solid ${INK}`,
          dropdownBg: PAPER,
          dropdownBorder: `1.5px solid ${INK}`,
          acceptedBg: OLIVE,
          acceptedColor: CREAM,
          pendingColor: PAPER_TEXT,
          placeholder: t("editPraxis.everymen.invitePlaceholder"),
        }}
      />
    </div>
  );
}

function MetatasksBlock({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        marginBottom: 28,
        padding: "16px",
        background: PAPER,
        border: `1.5px solid ${INK}`,
      }}
    >
      <FieldLabel meta={t("editPraxis.everymen.metatasksMeta")}>
        {t("editPraxis.everymen.metatasksLabel")}
      </FieldLabel>
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
                border: `2px solid ${INK}`,
                background: selected ? RED : CREAM,
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected && (
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
                  <path
                    d="M3 12 L9 18 L20 4"
                    stroke={CREAM}
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontSize: 14, color: PAPER_TEXT, fontWeight: 700 }}
              >
                {mt.title}
              </div>
              {mt.description && (
                <div
                  style={{
                    fontSize: 11,
                    color: MUTED,
                    fontStyle: "italic",
                  }}
                >
                  {mt.description}
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: ACCENT_FONT,
                fontSize: 15,
                color: selected ? OLIVE : RED,
                whiteSpace: "nowrap",
              }}
            >
              {t("editPraxis.everymen.metatasksPoints", {
                points: mt.point_value,
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
