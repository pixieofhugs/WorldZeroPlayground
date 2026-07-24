/**
 * Default MOBILE composer (#498) — full-screen, single-column, thumb-first.
 * A Write/Preview segmented toggle swaps the editor for a live markdown preview;
 * an obvious fluid media grid drives the FilePicker → ImageEditModal crop path
 * (owned by the EditPraxis wrapper); a sticky submit bar rides above the tab
 * bar. Consumes `useEditPraxis` verbatim — no editor, upload, or submit logic
 * lives here. Every faction falls through to this skin until it registers a
 * bespoke mobile composer.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
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
import {
  DefaultModePicker,
  MobileStickyBar,
  SegToggle,
  type ComposerTab,
} from "./shared";

const ACCENT = "var(--faction-default)";
const SURFACE = "var(--color-bg-surface)";
const BORDER = "var(--color-border)";
const INK = "var(--color-text-primary)";
const MUTED = "var(--color-text-secondary)";
const FAINT = "var(--color-text-tertiary)";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: FAINT,
};

export default function DefaultEditPraxis({
  state,
}: {
  state: EditPraxisState;
}) {
  const { t } = useTranslation("forms");
  const [tab, setTab] = useState<ComposerTab>("write");
  const praxis = state.praxis!;
  const task = state.task;

  return (
    <div
      data-skin="default"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
        fontFamily: "var(--font-body)",
        color: INK,
      }}
    >
      {/* Title + Write/Preview toggle */}
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)" }}>
          <h1
            className="font-display italic"
            style={{ fontSize: "var(--text-title)", lineHeight: 1, color: INK, margin: 0 }}
          >
            {t("editPraxis.na.pageTitle")}
          </h1>
          <span style={{ ...eyebrow, marginLeft: "auto" }}>
            {state.autosaveAt
              ? t("editPraxis.na.autosaveSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.na.autosaveUnsaved")}
          </span>
        </div>

        <SegToggle
          tab={tab}
          setTab={setTab}
          skin={{
            containerStyle: {
              gap: "var(--space-xs)",
              padding: "var(--space-xs)",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 999,
            },
            buttonStyle: (active) => ({
              padding: "var(--space-sm)",
              borderRadius: 999,
              border: "none",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: active ? 700 : 400,
              background: active ? ACCENT : "transparent",
              color: active ? "var(--color-text-on-accent)" : MUTED,
            }),
          }}
        />
      </header>

      {/* For-task reference */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-sm)",
          padding: "var(--space-md)",
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
        }}
      >
        <span style={eyebrow}>{t("editPraxis.na.taskRefLabel")}</span>
        <span
          className="font-display italic"
          style={{ fontSize: "var(--text-content)", color: INK, textAlign: "right", flex: 1 }}
        >
          {praxis.task_title}
        </span>
      </div>
      <div style={{ ...eyebrow, color: ACCENT }}>
        {factionName(task?.primary_faction_slug ?? null)}
        {task ? ` · ${t("taskMeta.points", { points: task.point_value })}` : ""}
      </div>

      {tab === "write" ? (
        <>
          {/* Mode — Solo · Collab · Duel, above the title (scrolls with content) */}
          <DefaultModePicker state={state} />

          {/* Title */}
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <span style={eyebrow}>{t("editPraxis.na.titleLabel")}</span>
            <TitleField
              state={state}
              skin={{
                placeholder: t("editPraxis.na.titlePlaceholder"),
                inputStyle: {
                  width: "100%",
                  fontFamily: "var(--font-body)",
                  color: INK,
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "var(--space-md)",
                  outline: "none",
                },
              }}
            />
          </label>

          {/* Body */}
          <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            <span style={eyebrow}>
              {t("editPraxis.na.bodyLabel", { words: state.wordCount })}
            </span>
            <BodyTextarea
              state={state}
              skin={{
                rows: 10,
                placeholder: t("editPraxis.na.bodyPlaceholder"),
                textareaStyle: {
                  width: "100%",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.55,
                  color: INK,
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "var(--space-md)",
                  outline: "none",
                  resize: "vertical",
                  minHeight: 180,
                },
              }}
            />
          </label>

          {/* Invite (collab / duel) */}
          {state.showInviteBox && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <span style={eyebrow}>
                {state.duelMode
                  ? t("editPraxis.na.inviteLabelDuel")
                  : t("editPraxis.na.inviteLabel")}
              </span>
              <InviteSearch
                state={state}
                skin={{
                  fontFamily: "var(--font-body)",
                  inputBg: SURFACE,
                  inputColor: INK,
                  inputBorder: `1px solid ${BORDER}`,
                  acceptedBg: ACCENT,
                  acceptedColor: "var(--color-text-on-accent)",
                  placeholder: t("editPraxis.na.invitePlaceholder"),
                }}
              />
            </div>
          )}

          {/* Metatasks */}
          {state.showSealStack && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              <span style={eyebrow}>{t("editPraxis.na.metatasksLabel")}</span>
              <MetataskSealStack state={state} />
            </div>
          )}

          {/* Media grid + add */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <span style={eyebrow}>{t("editPraxis.na.filesLabel")}</span>
            <MediaGrid state={state} />
          </div>
        </>
      ) : (
        // Preview
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div
            className="font-display italic"
            style={{ fontSize: "var(--text-content)", color: INK }}
          >
            {state.title || t("editPraxis.na.titlePlaceholder")}
          </div>
          {state.media.length > 0 && <MediaGrid state={state} readOnly />}
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: {
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "var(--space-md) var(--space-lg)",
              },
              markdownStyle: {
                fontFamily: "var(--font-body)",
                lineHeight: 1.6,
                color: INK,
              },
            }}
          />
        </div>
      )}

      <ErrorBanner message={state.error} />

      {/* Sticky submit bar */}
      <MobileStickyBar
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          padding: "var(--space-md) 0 var(--space-xs)",
          background: "var(--color-nav-bg)",
          backdropFilter: "blur(var(--nav-blur))",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        {!state.isPublished && (
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.na.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: FAINT,
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-md)",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
        )}
        <PublishButton
          state={state}
          skin={{
            idleLabel: t("editPraxis.na.publishIdle"),
            busyLabel: t("editPraxis.na.publishBusy"),
            style: {
              flex: 1,
              background: ACCENT,
              color: "var(--color-text-on-accent)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "var(--space-md) var(--space-lg)",
              border: "none",
              borderRadius: 12,
              cursor: state.submitting ? "wait" : "pointer",
            },
          }}
        />
      </MobileStickyBar>
    </div>
  );
}

/** Fluid 3-column media grid: existing items (with remove) + the add tile. */
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
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
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
                  background: "var(--color-bg-page)",
                  border: `1px solid ${BORDER}`,
                  color: INK,
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
              background: SURFACE,
              border: `1.5px dashed ${BORDER}`,
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-xs)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-md)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
            },
            buttonLabel: t("editPraxis.na.fileButton"),
          }}
        />
      )}
    </div>
  );
}
