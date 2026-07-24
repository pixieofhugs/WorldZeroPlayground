/**
 * Cozy Coven MOBILE composer (#498 pilot) — the scrapbook `.exe` window idiom
 * on a phone. (The `wow-treatment` name below is the pre-#784 label for this
 * pink identity, not the `wow` slug — ADR-0050.)
 *
 * Same single-column composer as the Default mobile skin (Write/Preview toggle,
 * fluid media grid, sticky submit bar) dressed in the pink window chrome:
 * dotted board, notepad panels, sparkle-titled bars.
 * Ported from the Field Kit `wow-treatment` composer; grounds on the
 * `--faction-coven-*` tokens already in index.css (the set CovenFieldDesk /
 * CovenEditPraxis desktop use). Consumes `useEditPraxis` verbatim — no editor,
 * upload, or submit logic lives here. Presentation-only.
 */
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import { ErrorBanner, formatAutosave } from "../archetypes/shared";
import {
  BodyPreview,
  BodyTextarea,
  DropButton,
  FilePicker,
  InviteSearch,
  PublishButton,
  TitleField,
} from "../archetypes/controls";
import { MetataskSealStack } from "../MetataskSealStack";
import type { EditPraxisState } from "../useEditPraxis";
import { MobileStickyBar, SegToggle, type ComposerTab } from "./shared";

const PINK = "var(--faction-coven)";
const PINK_DEEP = "var(--faction-coven-card-accent)";
const TITLE_TEXT = "var(--faction-coven-title-text)";
const CARD_TEXT = "var(--faction-coven-card-text)";
const CARD_MUTED = "var(--faction-coven-card-muted)";
const WIN_BORDER = "var(--faction-coven-win-border)";
const NOTEPAD_BG = "var(--faction-coven-notepad-bg)";
const NOTEPAD_BORDER = "var(--faction-coven-notepad-border)";
const BODY_BG = "var(--faction-coven-body-bg)";
const DOT = "var(--faction-coven-dot)";
const SCRIPT = "var(--faction-coven-card-font)";
const BODY = "var(--font-body)";
const ON_ACCENT = "var(--color-text-on-accent)";

function Sparkle({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  );
}

const eyebrow: CSSProperties = {
  display: "block",
  fontFamily: BODY,
  fontSize: "var(--text-sm)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: PINK_DEEP,
};

/** A pink window: sparkle title bar + dotted board wrapping an inner notepad. */
function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 8px 22px color-mix(in srgb, ${PINK} 22%, transparent)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          background:
            "linear-gradient(180deg, var(--faction-coven-title-from), var(--faction-coven-title-to))",
          borderBottom: `2px solid ${WIN_BORDER}`,
        }}
      >
        {[
          "var(--faction-coven-scrap-deep)",
          "var(--faction-coven-tape)",
          "var(--faction-coven-ivy-leaf)",
        ].map((color) => (
          <span
            key={color}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: color,
              border: "1.2px solid rgba(255,255,255,0.7)",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontFamily: SCRIPT,
            fontSize: "var(--text-content)",
            color: TITLE_TEXT,
          }}
        >
          <Sparkle size={11} color={TITLE_TEXT} />
          {title}
        </span>
      </div>
      <div
        style={{
          padding: "var(--space-md)",
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: "13px 13px",
        }}
      >
        <div
          style={{
            background: NOTEPAD_BG,
            border: `1.5px solid ${NOTEPAD_BORDER}`,
            borderRadius: 9,
            padding: "var(--space-md)",
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export default function CovenEditPraxis({ state }: { state: EditPraxisState }) {
  const { t } = useTranslation("forms");
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  return (
    <div
      data-skin="coven"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
        fontFamily: BODY,
        color: CARD_TEXT,
        background: BODY_BG,
        backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
        backgroundSize: "15px 15px",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <h1
            style={{
              fontFamily: SCRIPT,
              fontSize: "var(--text-heading)",
              lineHeight: 0.9,
              color: TITLE_TEXT,
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-sm)",
            }}
          >
            {t("editPraxis.coven.pageTitle")}
            <Sparkle size={16} color={PINK} />
          </h1>
          <span style={{ ...eyebrow, color: CARD_MUTED, marginLeft: "auto" }}>
            {state.autosaveAt
              ? t("editPraxis.coven.autosaveSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.coven.autosaveUnsaved")}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: {
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              background: NOTEPAD_BG,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              borderRadius: 999,
            },
            buttonStyle: (active) => ({
              padding: "var(--space-sm)",
              borderRadius: 999,
              border: active ? `1.5px solid ${PINK_DEEP}` : "1.5px solid transparent",
              fontFamily: BODY,
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              background: active
                ? `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`
                : "transparent",
              color: active ? ON_ACCENT : CARD_MUTED,
            }),
          }}
        />
      </header>

      {/* For-quest reference */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          background: NOTEPAD_BG,
          border: `1.5px solid ${NOTEPAD_BORDER}`,
          borderRadius: 12,
        }}
      >
        <span style={eyebrow}>{t("editPraxis.coven.taskRefLabel")}</span>
        <span
          style={{
            fontFamily: SCRIPT,
            fontSize: "var(--text-content)",
            color: TITLE_TEXT,
            textAlign: "right",
            flex: 1,
            lineHeight: 1.05,
          }}
        >
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...eyebrow, color: PINK_DEEP }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t("taskMeta.points", { points: task.point_value })}` : ""}
      </div>

      {tab === "write" ? (
        <>
          <Window title={t("editPraxis.coven.titleLabel")}>
            <TitleField
              state={state}
              skin={{
                placeholder: t("editPraxis.coven.titlePlaceholder"),
                inputStyle: {
                  width: "100%",
                  fontFamily: SCRIPT,
                  fontWeight: 700,
                  color: TITLE_TEXT,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  borderBottom: `2px solid ${NOTEPAD_BORDER}`,
                  padding: "var(--space-xs) 0 var(--space-sm)",
                },
              }}
            />
          </Window>

          <Window title={t("editPraxis.coven.bodyLabel", { words: state.wordCount })}>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t("editPraxis.coven.bodyPlaceholder"),
                textareaStyle: {
                  width: "100%",
                  fontFamily: BODY,
                  lineHeight: 1.55,
                  color: CARD_TEXT,
                  background: BODY_BG,
                  border: `1.5px solid ${NOTEPAD_BORDER}`,
                  borderRadius: 7,
                  padding: "var(--space-md) var(--space-lg)",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 180,
                },
              }}
            />
          </Window>

          {state.showInviteBox && (
            <Window
              title={
                state.duelMode
                  ? t("editPraxis.coven.inviteLabelDuel")
                  : t("editPraxis.coven.inviteLabel")
              }
            >
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: BODY,
                  inputBg: BODY_BG,
                  inputColor: CARD_TEXT,
                  inputBorder: `1.5px solid ${NOTEPAD_BORDER}`,
                  acceptedBg: PINK,
                  acceptedColor: ON_ACCENT,
                  placeholder: t("editPraxis.coven.invitePlaceholder"),
                }}
              />
            </Window>
          )}

          <Window title={t("editPraxis.coven.filesLabel", { pasted: state.media.length })}>
            <MediaGrid state={state} />
          </Window>

          {state.showSealStack && (
            <Window title={t("editPraxis.coven.metatasksLabel")}>
              <MetataskSealStack state={state} />
            </Window>
          )}
        </>
      ) : (
        <Window title={t("editPraxis.coven.previewLabel")}>
          <div
            style={{
              fontFamily: SCRIPT,
              fontSize: "var(--text-title)",
              color: TITLE_TEXT,
              marginBottom: "var(--space-sm)",
            }}
          >
            {state.title || t("editPraxis.coven.titlePlaceholder")}
          </div>
          {state.media.length > 0 && (
            <div style={{ marginBottom: "var(--space-md)" }}>
              <MediaGrid state={state} readOnly />
            </div>
          )}
          <BodyPreview
            state={state}
            skin={{
              markdownStyle: {
                fontFamily: BODY,
                lineHeight: 1.6,
                color: CARD_TEXT,
              },
            }}
          />
        </Window>
      )}

      <ErrorBanner message={state.error} />

      <MobileStickyBar
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          padding: "var(--space-md) 0 var(--space-xs)",
          background: "var(--color-nav-bg)",
          backdropFilter: "blur(var(--nav-blur))",
          borderTop: `1.5px solid ${WIN_BORDER}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.coven.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: CARD_MUTED,
                fontFamily: SCRIPT,
                fontSize: "var(--text-content)",
                fontWeight: 700,
                cursor: "pointer",
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            ornament: <Sparkle size={13} color={ON_ACCENT} />,
            idleLabel: t("editPraxis.coven.publishIdle"),
            busyLabel: t("editPraxis.coven.publishBusy"),
            style: {
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              background: `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})`,
              color: ON_ACCENT,
              fontFamily: BODY,
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "var(--space-md) var(--space-lg)",
              border: `1.5px solid ${PINK_DEEP}`,
              borderRadius: 14,
              cursor: state.submitting ? "wait" : "pointer",
            },
          }}
        />
      </MobileStickyBar>
    </div>
  );
}

/** Fluid 3-column media grid in the COVEN notepad idiom. */
function MediaGrid({
  state,
  readOnly = false,
}: {
  state: EditPraxisState;
  readOnly?: boolean;
}) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--space-sm)",
      }}
    >
      {state.media.map((item) => {
        const filename = item.file_path.split("/").pop() ?? item.file_path;
        const src = mediaUrl(item.file_path);
        return (
          <div
            key={item.id}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              overflow: "hidden",
              borderRadius: 9,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              background: BODY_BG,
            }}
          >
            {item.type === "image" ? (
              <img
                src={src}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : item.type === "video" ? (
              <video
                src={src}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <MediaArt
                art={pickArtKey(filename, "audio")}
                width={120}
                height={120}
              />
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => void state.removeMedia(item)}
                aria-label={t("media.removeAria", { name: filename })}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: NOTEPAD_BG,
                  border: `1.5px solid ${PINK}`,
                  color: PINK,
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <FilePicker
          state={state}
          skin={{
            buttonStyle: {
              aspectRatio: "1 / 1",
              width: "100%",
              background: BODY_BG,
              border: `2px dashed ${NOTEPAD_BORDER}`,
              borderRadius: 9,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-xs)",
              fontFamily: SCRIPT,
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: PINK,
            },
            buttonLabel: t("editPraxis.coven.fileButton"),
          }}
        />
      )}
    </div>
  );
}
