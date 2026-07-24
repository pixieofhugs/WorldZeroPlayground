/**
 * Ephemeris Entry — The Ephemerists faction (ephemerists slug).
 * World Zero's praxis form in the faction's voice: filing AN ENTRY IN THE
 * EPHEMERIS. A hairline-bracketed masthead, an "EDIT PRAXIS" title with one
 * word in the lapis, a ledger-ruled observed-task leaf, the METHOD selector
 * (alone / in concord / in dispute), THE FINDING, THE ACCOUNT, THE EVIDENCE,
 * and a seal-&-enter bar. Ported from the Ephemerists kit (ephemerists-praxis).
 * Behaviour is identical to every other archetype (driven by useEditPraxis);
 * only the visual metaphor differs. Colors via the --eph-* tokens.
 */
import type { CSSProperties, ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { mediaUrl } from "../../../utils/media";
import { type PraxisType } from "../../../api/praxis";
import MediaArt from "../blocks/MediaArt";
import { pickArtKey } from "../blocks/useMediaArt";
import { Breadcrumb, ErrorBanner, formatAutosave } from "./shared";
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
import { EphemeristsSigil, Foxing, LapisLastWord, toRoman } from "../../../components/cards/ephemeristsAtoms";
import type { EditPraxisState } from "../useEditPraxis";

interface Props {
  state: EditPraxisState;
}

const INK = "var(--eph-ink)";
const RUBRIC = "var(--eph-rubric)";
const GOLD = "var(--eph-gold-deep)";
const MUTED = "var(--eph-muted)";
const TEXT = "var(--eph-vellum-text)";

/** Rubric Cinzel label + italic meta + a trailing gold/lapis hairline rule. */
function FieldLabel({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-lg)", marginBottom: "var(--space-sm)" }}>
      <span
        style={{
          fontFamily: "var(--eph-display)",
          fontWeight: 700,
          fontSize: "var(--text-xl)",
          letterSpacing: "0.16em",
          color: RUBRIC,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {meta && (
        <span style={{ fontFamily: "var(--eph-serif)", fontSize: "var(--text-sm)", fontStyle: "italic", letterSpacing: "0.06em", color: MUTED, whiteSpace: "nowrap" }}>
          {meta}
        </span>
      )}
      <span style={{ flex: 1, height: 0, borderTop: `1px solid ${GOLD}`, borderBottom: "1px solid color-mix(in srgb, var(--eph-lapis) 60%, transparent)" }} />
    </div>
  );
}

const HAIRLINE: CSSProperties = {
  borderTop: `1px solid ${GOLD}`,
  borderBottom: "1px solid color-mix(in srgb, var(--eph-lapis) 60%, transparent)",
};

export default function EphemeristsEditPraxis({ state }: Props) {
  const { t } = useTranslation("forms");
  const praxis = state.praxis!;
  const task = state.task;
  const allowedModes = task?.allowed_modes ?? ["solo", "collab", "duel"];
  const grade = task?.level_required ?? 1;

  const modeOptions: Array<{ key: PraxisType; label: string; sub: string }> = (
    ["solo", "collab", "duel"] as const
  ).map((key) => ({
    key,
    label: t(`editPraxis.ephemerists.mode.${key}.label`),
    sub: t(`editPraxis.ephemerists.mode.${key}.desc`),
  }));

  return (
    <div
      style={{
        background: "var(--eph-vellum)",
        color: TEXT,
        fontFamily: "var(--eph-serif)",
        position: "relative",
        padding: "var(--space-2xl) var(--space-xl) var(--space-4xl)",
        minHeight: "100vh",
        backgroundImage:
          "radial-gradient(40% 32% at 100% 0%, color-mix(in srgb, var(--eph-gold) 12%, transparent), transparent 72%), radial-gradient(46% 38% at 0% 100%, color-mix(in srgb, var(--eph-lapis) 11%, transparent), transparent 72%), repeating-linear-gradient(0deg, color-mix(in srgb, var(--eph-vellum-text) 4%, transparent) 0 1px, transparent 1px 26px)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor={MUTED}
        />

        {/* masthead — a catalogue running-head between hairlines */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            padding: "var(--space-sm) var(--space-xs) var(--space-xs)",
            color: RUBRIC,
            boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
            ...HAIRLINE,
          }}
        >
          <EphemeristsSigil size={15} color="var(--eph-lapis)" />
          <span style={{ fontFamily: "var(--eph-display)", fontWeight: 600, fontSize: "var(--text-xl)", letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {t("editPraxis.ephemerists.masthead", {
              number: praxis.id.toString().padStart(4, "0"),
            })}
          </span>
        </div>

        {/* title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-md)", margin: "var(--space-lg) 0 var(--space-xs)", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--eph-display)", fontWeight: 800, fontSize: "var(--text-display)", lineHeight: 0.9, letterSpacing: "0.02em", color: TEXT, whiteSpace: "nowrap" }}>
            <Trans
              ns="forms"
              i18nKey="editPraxis.ephemerists.pageTitle"
              components={[
                <span key="0" />,
                <span key="1" style={{ color: "var(--eph-lapis)" }} />,
              ]}
            />
          </div>
          <span style={{ fontFamily: "var(--eph-script)", fontStyle: "italic", fontSize: "var(--text-xl)", color: MUTED }}>
            {t("editPraxis.ephemerists.tagline")}
          </span>
        </div>
        <div style={{ height: 0, width: 200, marginBottom: "var(--space-xl)", ...HAIRLINE }} />

        {/* observed-task slip — a ledger-ruled leaf from the ephemeris */}
        <div style={{ position: "relative", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)", background: "var(--eph-vellum)", marginBottom: "var(--space-2xl)" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              opacity: 0.5,
              backgroundImage: "repeating-linear-gradient(0deg, transparent 0 23px, color-mix(in srgb, var(--eph-lapis) 16%, transparent) 23px 24px)",
            }}
          />
          <Foxing opacity={0.35} />
          {/* running head */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--space-sm)",
              padding: "var(--space-sm) var(--space-lg) var(--space-xs)",
              borderBottom: `1px solid ${GOLD}`,
              boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
            }}
          >
            <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.18em", textTransform: "uppercase", color: RUBRIC }}>
              {t("editPraxis.ephemerists.slipRunningHead")}
            </span>
            <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.06em", color: MUTED, whiteSpace: "nowrap" }}>
              {t("editPraxis.ephemerists.slipGrade", { grade: toRoman(grade) })}
            </span>
          </div>
          {/* body */}
          <div style={{ position: "relative", zIndex: 2, padding: "var(--space-md) var(--space-lg)" }}>
            <div style={{ fontSize: "var(--text-sm)", fontStyle: "italic", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: "var(--space-xs)" }}>
              {t("editPraxis.ephemerists.taskRefLabel")}
            </div>
            <div style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: "var(--text-heading)", lineHeight: 0.96, color: TEXT }}>
              <LapisLastWord text={praxis.task_title} />
            </div>
            {task?.description && (
              <div style={{ fontSize: "var(--text-content)", fontStyle: "italic", lineHeight: 1.5, color: MUTED, marginTop: "var(--space-sm)" }}>
                {task.description}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "var(--text-sm)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--eph-lapis)", fontWeight: 600 }}>
                <EphemeristsSigil size={12} color="var(--eph-lapis)" />{" "}
                {t("editPraxis.ephemerists.factionTag")}
              </span>
              <span style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: "var(--text-xl)", color: RUBRIC }}>
                {t("editPraxis.ephemerists.pointsLabel", {
                  points: praxis.task_point_value,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* the method */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <FieldLabel meta={t("editPraxis.ephemerists.modeMeta")}>
              {t("editPraxis.ephemerists.modeLabel")}
            </FieldLabel>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)" },
                options: modeOptions,
                allowedModes,
                renderOption: (opt, { active: on, disabled, onSelect }) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={on}
                    onClick={onSelect}
                    disabled={disabled && !on}
                    style={{
                      position: "relative",
                      cursor: disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      padding: "var(--space-md) var(--space-lg)",
                      background: on ? "var(--eph-lapis)" : "var(--eph-vellum)",
                      color: on ? "var(--eph-parchment)" : TEXT,
                      border: `1px solid ${INK}`,
                      fontFamily: "var(--eph-serif)",
                      boxShadow: on
                        ? "inset 0 2px 6px rgba(0,0,0,0.4), inset 0 0 0 1px color-mix(in srgb, var(--eph-gold) 55%, transparent)"
                        : "none",
                      transition: "all 120ms",
                    }}
                  >
                    <div style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: "var(--text-title)", lineHeight: 1, letterSpacing: "0.03em" }}>{opt.label}</div>
                    <div style={{ fontStyle: "italic", fontSize: "var(--text-base)", letterSpacing: "0.02em", marginTop: "var(--space-xs)", opacity: on ? 0.9 : 0.7 }}>{opt.sub}</div>
                    {on && (
                      <div style={{ position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: "50%", background: "var(--eph-gold-light)", boxShadow: `0 0 0 2px ${INK}` }} />
                    )}
                  </button>
                ),
              }}
            />
          </div>
        )}

        {/* invite (collab / duel) */}
        {state.showInviteBox && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <FieldLabel
              meta={
                state.duelMode
                  ? t("editPraxis.ephemerists.inviteMetaDuel")
                  : t("editPraxis.ephemerists.inviteMeta")
              }
            >
              {state.duelMode
                ? t("editPraxis.ephemerists.inviteLabelDuel")
                : t("editPraxis.ephemerists.inviteLabel")}
            </FieldLabel>
            <InviteSearch
              state={state}
              skin={{
                fontFamily: "var(--eph-serif)",
                inputBg: "var(--eph-vellum)",
                inputColor: TEXT,
                inputBorder: `1.5px solid ${INK}`,
                acceptedBg: "var(--eph-lapis)",
                acceptedColor: "var(--eph-parchment)",
                placeholder: t("editPraxis.ephemerists.invitePlaceholder"),
              }}
            />
          </div>
        )}

        {/* metatasks */}
        {state.showSealStack && (
          <div style={{ marginBottom: "var(--space-2xl)" }}>
            <FieldLabel meta={t("editPraxis.ephemerists.metatasksMeta")}>
              {t("editPraxis.ephemerists.metatasksLabel")}
            </FieldLabel>
            <MetataskSealStack state={state} />
          </div>
        )}

        {/* the finding (headline) */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <FieldLabel
            meta={t("editPraxis.ephemerists.titleMeta", {
              length: state.title.length,
            })}
          >
            {t("editPraxis.ephemerists.titleLabel")}
          </FieldLabel>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.ephemerists.titlePlaceholder"),
              inputStyle: {
                width: "100%",
                border: "none",
                borderBottom: `2px solid ${INK}`,
                background: "transparent",
                fontFamily: "var(--eph-display)",
                fontWeight: 700,
                letterSpacing: "0.01em",
                color: TEXT,
                padding: "var(--space-xs) var(--space-xs) var(--space-sm)",
                outline: "none",
              },
            }}
          />
        </div>

        {/* the account (body) */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <FieldLabel
            meta={t("editPraxis.ephemerists.bodyMeta", {
              words: state.wordCount,
            })}
          >
            {t("editPraxis.ephemerists.bodyLabel")}
          </FieldLabel>
          <BodyTextarea
            state={state}
            skin={{
              rows: 9,
              placeholder: t("editPraxis.ephemerists.bodyPlaceholder"),
              textareaStyle: {
                width: "100%",
                resize: "vertical",
                border: `1.5px solid ${INK}`,
                background: "var(--eph-vellum)",
                fontFamily: "var(--eph-serif)",
                lineHeight: 1.65,
                color: TEXT,
                padding: "var(--space-md) var(--space-lg)",
                outline: "none",
              },
            }}
          />
          <div style={{ fontSize: "var(--text-sm)", fontStyle: "italic", color: MUTED, marginTop: "var(--space-sm)" }}>
            <Trans
              ns="forms"
              i18nKey="editPraxis.ephemerists.bodyFootnote"
              components={[
                <span key="0" />,
                <span key="1" style={{ color: "var(--eph-lapis)" }} />,
              ]}
            />
          </div>
          <BodyPreview
            state={state}
            skin={{
              wrapperStyle: { marginTop: "var(--space-md)", background: "var(--eph-vellum-deep)", border: `1.5px solid ${GOLD}`, padding: "var(--space-lg)" },
              label: (
                <FieldLabel>
                  {t("editPraxis.ephemerists.previewLabel")}
                </FieldLabel>
              ),
              markdownStyle: { fontFamily: "var(--eph-serif)", lineHeight: 1.65, color: TEXT },
            }}
          />
        </div>

        {/* the evidence */}
        <div style={{ marginBottom: "var(--space-2xl)" }}>
          <FieldLabel
            meta={t("editPraxis.ephemerists.filesMeta", {
              pinned: state.media.length,
            })}
          >
            {t("editPraxis.ephemerists.filesLabel")}
          </FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", marginBottom: "var(--space-md)" }}>
            {state.media.map((item, index) => {
              const filename = item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <Specimen
                  key={item.id}
                  rotation={[-2, 1.6, -1.4, 2.2][index % 4]}
                  caption={filename}
                  onRemove={() => void state.removeMedia(item)}
                >
                  {item.type === "image" ? (
                    <img src={src} alt="" style={{ width: 140, height: 100, objectFit: "cover" }} />
                  ) : item.type === "video" ? (
                    <video src={src} style={{ width: 140, height: 100, objectFit: "cover" }} />
                  ) : (
                    <MediaArt art={pickArtKey(filename, "audio")} />
                  )}
                </Specimen>
              );
            })}
          </div>
          <FilePicker
            state={state}
            skin={{
              buttonStyle: {
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                cursor: "pointer",
                border: `2px dashed ${INK}`,
                background: "transparent",
                color: TEXT,
                fontFamily: "var(--eph-serif)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "var(--space-md) var(--space-lg)",
              },
              buttonLabel: t("editPraxis.ephemerists.fileButton"),
              helperText: t("editPraxis.ephemerists.fileHelper"),
              helperStyle: { fontSize: "var(--text-base)", fontStyle: "italic", color: MUTED, marginTop: "var(--space-sm)" },
            }}
          />
        </div>

        <ErrorBanner message={state.error} />

        {/* file bar */}
        <div
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--eph-vellum-text) 22%, transparent)",
            paddingTop: "var(--space-xl)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-lg)",
            flexWrap: "wrap",
          }}
        >
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.ephemerists.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: MUTED,
                fontFamily: "var(--eph-serif)",
                fontSize: "var(--text-md)",
                fontStyle: "italic",
                letterSpacing: "0.06em",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <PublishButton
            state={state}
            skin={{
              idleLabel: t("editPraxis.ephemerists.publishIdle"),
              busyLabel: t("editPraxis.ephemerists.publishBusy"),
              style: {
                cursor: state.submitting ? "wait" : "pointer",
                border: "1px solid var(--eph-gold)",
                background: RUBRIC,
                color: "var(--eph-parchment)",
                fontFamily: "var(--eph-display)",
                fontWeight: 700,
                fontSize: "var(--text-title)",
                letterSpacing: "0.08em",
                padding: "var(--space-md) var(--space-xl)",
                whiteSpace: "nowrap",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,0.16), inset 0 -4px 7px rgba(0,0,0,0.38), 0 2px 5px rgba(0,0,0,0.25)",
              },
            }}
          />
          <span style={{ fontSize: "var(--text-md)", fontStyle: "italic", color: MUTED, marginLeft: "auto" }}>
            {state.autosaveAt
              ? t("editPraxis.ephemerists.autosaveSaved", {
                  ago: formatAutosave(state.autosaveAt),
                })
              : t("editPraxis.ephemerists.autosaveUnsaved")}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SpecimenProps {
  children: ReactNode;
  caption: string;
  rotation: number;
  onRemove: () => void;
}

function Specimen({ children, caption, rotation, onRemove }: SpecimenProps) {
  const { t } = useTranslation("forms");
  return (
    <div
      style={{
        position: "relative",
        background: "var(--eph-vellum)",
        padding: "var(--space-xs)",
        border: `1px solid ${INK}`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "2px 3px 5px rgba(0,0,0,.12)",
      }}
    >
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>{children}</div>
      <div style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-xs)", fontFamily: "var(--eph-serif)", fontStyle: "italic", color: GOLD, textAlign: "center" }}>
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
          borderRadius: "50%",
          background: "var(--eph-vellum)",
          border: `1.5px solid ${GOLD}`,
          color: GOLD,
          fontSize: "var(--text-md)",
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
