/**
 * UA edit-praxis — SEAL A PRAXIS (kit §3, #851).
 *
 * The praxis archetype as a form: the same dress the card wears, in composer
 * mode. Quiet labels, generous space, one ensō at the head, and a single
 * saturated note on the seal button.
 *
 * The atelier is gone with the salon — no gilt frames, no gold liners, no
 * parchment dot grid, no polaroid plates. The mandala is ABSENT: an editor is
 * the most text-dense surface UA has (brief §5).
 *
 * Behaviour (autosave, mode-switch guards, invite, media, publish) comes from
 * the shared control primitives; this archetype owns only presentation, and
 * fills the same slots the card renders so data parity holds (ADR-0016).
 *
 * Both themes come from the `[data-theme="dark"]` cascade. UA dims now.
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
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  uaShade,
} from "../../../components/cards/uaAtoms";
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

/** A block of the sheet — card stock inside a neutral hairline. */
function Plate({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--faction-ua-card-bg)",
        border: "1px solid var(--faction-ua-rule)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-lg) var(--space-xl)",
        marginBottom: "var(--space-xl)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Field label — the eyebrow, with a hairline running out to the margin. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-sm)",
        marginBottom: "var(--space-md)",
      }}
    >
      <span style={{ ...UA_EYEBROW, whiteSpace: "nowrap" }}>{children}</span>
      <div
        style={{ height: 1, flex: 1, background: "var(--faction-ua-hair)" }}
      />
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
        background: "var(--faction-ua-page)",
        fontFamily: UA_TEXT,
        color: "var(--faction-ua-page-text)",
        padding: "var(--space-2xl) var(--space-xl) var(--space-5xl)",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Breadcrumb
          praxisId={praxis.id}
          taskId={praxis.task_id}
          taskTitle={praxis.task_title}
          inkColor="var(--faction-ua-card-accent)"
        />

        {/* Masthead — the mark, the sheet number, the autosave whisper */}
        <Plate
          style={{
            padding: "var(--space-xl)",
            background:
              "linear-gradient(158deg, var(--faction-ua-lift), var(--faction-ua-card-bg) 55%, var(--faction-ua-panel))",
            boxShadow: `0 16px 42px -24px ${uaShade(55)}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-md)",
              marginBottom: "var(--space-lg)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-md)",
                minWidth: 0,
              }}
            >
              <UaSigil width={40} height={40} />
              <span style={UA_EYEBROW}>
                {t("editPraxis.ua.masthead", { number: praxis.id })}
              </span>
            </span>
            <span
              style={{
                ...UA_EYEBROW,
                letterSpacing: "0.14em",
                whiteSpace: "nowrap",
              }}
            >
              {state.autosaveAt
                ? t("editPraxis.ua.autosaveSaved", {
                    ago: formatAutosave(state.autosaveAt),
                  })
                : t("editPraxis.ua.autosaveUnsaved")}
            </span>
          </div>

          <h1
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: "var(--text-display)",
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
              color: "var(--faction-ua-card-text)",
              margin: "0 0 var(--space-lg)",
            }}
          >
            {t("editPraxis.ua.pageTitle")}
          </h1>

          {/* the task this mark answers to */}
          <div
            style={{
              border: "1px solid var(--faction-ua-rule)",
              borderRadius: "var(--radius-sm)",
              background: "var(--faction-ua-panel)",
              padding: "var(--space-md) var(--space-lg)",
            }}
          >
            <div style={UA_EYEBROW}>{t("editPraxis.ua.commissionLabel")}</div>
            <div
              style={{
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                fontSize: "var(--text-title)",
                lineHeight: 1.15,
                color: "var(--faction-ua-card-text)",
                margin: "var(--space-xs) 0",
                overflowWrap: "anywhere",
              }}
            >
              {praxis.task_title}
            </div>
            {task?.description && (
              <div
                style={{
                  fontFamily: UA_TEXT,
                  fontSize: "var(--text-content)",
                  lineHeight: 1.5,
                  color: "var(--faction-ua-card-body)",
                  overflowWrap: "anywhere",
                }}
              >
                {task.description}
              </div>
            )}
            <div
              style={{
                ...UA_EYEBROW,
                color: "var(--faction-ua-card-accent)",
                marginTop: "var(--space-xs)",
              }}
            >
              {t("editPraxis.ua.pointsLabel", {
                points: praxis.task_point_value,
              })}
            </div>
          </div>
        </Plate>

        {/* Mode */}
        {!state.controlsLocked && (
          <div style={{ marginBottom: "var(--space-xl)" }}>
            <FieldLabel>{t("editPraxis.ua.modeLabel")}</FieldLabel>
            <ModePicker
              state={state}
              skin={{
                containerStyle: {
                  display: "flex",
                  gap: "var(--space-md)",
                  flexWrap: "wrap",
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
                      minWidth: 150,
                      textAlign: "left",
                      padding: "var(--space-md) var(--space-lg)",
                      borderRadius: "var(--radius-sm)",
                      cursor: disabled && !active ? "not-allowed" : "pointer",
                      background: active
                        ? "var(--faction-ua)"
                        : "var(--faction-ua-card-bg)",
                      border: `1px solid ${
                        active ? "var(--faction-ua)" : "var(--faction-ua-rule)"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: UA_DISPLAY,
                        fontWeight: 600,
                        fontSize: "var(--text-content)",
                        lineHeight: 1.1,
                        color: active
                          ? "var(--faction-ua-on-fill)"
                          : "var(--faction-ua-card-text)",
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        ...UA_EYEBROW,
                        letterSpacing: "0.1em",
                        color: active
                          ? "var(--faction-ua-on-fill)"
                          : "var(--faction-ua-card-muted)",
                        marginTop: "var(--space-xs)",
                      }}
                    >
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
            <FieldLabel>
              {praxis.type === "duel"
                ? t("editPraxis.ua.inviteLabelDuel")
                : t("editPraxis.ua.inviteLabel")}
            </FieldLabel>
            <InviteSearch
              state={state}
              skin={{
                fontFamily: UA_TEXT,
                inputBg: "var(--faction-ua-panel)",
                inputColor: "var(--faction-ua-card-text)",
                inputBorder: "1px solid var(--faction-ua-rule)",
                dropdownBg: "var(--faction-ua-card-bg)",
                dropdownBorder: "1px solid var(--faction-ua-rule)",
                acceptedBg: "var(--faction-ua)",
                acceptedColor: "var(--faction-ua-on-fill)",
                placeholder: t("editPraxis.ua.invitePlaceholder"),
              }}
            />
          </Plate>
        )}

        {/* Title */}
        <Plate>
          <FieldLabel>{t("editPraxis.ua.titleLabel")}</FieldLabel>
          <TitleField
            state={state}
            skin={{
              placeholder: t("editPraxis.ua.titlePlaceholder"),
              inputStyle: {
                width: "100%",
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                fontSize: "var(--text-title)",
                color: "var(--faction-ua-card-text)",
                background: "transparent",
                border: "none",
                outline: "none",
                borderBottom: "1px solid var(--faction-ua-rule)",
                padding: "var(--space-xs) 0 var(--space-sm)",
              },
            }}
          />
          <div style={{ marginTop: "var(--space-sm)" }}>
            <TitleCounter
              length={state.title.length}
              color="var(--faction-ua-card-muted)"
            />
          </div>
        </Plate>

        {/* Body — a note on the mark */}
        <Plate>
          <FieldLabel>
            {t("editPraxis.ua.bodyLabel", { words: state.wordCount })}
          </FieldLabel>
          <BodyTextarea
            state={state}
            skin={{
              rows: 10,
              placeholder: t("editPraxis.ua.bodyPlaceholder"),
              textareaStyle: {
                width: "100%",
                fontFamily: UA_TEXT,
                fontSize: "var(--text-content)",
                lineHeight: 1.7,
                color: "var(--faction-ua-card-text)",
                background: "var(--faction-ua-panel)",
                border: "1px solid var(--faction-ua-rule)",
                borderRadius: "var(--radius-sm)",
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
              wrapperStyle: {
                borderTop: "1px solid var(--faction-ua-hair)",
                marginTop: "var(--space-md)",
                paddingTop: "var(--space-md)",
              },
              label: (
                <div style={{ ...UA_EYEBROW, marginBottom: "var(--space-sm)" }}>
                  {t("editPraxis.ua.previewLabel")}
                </div>
              ),
              markdownStyle: {
                fontFamily: UA_TEXT,
                lineHeight: 1.8,
                color: "var(--faction-ua-card-body)",
              },
            }}
          />
        </Plate>

        {/* The work — media */}
        <div style={{ marginBottom: "var(--space-xl)" }}>
          <FieldLabel>{t("editPraxis.ua.filesLabel")}</FieldLabel>
          <div
            style={{
              display: "flex",
              gap: "var(--space-lg)",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {state.media.map((item) => {
              const filename = item.file_path.split("/").pop() ?? item.file_path;
              const src = mediaUrl(item.file_path);
              return (
                <MediaPlate
                  key={item.id}
                  caption={filename}
                  onRemove={() => void state.removeMedia(item)}
                >
                  {item.type === "image" ? (
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: 140,
                        height: 100,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : item.type === "video" ? (
                    <video
                      src={src}
                      style={{
                        width: 140,
                        height: 100,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <MediaArt art={pickArtKey(filename, "audio")} />
                  )}
                </MediaPlate>
              );
            })}
            <FilePicker
              state={state}
              skin={{
                buttonStyle: {
                  width: 152,
                  height: 130,
                  background: "var(--faction-ua-panel)",
                  border: "1px dashed var(--faction-ua)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontFamily: UA_TEXT,
                  fontSize: "var(--text-content)",
                  color: "var(--faction-ua-card-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "var(--space-xs)",
                },
                buttonLabel: t("editPraxis.ua.fileButton"),
                errorColor: "var(--faction-ua-vermil)",
                helperText: t("editPraxis.ua.fileHelper"),
                helperStyle: {
                  ...UA_EYEBROW,
                  letterSpacing: "0.14em",
                  marginTop: "var(--space-sm)",
                },
              }}
            />
          </div>
        </div>

        {/* Metatasks */}
        {state.showSealStack && (
          <Plate>
            <FieldLabel>{t("editPraxis.ua.metatasksLabel")}</FieldLabel>
            <MetataskSealStack state={state} />
          </Plate>
        )}

        <ErrorBanner message={state.error} />

        {/* CTAs — the helper the copy deck wrote for this spot, then the seal */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-lg)",
            alignItems: "center",
            marginTop: "var(--space-xl)",
            paddingTop: "var(--space-lg)",
            borderTop: "1px solid var(--faction-ua-hair)",
            flexWrap: "wrap",
          }}
        >
          <DropButton
            state={state}
            skin={{
              label: t("editPraxis.ua.dropLabel"),
              style: {
                background: "transparent",
                border: "none",
                color: "var(--faction-ua-card-muted)",
                fontFamily: UA_TEXT,
                fontSize: "var(--text-content)",
                textDecoration: "underline",
                cursor: "pointer",
              },
            }}
          />
          <span
            style={{
              marginLeft: "auto",
              fontFamily: UA_TEXT,
              fontSize: "var(--text-content)",
              fontStyle: "italic",
              color: "var(--faction-ua-card-muted)",
            }}
          >
            {t("editPraxis.ua.publishHelper")}
          </span>
          <PublishButton
            state={state}
            skin={{
              idleLabel: t("editPraxis.ua.publishIdle"),
              busyLabel: t("editPraxis.ua.publishBusy"),
              style: {
                background: "var(--faction-ua)",
                color: "var(--faction-ua-on-fill)",
                fontFamily: UA_TEXT,
                fontSize: "var(--text-xl)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "var(--space-md) var(--space-xl)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: state.submitting ? "wait" : "pointer",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** One piece of the work — a hairline plate with its filename beneath. */
function MediaPlate({
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
    <div
      style={{
        position: "relative",
        background: "var(--faction-ua-panel)",
        border: "1px solid var(--faction-ua-rule)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-xs)",
      }}
    >
      <div
        style={{
          width: 140,
          height: 100,
          overflow: "hidden",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {children}
      </div>
      <div
        style={{
          ...UA_EYEBROW,
          letterSpacing: "0.08em",
          textAlign: "center",
          marginTop: "var(--space-xs)",
          maxWidth: 140,
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
          borderRadius: "50%",
          background: "var(--faction-ua-card-bg)",
          border: "1.5px solid var(--faction-ua)",
          color: "var(--faction-ua-card-accent)",
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
