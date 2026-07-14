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
import { factionCssVar } from "../../../utils/factions";
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
  MetatasksList,
  ModePicker,
  PublishButton,
  TitleField,
} from "./controls";
import { EphMark, Foxing, LapisLastWord, toRoman } from "../../../components/cards/ephemeristsAtoms";
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
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 10 }}>
      <span
        style={{
          fontFamily: "var(--eph-display)",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.16em",
          color: RUBRIC,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      {meta && (
        <span style={{ fontFamily: "var(--eph-serif)", fontSize: 9.5, fontStyle: "italic", letterSpacing: "0.06em", color: MUTED, whiteSpace: "nowrap" }}>
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
        padding: "32px 28px 48px",
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
            gap: 10,
            padding: "7px 4px 6px",
            color: RUBRIC,
            boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
            ...HAIRLINE,
          }}
        >
          <EphMark size={15} color="var(--eph-lapis)" />
          <span style={{ fontFamily: "var(--eph-display)", fontWeight: 600, fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {t("editPraxis.ephemerists.masthead", {
              number: praxis.id.toString().padStart(4, "0"),
            })}
          </span>
        </div>

        {/* title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "18px 0 4px", flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--eph-display)", fontWeight: 800, fontSize: 54, lineHeight: 0.9, letterSpacing: "0.02em", color: TEXT, whiteSpace: "nowrap" }}>
            <Trans
              ns="forms"
              i18nKey="editPraxis.ephemerists.pageTitle"
              components={[
                <span key="0" />,
                <span key="1" style={{ color: "var(--eph-lapis)" }} />,
              ]}
            />
          </div>
          <span style={{ fontFamily: "var(--eph-script)", fontStyle: "italic", fontSize: 14, color: MUTED }}>
            {t("editPraxis.ephemerists.tagline")}
          </span>
        </div>
        <div style={{ height: 0, width: 200, marginBottom: 26, ...HAIRLINE }} />

        {/* observed-task slip — a ledger-ruled leaf from the ephemeris */}
        <div style={{ position: "relative", overflow: "hidden", border: "1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)", background: "var(--eph-vellum)", marginBottom: 30 }}>
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
              gap: 10,
              padding: "7px 16px 6px",
              borderBottom: `1px solid ${GOLD}`,
              boxShadow: "0 2px 0 -1px color-mix(in srgb, var(--eph-lapis) 55%, transparent)",
            }}
          >
            <span style={{ fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase", color: RUBRIC }}>
              {t("editPraxis.ephemerists.slipRunningHead")}
            </span>
            <span style={{ fontSize: 8.5, letterSpacing: "0.06em", color: MUTED, whiteSpace: "nowrap" }}>
              {t("editPraxis.ephemerists.slipGrade", { grade: toRoman(grade) })}
            </span>
          </div>
          {/* body */}
          <div style={{ position: "relative", zIndex: 2, padding: "13px 16px 14px" }}>
            <div style={{ fontSize: 9, fontStyle: "italic", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>
              {t("editPraxis.ephemerists.taskRefLabel")}
            </div>
            <div style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: 30, lineHeight: 0.96, color: TEXT }}>
              <LapisLastWord text={praxis.task_title} />
            </div>
            {task?.description && (
              <div style={{ fontSize: 11, fontStyle: "italic", lineHeight: 1.5, color: MUTED, marginTop: 8 }}>
                {task.description}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--eph-lapis)", fontWeight: 600 }}>
                <EphMark size={12} color="var(--eph-lapis)" />{" "}
                {t("editPraxis.ephemerists.factionTag")}
              </span>
              <span style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: 15, color: RUBRIC }}>
                {t("editPraxis.ephemerists.pointsLabel", {
                  points: praxis.task_point_value,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* the method */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: 28 }}>
            <FieldLabel meta={t("editPraxis.ephemerists.modeMeta")}>
              {t("editPraxis.ephemerists.modeLabel")}
            </FieldLabel>
            <ModePicker
              state={state}
              skin={{
                containerStyle: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
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
                      padding: "13px 15px",
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
                    <div style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: 21, lineHeight: 1, letterSpacing: "0.03em" }}>{opt.label}</div>
                    <div style={{ fontStyle: "italic", fontSize: 10, letterSpacing: "0.02em", marginTop: 4, opacity: on ? 0.9 : 0.7 }}>{opt.sub}</div>
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
          <div style={{ marginBottom: 28 }}>
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

        {/* the finding (headline) */}
        <div style={{ marginBottom: 28 }}>
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
                fontSize: 24,
                letterSpacing: "0.01em",
                color: TEXT,
                padding: "4px 2px 8px",
                outline: "none",
              },
            }}
          />
        </div>

        {/* the account (body) */}
        <div style={{ marginBottom: 28 }}>
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
                fontSize: 14,
                lineHeight: 1.65,
                color: TEXT,
                padding: "13px 15px",
                outline: "none",
              },
            }}
          />
          <div style={{ fontSize: 9.5, fontStyle: "italic", color: MUTED, marginTop: 7 }}>
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
              wrapperStyle: { marginTop: 14, background: "var(--eph-vellum-deep)", border: `1.5px solid ${GOLD}`, padding: "16px 18px" },
              label: (
                <FieldLabel>
                  {t("editPraxis.ephemerists.previewLabel")}
                </FieldLabel>
              ),
              markdownStyle: { fontFamily: "var(--eph-serif)", fontSize: 14, lineHeight: 1.65, color: TEXT },
            }}
          />
        </div>

        {/* the evidence */}
        <div style={{ marginBottom: 30 }}>
          <FieldLabel
            meta={t("editPraxis.ephemerists.filesMeta", {
              pinned: state.media.length,
            })}
          >
            {t("editPraxis.ephemerists.filesLabel")}
          </FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
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
                gap: 8,
                cursor: "pointer",
                border: `2px dashed ${INK}`,
                background: "transparent",
                color: TEXT,
                fontFamily: "var(--eph-serif)",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "11px 18px",
              },
              buttonLabel: t("editPraxis.ephemerists.fileButton"),
              helperText: t("editPraxis.ephemerists.fileHelper"),
              helperStyle: { fontSize: 10, fontStyle: "italic", color: MUTED, marginTop: 9 },
            }}
          />
        </div>

        {/* metatasks */}
        {state.showMetatasks && (
          <div style={{ marginBottom: 30 }}>
            <FieldLabel meta={t("editPraxis.ephemerists.metatasksMeta")}>
              {t("editPraxis.ephemerists.metatasksLabel")}
            </FieldLabel>
            <MetatasksList
              state={state}
              skin={{
                rowStyle: (selected) => ({
                  padding: "8px 6px",
                  background: selected ? factionCssVar("ephemerists", "light") : "transparent",
                  border: selected ? `1.5px solid ${GOLD}` : "1.5px solid transparent",
                  marginBottom: 4,
                }),
                titleColor: TEXT,
                descColor: MUTED,
                pointsActiveColor: RUBRIC,
                pointsIdleColor: MUTED,
              }}
            />
          </div>
        )}

        <ErrorBanner message={state.error} />

        {/* file bar */}
        <div
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--eph-vellum-text) 22%, transparent)",
            paddingTop: 22,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
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
                fontSize: 22,
                letterSpacing: "0.08em",
                padding: "12px 28px",
                whiteSpace: "nowrap",
                boxShadow:
                  "inset 0 2px 4px rgba(255,255,255,0.16), inset 0 -4px 7px rgba(0,0,0,0.38), 0 2px 5px rgba(0,0,0,0.25)",
              },
            }}
          />
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.ephemerists.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: MUTED,
                fontFamily: "var(--eph-serif)",
                fontSize: 11,
                fontStyle: "italic",
                letterSpacing: "0.06em",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <span style={{ fontSize: 11, fontStyle: "italic", color: MUTED, marginLeft: "auto" }}>
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
        padding: 5,
        border: `1px solid ${INK}`,
        transform: `rotate(${rotation}deg)`,
        boxShadow: "2px 3px 5px rgba(0,0,0,.12)",
      }}
    >
      <div style={{ width: 140, height: 100, overflow: "hidden" }}>{children}</div>
      <div style={{ fontSize: 9, marginTop: 4, fontFamily: "var(--eph-serif)", fontStyle: "italic", color: GOLD, textAlign: "center" }}>
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
