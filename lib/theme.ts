import type { CSSProperties } from 'react'

// Shape of Client.theme (Json column) — one definition shared by the public quiz page, the
// builder's live preview, and BrandSettingsForm, so all three can never drift out of sync.
export type ClientTheme = {
  primary: string
  secondary: string
  font?: string
  radius?: string
  logoUrl?: string
  progressColor?: string
  progressTrackColor?: string
  questionColor?: string
  errorColor?: string
  pageBackground?: string
  cardBackground?: string
  fieldBackground?: string
  buttonColor?: string
  textColor?: string
  fontSize?: string
  fieldBorderColor?: string
  fieldBorderWidth?: string
  buttonBorderColor?: string
  buttonBorderWidth?: string
  hoverColor?: string
  hoverTextColor?: string
  // "on" = a soft shadow round the form when it's embedded on a site, so it stands out on a
  // white page (embeds are otherwise flat — see .quiz-embedded in app/globals.css).
  cardShadow?: string
}

// Turns a client's theme into the CSS custom properties `.quiz-page` and its children read
// (app/globals.css). Used by both the real public quiz page and the builder's live preview so
// the preview is pixel-for-pixel what visitors actually see.
export function themeToCssVars(theme: ClientTheme): CSSProperties {
  return {
    '--quiz-primary': theme.primary,
    '--quiz-secondary': theme.secondary,
    '--quiz-radius': theme.radius ? `${theme.radius}px` : '20px',
    '--quiz-font': theme.font ?? "'General Sans', Inter, sans-serif",
    ...(theme.progressColor ? { '--quiz-progress': theme.progressColor } : {}),
    ...(theme.progressTrackColor ? { '--quiz-progress-track': theme.progressTrackColor } : {}),
    ...(theme.questionColor ? { '--quiz-question-color': theme.questionColor } : {}),
    ...(theme.errorColor ? { '--quiz-error-color': theme.errorColor } : {}),
    ...(theme.pageBackground ? { '--quiz-page-bg': theme.pageBackground } : {}),
    ...(theme.cardBackground ? { '--quiz-card-bg': theme.cardBackground } : {}),
    ...(theme.fieldBackground ? { '--quiz-field-bg': theme.fieldBackground } : {}),
    ...(theme.buttonColor ? { '--quiz-button-bg': theme.buttonColor } : {}),
    ...(theme.textColor ? { '--quiz-text': theme.textColor } : {}),
    ...(theme.fontSize ? { '--quiz-font-size': `${theme.fontSize}px` } : {}),
    ...(theme.fieldBorderWidth && Number(theme.fieldBorderWidth) > 0
      ? { '--quiz-field-border': `${theme.fieldBorderWidth}px solid ${theme.fieldBorderColor || '#e5ddd0'}` }
      : {}),
    ...(theme.buttonBorderWidth && Number(theme.buttonBorderWidth) > 0
      ? { '--quiz-button-border': `${theme.buttonBorderWidth}px solid ${theme.buttonBorderColor || '#000'}` }
      : {}),
    ...(theme.hoverColor ? { '--quiz-hover-bg': theme.hoverColor } : {}),
    ...(theme.hoverTextColor ? { '--quiz-hover-text': theme.hoverTextColor } : {}),
    // The gap leaves the shadow room inside the iframe so its edges aren't clipped.
    ...(theme.cardShadow === 'on' ? { '--quiz-embed-shadow': '0 2px 16px rgba(0, 0, 0, 0.08)', '--quiz-embed-gap': '12px' } : {}),
  } as CSSProperties
}

/**
 * Layers a per-quiz theme override on top of a client's base theme — any override field that's
 * unset or blank falls through to the client's value untouched. Used so a single quiz can get its
 * own colors without a database migration: the override just lives inside Quiz.schema (JSON),
 * never touching Client.theme or requiring a new column.
 */
export function mergeTheme(base: ClientTheme, override?: Partial<ClientTheme>): ClientTheme {
  if (!override) return base
  const result = { ...base }
  for (const key of Object.keys(override) as (keyof ClientTheme)[]) {
    const value = override[key]
    if (value !== undefined && value !== '') (result as any)[key] = value
  }
  return result
}
