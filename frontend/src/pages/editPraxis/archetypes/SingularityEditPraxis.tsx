/**
 * Terminal Draft — Singularity faction.
 * vim-styled editor on near-black, scanline overlay, blinking cursor.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { factionCssVar } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import { Breadcrumb, ErrorBanner, TitleCounter, formatClock } from "./shared";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import { MetataskSealStack } from "../MetataskSealStack";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

export default function SingularityEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;

  const modeOptions: Array<{ key: PraxisType; flag: string; desc: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    flag: t(`editPraxis.singularity.mode.${key}.label`),
    desc: t(`editPraxis.singularity.mode.${key}.desc`),
  }));

  // Singularity-specific tokens; these CSS vars resolve to terminal-green/black.
  const term = factionCssVar("singularity", "card-text"); // #4ade80 in both modes
  const dim = factionCssVar("singularity", "card-muted");
  const bg = factionCssVar("singularity", "card-bg"); // black in both modes
  const accent = factionCssVar("singularity");

  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setCursorOn((c) => !c), 600);
    return () => clearInterval(id);
  }, []);

  const lineCount = useMemo(() => state.body.split("\n").length, [state.body]);

  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  return (
    <div
      style={{
        background: bg,
        color: term,
        fontFamily: "'Share Tech Mono', monospace",
        position: "relative",
        minHeight: "100vh",
        boxShadow: `0 0 0 1px ${accent}, 0 0 80px rgba(37,99,235,.2) inset`,
      }}
    >
      {/* Scanlines overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(74,222,128,.05) 2px, rgba(74,222,128,.05) 3px)",
          zIndex: 1,
        }}
      />

      {/* Window chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-sm) var(--space-lg)",
          borderBottom: `1px solid ${accent}`,
          background: "linear-gradient(to bottom, #0a1f2e, #050f1c)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 7,
                background: bg,
                border: `1px solid ${accent}`,
              }}
            />
          ))}
          <span
            style={{
              fontSize: "var(--text-base)",
              color: dim,
              marginLeft: "var(--space-md)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {t("editPraxis.singularity.terminal.sessionPath", { session: praxis.id.toString(16) })}
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--space-md)", fontSize: "var(--text-base)", color: dim }}>
          <span style={{ color: term }}>{cursorOn ? "●" : "○"} REC</span>
        </div>
      </div>

      <div
        style={{
          padding: "var(--space-lg) var(--space-xl) var(--space-xl)",
          position: "relative",
          zIndex: 2,
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={dim}
        />

        {/* Boot lines */}
        <div style={{ marginBottom: "var(--space-lg)", fontSize: "var(--text-md)", lineHeight: 1.7 }}>
          <div style={{ color: dim }}>{t("editPraxis.singularity.terminal.whoami")}</div>
          <div style={{ color: term }}>
            {t("editPraxis.singularity.terminal.whoamiResult", { name: praxis.created_by_display_name })}
          </div>
          <div style={{ color: dim }}>
            {t("editPraxis.singularity.terminal.editCommand", { id: praxis.id })}
          </div>
        </div>

        {/* Task block */}
        <div style={{ marginBottom: "var(--space-xl)", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: -8,
              left: 12,
              background: bg,
              padding: "0 var(--space-sm)",
              fontSize: "var(--text-sm)",
              color: accent,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {t("editPraxis.singularity.taskRefLabel")}
          </span>
          <div
            style={{
              border: `1px solid ${accent}`,
              padding: "var(--space-md) var(--space-lg)",
              background: "rgba(37,99,235,.05)",
            }}
          >
            <div style={{ fontSize: "var(--text-content)", color: term, lineHeight: 1.4 }}>
              <span style={{ color: dim }}>&gt; </span>
              {praxis.task_title}
            </div>
            {task?.description && (
              <div style={{ fontSize: "var(--text-content)", color: dim, lineHeight: 1.5, marginTop: "var(--space-xs)", whiteSpace: "pre-wrap" }}>
                <span style={{ color: accent }}># </span>
                {task.description}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "var(--space-md)",
                marginTop: "var(--space-sm)",
                fontSize: "var(--text-base)",
                color: dim,
                flexWrap: "wrap",
              }}
            >
              <span>
                <span style={{ color: accent }}>{t("editPraxis.singularity.terminal.factionLabel")}</span> {t("editPraxis.singularity.terminal.factionValue")}
              </span>
              {task && (
                <span>
                  <span style={{ color: accent }}>{t("editPraxis.singularity.terminal.ptsLabel")}</span> {task.point_value}
                </span>
              )}
              {task && (
                <span>
                  <span style={{ color: accent }}>{t("editPraxis.singularity.terminal.lvlLabel")}</span>{" "}
                  {task.level_required}
                </span>
              )}
              <span>
                <span style={{ color: accent }}>{t("editPraxis.singularity.terminal.modeLabel")}</span> {praxis.type}
              </span>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <div style={{ fontSize: "var(--text-base)", color: dim, marginBottom: "var(--space-sm)" }}>
              <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.setModeCommand")}
            </div>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "flex", gap: 0 },
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
                      flex: 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      background: active ? term : "transparent",
                      color: active ? bg : term,
                      border: `1px solid ${active ? term : accent}`,
                      borderRight: "none",
                      padding: "var(--space-sm) var(--space-md)",
                      fontFamily: "'Share Tech Mono', monospace",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "var(--text-lg)",
                        fontWeight: 700,
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {active && "["}
                      {opt.flag}
                      {active && "]"}
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", opacity: active ? 0.85 : 0.6 }}>
                      {opt.desc}
                    </div>
                  </button>
                ),
              }}
            />
          </div>
        )}

        {/* Invite */}
        {state.showInviteBox && (
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <div style={{ fontSize: "var(--text-base)", color: dim, marginBottom: "var(--space-sm)" }}>
                <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.inviteCommand")}
              </div>
              <div
                style={{
                  border: `1px dashed ${accent}`,
                  padding: "var(--space-sm) var(--space-md)",
                  background: "rgba(37,99,235,.04)",
                }}
              >
                <InviteSearch
                  state={state}
                  skin={{
                    fontFamily: "'Share Tech Mono', monospace",
                    inputBg: "transparent",
                    inputColor: term,
                    inputBorder: `1px dashed ${accent}`,
                    dropdownBg: bg,
                    dropdownBorder: `1px solid ${accent}`,
                    acceptedBg: "rgba(74,222,128,.15)",
                    acceptedColor: term,
                    pendingBg: "transparent",
                    pendingColor: dim,
                    placeholder: t("editPraxis.singularity.invitePlaceholder"),
                  }}
                />
              </div>
            </div>
          )}

        {/* Metatasks */}
        {state.showSealStack && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <div style={{ fontSize: "var(--text-base)", color: dim, marginBottom: "var(--space-sm)" }}>
              <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.metataskCommand")}
            </div>
            <div
              style={{
                border: `1px dashed ${accent}`,
                padding: "var(--space-sm)",
              }}
            >
              <MetataskSealStack state={state} />
            </div>
          </div>
        )}

        {/* Title */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ fontSize: "var(--text-base)", color: dim, marginBottom: "var(--space-xs)" }}>
            <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.titleCommand")}{" "}
            <TitleCounter length={state.title.length} color={dim} />
          </div>
          <div
            style={{
              position: "relative",
              borderBottom: `1px solid ${state.title ? term : accent}`,
              paddingBottom: "var(--space-xs)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 4,
                color: dim,
                fontSize: "var(--text-content)",
              }}
            >
              #{" "}
            </span>
            <TitleField
              state={state}
              skin={{
                placeholder: t("editPraxis.singularity.titlePlaceholder"),
                inputStyle: {
                  width: "100%",
                  paddingLeft: "var(--space-xl)",
                  fontFamily: "'Lora', serif",
                  fontStyle: "italic",
                  color: term,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                },
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "var(--space-xs)",
            }}
          >
            <div style={{ fontSize: "var(--text-base)", color: dim }}>
              <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.bodyCommand")}{" "}
              <span style={{ color: dim }}>
                {t("editPraxis.singularity.bodyMeta", {
                  words: state.wordCount,
                  lines: lineCount,
                })}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              border: `1px solid ${accent}`,
              background: "rgba(0,0,0,.4)",
              minHeight: 240,
            }}
          >
            {/* Line numbers */}
            <div
              aria-hidden
              style={{
                background: "rgba(37,99,235,.08)",
                padding: "var(--space-md) var(--space-sm)",
                borderRight: `1px solid ${accent}`,
                fontSize: "var(--text-md)",
                color: dim,
                lineHeight: 1.7,
                textAlign: "right",
                minWidth: 36,
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {Array.from({ length: Math.max(12, lineCount) }).map((_, i) => (
                <div key={i}>{String(i + 1).padStart(2, " ")}</div>
              ))}
            </div>
            <div
              style={{ flex: 1, padding: "var(--space-md)", position: "relative" }}
            >
              <BodyTextarea
                state={state}
                skin={{
                  rows: 12,
                  placeholder: t("editPraxis.singularity.bodyPlaceholder"),
                  textareaStyle: {
                    width: "100%",
                    height: "100%",
                    minHeight: 220,
                    fontFamily: "'Share Tech Mono', monospace",
                    lineHeight: 1.7,
                    color: term,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                  },
                }}
              />
              {!state.body && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 14,
                    fontSize: "var(--text-lg)",
                    color: dim,
                    fontStyle: "italic",
                    pointerEvents: "none",
                  }}
                >
                  --INSERT-- {cursorOn ? "▊" : " "}
                </div>
              )}
            </div>
          </div>
          {/* status bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: accent,
              color: bg,
              padding: "var(--space-xs) var(--space-md)",
              fontSize: "var(--text-base)",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            <span>{t("editPraxis.singularity.terminal.insertMode")}</span>
            <span>
              {t("editPraxis.singularity.terminal.statusLine", { words: state.wordCount, chars: state.body.length })}
            </span>
            <span>
              {state.saveStatus === "saving"
                ? t("editPraxis.singularity.saveState.saving")
                : state.autosaveAt
                  ? t("editPraxis.singularity.saveState.saved", {
                      time: formatClock(state.autosaveAt),
                    })
                  : t("editPraxis.singularity.saveState.unsaved")}
            </span>
          </div>
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                marginTop: "var(--space-md)",
                border: `1px solid ${accent}`,
                padding: "var(--space-md) var(--space-lg)",
                background: "rgba(0,0,0,.5)",
              },
              label: (
                <div style={{ fontSize: "var(--text-sm)", color: dim, marginBottom: "var(--space-sm)" }}>
                  <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.renderCommand")}
                </div>
              ),
              markdownStyle: {
                fontFamily: "'Share Tech Mono', monospace",
                lineHeight: 1.7,
                color: term,
              },
            }}
          />
        </div>

        {/* Media */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <div style={{ fontSize: "var(--text-base)", color: dim, marginBottom: "var(--space-sm)" }}>
            <span style={{ color: term }}>$ </span>{t("editPraxis.singularity.terminal.attachCommand")}
          </div>
          <div
            style={{
              border: `1px dashed ${accent}`,
              padding: "var(--space-md) var(--space-lg)",
              background: "rgba(37,99,235,.04)",
            }}
          >
            {state.media.length === 0 ? (
              <div
                style={{
                  fontSize: "var(--text-md)",
                  color: dim,
                  fontStyle: "italic",
                  marginBottom: "var(--space-md)",
                }}
              >
                {t("editPraxis.singularity.mediaEmpty")}
                <br />
                <span style={{ fontSize: "var(--text-sm)" }}>
                  {t("editPraxis.singularity.mediaHelper")}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-xs)",
                  marginBottom: "var(--space-sm)",
                }}
              >
                {state.media.map((item) => {
                  const filename =
                    item.file_path.split("/").pop() ?? item.file_path;
                  const src = mediaUrl(item.file_path);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-md)",
                        padding: "var(--space-xs) var(--space-sm)",
                        background: "rgba(74,222,128,.06)",
                        border: `1px solid ${accent}`,
                        fontSize: "var(--text-md)",
                        color: term,
                      }}
                    >
                      <span style={{ color: accent }}>[{item.type}]</span>
                      <a
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        style={{ flex: 1, color: term, textDecoration: "none" }}
                      >
                        {filename}
                      </a>
                      <button
                        type="button"
                        onClick={() => void state.removeMedia(item)}
                        style={{
                          background: "transparent",
                          color: "#f87171",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "var(--text-base)",
                        }}
                      >
                        {t("editPraxis.singularity.removeButton")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <FilePicker
              state={state}
              skin={{
                buttonStyle: {
                  background: "transparent",
                  color: term,
                  border: `1px solid ${term}`,
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "var(--text-base)",
                  padding: "var(--space-xs) var(--space-md)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                },
                buttonLabel: t("editPraxis.singularity.fileButton"),
                errorColor: "#f87171",
              }}
            />
          </div>
        </div>

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div
          style={{
            borderTop: `1px solid ${accent}`,
            paddingTop: "var(--space-lg)",
            paddingBottom: "var(--space-xl)",
            display: "flex",
            gap: "var(--space-sm)",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.singularity.dropLabel"),
              style: {
                background: "transparent",
                color: dim,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "var(--text-sm)",
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
              idleLabel: t("editPraxis.singularity.publishIdle"),
              busyLabel: t("editPraxis.singularity.publishBusy"),
              ornament: (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 3,
                    border: "1px dashed rgba(0,0,0,.3)",
                    pointerEvents: "none",
                  }}
                />
              ),
              style: {
                background: term,
                color: bg,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "var(--space-md) var(--space-xl)",
                border: `2px solid ${term}`,
                cursor: state.submitting ? "wait" : "pointer",
                textTransform: "uppercase",
                position: "relative",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
