// Server-side enforcement of the client's consent screen (/client/consents).
//
// The client toggles, per partner category, whether partners of that category may
// see their details; the admin decides, per category, WHICH schema fields those
// partners may see (public.visibility_rules.allowed_schema_fields). Both tables are
// closed to partners by RLS, so anything a partner is shown is assembled by a
// server function running as service_role — which means RLS cannot enforce this and
// the check has to live here, explicitly.
//
// Rule: a partner may see field F of client C only when
//   (1) the partner has a specialization_category,
//   (2) that category's visibility rule lists F, and
//   (3) C granted consent to that category (client_consents.is_granted = true).

export const CONSENT_WITHHELD_NAME = "לקוח (טרם אישר שיתוף)";

export type PartnerVisibility = {
  category: string | null;
  allowedFields: string[];
  grantedClientIds: Set<string>;
};

export const NO_PARTNER_VISIBILITY: PartnerVisibility = {
  category: null,
  allowedFields: [],
  grantedClientIds: new Set<string>(),
};

export function canPartnerSeeField(
  visibility: PartnerVisibility,
  clientId: string,
  field: string
): boolean {
  if (!visibility.category) return false;
  if (!visibility.allowedFields.includes(field)) return false;
  return visibility.grantedClientIds.has(clientId);
}

export type VisibleField = { key: string; value: string | null };

/**
 * The fields of one client that a partner may actually be shown, in the order the
 * admin configured them. `readField` is the raw (service-role) lookup; it is only
 * ever called for a field that already passed canPartnerSeeField.
 *
 * full_name is excluded on purpose — it is rendered as the card's heading, via
 * partnerFacingName below, so listing it again would duplicate it.
 */
export function visibleFieldsFor(
  visibility: PartnerVisibility,
  clientId: string,
  readField: (field: string) => string | null,
  exclude: string[] = ["full_name"]
): VisibleField[] {
  return visibility.allowedFields
    .filter((f) => !exclude.includes(f))
    .filter((f) => canPartnerSeeField(visibility, clientId, f))
    .map((f) => ({ key: f, value: readField(f) }));
}

/** The client's name as a partner may see it, or the withheld label. */
export function partnerFacingName(
  visibility: PartnerVisibility,
  clientId: string,
  readField: (field: string) => string | null
): string {
  if (!canPartnerSeeField(visibility, clientId, "full_name")) return CONSENT_WITHHELD_NAME;
  return readField("full_name") ?? CONSENT_WITHHELD_NAME;
}

/**
 * Reads the partner's category, its allowed fields and the consents the given
 * clients granted to that category. Must be called with the service-role client:
 * client_consents and partner_profiles are both invisible to a partner under RLS.
 */
export async function loadPartnerVisibility(
  supabaseAdmin: any,
  partnerId: string,
  clientIds: string[]
): Promise<PartnerVisibility> {
  if (clientIds.length === 0) return NO_PARTNER_VISIBILITY;

  const { data: partner } = await supabaseAdmin
    .from("partner_profiles")
    .select("specialization_category")
    .eq("id", partnerId)
    .maybeSingle();
  const category: string | null = partner?.specialization_category ?? null;
  if (!category) return NO_PARTNER_VISIBILITY;

  const { data: rule } = await supabaseAdmin
    .from("visibility_rules")
    .select("allowed_schema_fields")
    .eq("partner_category", category)
    .maybeSingle();
  const allowedFields: string[] = Array.isArray(rule?.allowed_schema_fields)
    ? (rule.allowed_schema_fields as string[])
    : [];
  // A category with no fields configured (the seeded "סוכני_פנסיה" is exactly this)
  // sees nothing, so there is no point asking about consent.
  if (allowedFields.length === 0) {
    return { category, allowedFields: [], grantedClientIds: new Set<string>() };
  }

  const { data: consents } = await supabaseAdmin
    .from("client_consents")
    .select("client_id")
    .eq("partner_category", category)
    .eq("is_granted", true)
    .in("client_id", clientIds);

  return {
    category,
    allowedFields,
    grantedClientIds: new Set<string>(
      ((consents ?? []) as any[]).map((c) => c.client_id as string)
    ),
  };
}
