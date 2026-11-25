/**
 * Operator details for the Impressum and the privacy policy.
 *
 * They come from environment variables (set in Vercel) so that the operator's
 * personal address never sits in the repository. Until they are set, the pages
 * show placeholders and a "draft" notice.
 */
export interface LegalOperator {
  name: string;
  street: string;
  city: string;
  email: string;
  phone: string | null;
  /** Shown once a business is registered, e.g. "Einzelunternehmen". */
  form: string | null;
  vatId: string | null;
}

const PLACEHOLDER = {
  name: "[Name des Betreibers]",
  street: "[Straße und Hausnummer]",
  city: "[PLZ Ort]",
  email: "[E-Mail-Adresse]",
};

function env(key: string): string | null {
  const v = process.env[key]?.trim();
  return v ? v : null;
}

export function legalOperator(): { operator: LegalOperator; complete: boolean } {
  const name = env("LEGAL_NAME");
  const street = env("LEGAL_STREET");
  const city = env("LEGAL_CITY");
  const email = env("LEGAL_EMAIL");
  return {
    operator: {
      name: name ?? PLACEHOLDER.name,
      street: street ?? PLACEHOLDER.street,
      city: city ?? PLACEHOLDER.city,
      email: email ?? PLACEHOLDER.email,
      phone: env("LEGAL_PHONE"),
      form: env("LEGAL_FORM"),
      vatId: env("LEGAL_VAT_ID"),
    },
    complete: Boolean(name && street && city && email),
  };
}

/** Date of the current version of the privacy policy (update with every content change). */
export const PRIVACY_VERSION_DATE = "25.11.2026";
