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
  MetatasksList,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
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
          padding: "10px 16px",
          borderBottom: `1px solid ${accent}`,
          background: "linear-gradient(to bottom, #0a1f2e, #050f1c)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
              fontSize: 10,
              color: dim,
              marginLeft: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            singularity://praxis/draft.md · session 0x{praxis.id.toString(16)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10, color: dim }}>
          <span style={{ color: term }}>{cursorOn ? "●" : "○"} REC</span>
        </div>
      </div>

      <div
        style={{
          padding: "20px 26px 28px",
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
        <div style={{ marginBottom: 16, fontSize: 11, lineHeight: 1.7 }}>
          <div style={{ color: dim }}>$ wz auth --whoami</div>
          <div style={{ color: term }}>
            &gt; @{praxis.created_by_display_name} · faction:singularity
          </div>
          <div style={{ color: dim }}>
            $ wz praxis edit ./draft-{praxis.id}.md --live --rainbow=on
          </div>
        </div>

        {/* Task block */}
        <div style={{ marginBottom: 22, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: -8,
              left: 12,
              background: bg,
              padding: "0 8px",
              fontSize: 9,
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
              padding: "14px 16px",
              background: "rgba(37,99,235,.05)",
            }}
          >
            <div style={{ fontSize: 13, color: term, lineHeight: 1.4 }}>
              <span style={{ color: dim }}>&gt; </span>
              {praxis.task_title}
            </div>
            {task?.description && (
              <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap" }}>
                <span style={{ color: accent }}># </span>
                {task.description}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 14,
                marginTop: 10,
                fontSize: 10,
                color: dim,
                flexWrap: "wrap",
              }}
            >
              <span>
                <span style={{ color: accent }}>FACTION:</span> singularity
              </span>
              {task && (
                <span>
                  <span style={{ color: accent }}>PTS:</span> {task.point_value}
                </span>
              )}
              {task && (
                <span>
                  <span style={{ color: accent }}>LVL:</span>{" "}
                  {task.level_required}
                </span>
              )}
              <span>
                <span style={{ color: accent }}>MODE:</span> {praxis.type}
              </span>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: dim, marginBottom: 10 }}>
              <span style={{ color: term }}>$ </span>wz praxis set-mode --select
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
                      padding: "10px 12px",
                      fontFamily: "'Share Tech Mono', monospace",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      {active && "["}
                      {opt.flag}
                      {active && "]"}
                    </div>
                    <div style={{ fontSize: 9, opacity: active ? 0.85 : 0.6 }}>
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
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 8 }}>
                <span style={{ color: term }}>$ </span>wz praxis invite
                [...handles]
              </div>
              <div
                style={{
                  border: `1px dashed ${accent}`,
                  padding: "10px 12px",
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

        {/* Title */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: dim, marginBottom: 6 }}>
            <span style={{ color: term }}>$ </span>echo "title" &gt;&gt;
            ./draft.md ·{" "}
            <TitleCounter length={state.title.length} color={dim} />
          </div>
          <div
            style={{
              position: "relative",
              borderBottom: `1px solid ${state.title ? term : accent}`,
              paddingBottom: 6,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 4,
                color: dim,
                fontSize: 18,
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
                  paddingLeft: 22,
                  fontFamily: "'Lora', serif",
                  fontStyle: "italic",
                  fontSize: 26,
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
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 10, color: dim }}>
              <span style={{ color: term }}>$ </span>vim ./draft.md ·{" "}
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
                padding: "12px 8px",
                borderRight: `1px solid ${accent}`,
                fontSize: 11,
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
              style={{ flex: 1, padding: "12px 14px", position: "relative" }}
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
                    fontSize: 12,
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
                    fontSize: 12,
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
              padding: "3px 12px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            <span>-- INSERT --</span>
            <span>
              {state.wordCount} W · {state.body.length} CH · UTF-8
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
                marginTop: 14,
                border: `1px solid ${accent}`,
                padding: "14px 18px",
                background: "rgba(0,0,0,.5)",
              },
              label: (
                <div style={{ fontSize: 9, color: dim, marginBottom: 8 }}>
                  <span style={{ color: term }}>$ </span>render --markdown
                </div>
              ),
              markdownStyle: {
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 12,
                lineHeight: 1.7,
                color: term,
              },
            }}
          />
        </div>

        {/* Media */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: dim, marginBottom: 8 }}>
            <span style={{ color: term }}>$ </span>wz praxis attach ./media/*
          </div>
          <div
            style={{
              border: `1px dashed ${accent}`,
              padding: "14px 16px",
              background: "rgba(37,99,235,.04)",
            }}
          >
            {state.media.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: dim,
                  fontStyle: "italic",
                  marginBottom: 12,
                }}
              >
                {t("editPraxis.singularity.mediaEmpty")}
                <br />
                <span style={{ fontSize: 9 }}>
                  {t("editPraxis.singularity.mediaHelper")}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 10,
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
                        gap: 12,
                        padding: "6px 10px",
                        background: "rgba(74,222,128,.06)",
                        border: `1px solid ${accent}`,
                        fontSize: 11,
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
                          fontSize: 10,
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
                  fontSize: 10,
                  padding: "6px 14px",
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

        {/* Metatasks */}
        {state.showMetatasks && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, color: dim, marginBottom: 8 }}>
              <span style={{ color: term }}>$ </span>wz praxis apply-metatask
              --opt
            </div>
            <div
              style={{
                border: `1px dashed ${accent}`,
                padding: "8px 10px",
              }}
            >
              <MetatasksList
                state={state}
                skin={{
                  rowStyle: (selected) => ({
                    padding: "8px 6px",
                    background: selected
                      ? "rgba(74,222,128,.08)"
                      : "transparent",
                    border: `1px solid ${selected ? term : "transparent"}`,
                    color: term,
                    fontFamily: "'Share Tech Mono', monospace",
                    marginBottom: 4,
                  }),
                  titleColor: term,
                  descColor: dim,
                  pointsActiveColor: term,
                  pointsIdleColor: dim,
                }}
              />
            </div>
          </div>
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div
          style={{
            borderTop: `1px solid ${accent}`,
            paddingTop: 18,
            paddingBottom: 22,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "12px 22px",
                border: `2px solid ${term}`,
                cursor: state.submitting ? "wait" : "pointer",
                textTransform: "uppercase",
                position: "relative",
              },
            }}
          />
          <div style={{ flex: 1 }} />
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.singularity.dropLabel"),
              style: {
                background: "transparent",
                color: dim,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
