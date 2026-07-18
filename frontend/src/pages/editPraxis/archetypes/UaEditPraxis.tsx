/**
 * The University of Asthmatics (UA) edit-praxis archetype — THE ATELIER.
 *
 * The gilt-salon counterpart to the read-page sheet (UaPraxisDetail) and UaVote:
 * a work-in-progress acquisition being prepared on the salon's workbench. Gilt
 * frames, parchment grounds, Playfair italic display, EB-Garamond serif body,
 * Marcellus small-caps regalia, burnt-amber accent. The salon never dims — UA
 * is always-light, so every --ua-* token reads identically in both themes and
 * we style with them directly without touching data-theme.
 *
 * Behaviour (autosave, mode-switch guards, invite, media, publish) comes from
 * the shared control primitives; this archetype owns only presentation. All
 * colors via --ua-* tokens (index.css) — never hardcode hex (CLAUDE.md).
 */
import { useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import type { CSSProperties, ReactNode } from "react";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import {
  Breadcrumb,
  ErrorBanner,
  TitleCounter,
  formatAutosave,
} from "./shared";
import { UaSigil } from "../../../components/cards/UaSigil";
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

const DISPLAY = "'Playfair Display', serif";
const REGALIA = "'Marcellus SC', serif";
const SERIF = "'EB Garamond', serif";
const MONO = "'Courier Prime', monospace";

/** A gilt-framed card — the recurring salon surface for each editor region. */
function Plate({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--ua-paper)",
        border: "1px solid var(--ua-line)",
        boxShadow:
          "0 8px 22px color-mix(in srgb, var(--ua-ink) 12%, transparent), inset 0 0 0 4px var(--ua-paper), inset 0 0 0 5px var(--ua-line-soft)",
        padding: "var(--space-lg) var(--space-xl)",
        marginBottom: "var(--space-xl)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small-caps section label with a fading gold rule, like the read sheet. */
function RegaliaLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
      <span style={{ fontFamily: REGALIA, fontSize: "var(--text-sm)", letterSpacing: "0.2em", color: "var(--ua-gold)", whiteSpace: "nowrap" }}>
        {children}
      </span>
      <div style={{ height: 1, flex: 1, background: "var(--ua-line-soft)" }} />
    </div>
  );
}

export default function UaEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;
  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];

  const modeOptions: Array<{ key: PraxisType; label: string; desc: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    label: t(`editPraxis.ua.mode.${key}.label`),
    desc: t(`editPraxis.ua.mode.${key}.desc`),
  }));

  return (
    <div
      style={{
        background:
          "radial-gradient(color-mix(in srgb, var(--ua-ink) 4%, transparent) 1px, transparent 1px), var(--ua-wall)",
        backgroundSize: "22px 22px, 100% 100%",
        fontFamily: SERIF,
        color: "var(--ua-ink)",
        padding: "var(--space-2xl) var(--space-xl) var(--space-5xl)",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor="var(--ua-gold)"
        />

        {/* Masthead — the salon submission sheet's letterhead */}
        <Plate style={{ padding: 0, marginBottom: "var(--space-xl)" }}>
          {/* burnt-amber ribbon — crest + house line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-md)",
              padding: "var(--space-sm) var(--space-lg)",
              background: "var(--ua-orange)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)", minWidth: 0 }}>
              <UaSigil width={22} height={26} />
              <span style={{ fontFamily: REGALIA, fontSize: "var(--text-base)", letterSpacing: "0.14em", color: "var(--ua-paper-warm)" }}>
                {t("editPraxis.ua.masthead", { number: praxis.id })}
              </span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ua-paper-warm)", fontStyle: "italic", whiteSpace: "nowrap" }}>
              {state.autosaveAt
                ? t("editPraxis.ua.autosaveSaved", {
                    ago: formatAutosave(state.autosaveAt),
                  })
                : t("editPraxis.ua.autosaveUnsaved")}
            </span>
          </div>
          <div style={{ padding: "var(--space-xl)" }}>
            <h1 style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 600, fontSize: "var(--text-display)", lineHeight: 1.04, color: "var(--ua-ink)", margin: "0 0 var(--space-md)" }}>
              {t("editPraxis.ua.pageTitle")}
            </h1>
            {/* red/gold dashed rule */}
            <div style={{ height: 0, borderTop: "1.5px dashed var(--ua-gold)", marginBottom: "var(--space-lg)" }} />
            {/* commission reference slip — crest, task, points, era mark */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", border: "1px solid var(--ua-line)", background: "var(--ua-paper-warm)", padding: "var(--space-md) var(--space-lg)" }}>
              <UaSigil width={50} height={60} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ua-muted)", marginBottom: "var(--space-xs)" }}>
                  {t("editPraxis.ua.commissionLabel")}
                </div>
                <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: "var(--text-content)", color: "var(--ua-ink)", lineHeight: 1.15, overflowWrap: "anywhere" }}>
                  {praxis.task_title}
                </div>
                {task?.description && (
                  <div style={{ fontFamily: MONO, fontSize: "var(--text-content)", lineHeight: 1.45, color: "var(--ua-muted)", marginTop: "var(--space-xs)", overflowWrap: "anywhere" }}>
                    {task.description}
                  </div>
                )}
                <div style={{ fontFamily: REGALIA, fontSize: "var(--text-base)", letterSpacing: "0.12em", color: "var(--ua-gold)", marginTop: "var(--space-xs)" }}>
                  {t("editPraxis.ua.pointsLabel", {
                    points: praxis.task_point_value,
                  })}
                </div>
              </div>
            </div>
          </div>
        </Plate>

        {/* Mode — engraved plates */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <RegaliaLabel>{t("editPraxis.ua.modeLabel")}</RegaliaLabel>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "flex", gap: "var(--space-md)", flexWrap: "wrap" },
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
                      minWidth: 150,
                      textAlign: "left",
                      padding: "var(--space-md) var(--space-lg)",
                      cursor: disabled && !active ? "not-allowed" : "pointer",
                      background: active ? "var(--ua-gilt)" : "var(--ua-paper)",
                      border: active ? "none" : "1px solid var(--ua-line)",
                      boxShadow: active
                        ? "0 4px 10px color-mix(in srgb, var(--ua-ink) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, white 40%, transparent)"
                        : "none",
                    }}
                  >
                    <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, fontSize: "var(--text-content)", color: active ? "var(--ua-paper)" : "var(--ua-ink)", lineHeight: 1 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.06em", textTransform: "uppercase", color: active ? "var(--ua-paper)" : "var(--ua-muted)", marginTop: "var(--space-xs)" }}>
                      {opt.desc}
                    </div>
                  </button>
                ),
              }}
            />
          </div>
        )}

        {/* Invite — the other hands */}
        {state.showInviteBox && (
          <Plate>
            <RegaliaLabel>
              {praxis.type === "duel"
                ? t("editPraxis.ua.inviteLabelDuel")
                : t("editPraxis.ua.inviteLabel")}
            </RegaliaLabel>
            <InviteSearch
              state={state}
              skin={{
                fontFamily: SERIF,
                inputBg: "var(--ua-paper-warm)",
                inputColor: "var(--ua-ink)",
                inputBorder: "1px solid var(--ua-line)",
                dropdownBg: "var(--ua-paper)",
                dropdownBorder: "1px solid var(--ua-line)",
                acceptedBg: "var(--ua-orange)",
                acceptedColor: "var(--ua-paper)",
                placeholder: t("editPraxis.ua.invitePlaceholder"),
              }}
            />
          </Plate>
        )}

        {/* Title */}
        <Plate>
          <RegaliaLabel>{t("editPraxis.ua.titleLabel")}</RegaliaLabel>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.ua.titlePlaceholder"),
              inputStyle: {
                width: "100%",
                fontFamily: DISPLAY,
                fontStyle: "italic",
                fontWeight: 600,
                color: "var(--ua-ink)",
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: "1px solid var(--ua-line-soft)",
                padding: "var(--space-xs) 0 var(--space-sm)",
              },
            }}
          />
          <div style={{ marginTop: "var(--space-sm)" }}>
            <TitleCounter length={state.title.length} color="var(--ua-muted)" />
          </div>
        </Plate>

        {/* Body — the process */}
        <Plate>
          <RegaliaLabel>
            {t("editPraxis.ua.bodyLabel", { words: state.wordCount })}
          </RegaliaLabel>
          <BodyTextarea
            state={state}
            skin={{
              rows: 10,
              placeholder: t("editPraxis.ua.bodyPlaceholder"),
              textareaStyle: {
                width: "100%",
                fontFamily: SERIF,
                lineHeight: 1.75,
                color: "var(--ua-sub)",
                background: "var(--ua-paper-warm)",
                border: "1px solid var(--ua-line-soft)",
                outline: "none",
                resize: "vertical",
                minHeight: 200,
                padding: "var(--space-md)",
              },
            }}
          />
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: { borderTop: "1px solid var(--ua-line-soft)", marginTop: "var(--space-md)", paddingTop: "var(--space-md)" },
              label: (
                <div style={{ fontFamily: REGALIA, fontSize: "var(--text-sm)", letterSpacing: "0.2em", color: "var(--ua-gold)", marginBottom: "var(--space-sm)" }}>
                  {t("editPraxis.ua.previewLabel")}
                </div>
              ),
              markdownStyle: { fontFamily: SERIF, lineHeight: 1.85, color: "var(--ua-sub)" },
            }}
          />
        </Plate>

        {/* The plates — media */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <RegaliaLabel>{t("editPraxis.ua.filesLabel")}</RegaliaLabel>
          <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap", alignItems: "flex-start" }}>
            {state.media.map((item) => {
              const filename = item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <GiltPlate key={item.id} caption={filename} onRemove={() => void state.removeMedia(item)}>
                  {item.type === "image" ? (
                    <img src={src} alt="" style={{ width: 140, height: 100, objectFit: "cover", display: "block" }} />
                  ) : item.type === "video" ? (
                    <video src={src} style={{ width: 140, height: 100, objectFit: "cover", display: "block" }} />
                  ) : (
                    <MediaArt art={pickArtKey(filename, "audio")} />
                  )}
                </GiltPlate>
              );
            })}
            <FilePicker
              state={state}
              skin={{
                buttonStyle: {
                  width: 152,
                  height: 130,
                  background: "var(--ua-paper-warm)",
                  border: "2px dashed var(--ua-line)",
                  cursor: "pointer",
                  fontFamily: REGALIA,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ua-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "var(--space-xs)",
                },
                buttonLabel: t("editPraxis.ua.fileButton"),
                errorColor: "var(--ua-orange-deep)",
                helperText: t("editPraxis.ua.fileHelper"),
                helperStyle: { fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.08em", color: "var(--ua-muted)", marginTop: "var(--space-sm)", fontStyle: "italic" },
              }}
            />
          </div>
        </div>

        {/* Metatasks */}
        {state.showMetatasks && (
          <Plate>
            <RegaliaLabel>{t("editPraxis.ua.metatasksLabel")}</RegaliaLabel>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "var(--space-sm)",
                  background: selected ? "color-mix(in srgb, var(--ua-gold-pale) 22%, var(--ua-paper))" : "transparent",
                  border: selected ? "1px solid var(--ua-line)" : "1px solid transparent",
                  marginBottom: "var(--space-xs)",
                  fontFamily: SERIF,
                }),
                titleColor: "var(--ua-ink)",
                descColor: "var(--ua-sub)",
                pointsActiveColor: "var(--ua-orange)",
                pointsIdleColor: "var(--ua-muted)",
              }}
            />
          </Plate>
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs */}
        <div style={{ display: "flex", gap: "var(--space-lg)", alignItems: "center", marginTop: "var(--space-xl)", flexWrap: "wrap" }}>
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.ua.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: "var(--ua-muted)",
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: "var(--text-xl)",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <PublishButton
            state={state}
            skin={{
              idleLabel: t("editPraxis.ua.publishIdle"),
              busyLabel: t("editPraxis.ua.publishBusy"),
              style: {
                background: "var(--ua-orange)",
                color: "var(--ua-paper)",
                fontFamily: REGALIA,
                fontSize: "var(--text-lg)",
                letterSpacing: "0.1em",
                padding: "var(--space-md) var(--space-xl)",
                border: "none",
                borderRadius: 0,
                cursor: state.submitting ? "wait" : "pointer",
                boxShadow: "0 4px 10px color-mix(in srgb, var(--ua-ink) 22%, transparent)",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** A gilt-framed plate for one piece of evidence — the salon's polaroid. */
function GiltPlate({
  children,
  caption,
  onRemove,
}: {
  children: ReactNode;
  caption: string;
  onRemove: () => void;
}) {
  const { t } = useTranslation("forms");
  return (
    <div style={{ position: "relative", background: "var(--ua-gilt)", padding: "var(--space-xs)", boxShadow: "0 8px 18px color-mix(in srgb, var(--ua-ink) 20%, transparent)" }}>
      <div style={{ background: "var(--ua-paper)", padding: "var(--space-xs)" }}>
        <div style={{ width: 140, height: 100, overflow: "hidden" }}>{children}</div>
        <div style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.04em", color: "var(--ua-muted)", textAlign: "center", marginTop: "var(--space-xs)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {caption}
        </div>
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
          borderRadius: "50%",
          background: "var(--ua-paper)",
          border: "1.5px solid var(--ua-orange)",
          color: "var(--ua-orange)",
          fontSize: "var(--text-lg)",
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
