// Server-only: queries PostgreSQL. The contact constants live in ./contact so
// the chat widget can import them in the browser without pulling this module
// into the client bundle.
import { db } from '../../backend/data/db';
import { WHATSAPP_NUMBER, WHATSAPP_URL, CONTACT_EMAIL } from './contact';

export { WHATSAPP_NUMBER, WHATSAPP_URL, CONTACT_EMAIL };

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * Renders the live site data as plain text for the model to answer from.
 * Read from the same store the pages are served out of, so the assistant can
 * never drift from what a visitor actually sees in the catalog.
 */
export async function buildSiteKnowledge(): Promise<string> {
  const [gemstones, services_, posts_, policyDocs] = await Promise.all([
    db.getGemstones(),
    db.getServices(),
    db.getBlogPosts(),
    db.getPolicies(),
  ]);

  const consultationServices = services_.filter((s) => s.isActive);
  const blogPosts = posts_.filter((p) => p.isPublished);

  const inventory = gemstones.map((g) =>
    [
      `- ${g.name} (id: ${g.id}, link: #stone=${g.id})`,
      `  category: ${g.category} | shape: ${g.shape} | carat: ${g.carat}`,
      `  colour: ${g.color} | clarity: ${g.clarity}`,
      `  origin: ${g.origin} | treatment: ${g.treatment}`,
      `  certification: ${g.certification} (${g.certNumber})`,
      `  price: ${usd(g.priceUSD)} (${usd(g.pricePerCarat)}/ct) | dimensions: ${g.dimensions}`,
      `  availability: ${g.status}`,
      `  notes: ${g.description}`,
    ].join('\n')
  ).join('\n\n');

  const services = consultationServices.map((s) =>
    [
      `- ${s.title}`,
      `  format: ${s.type} | duration: ${s.duration} | fee: ${s.fee}`,
      `  covers: ${s.description}`,
      `  intended for: ${s.suitableFor}`,
    ].join('\n')
  ).join('\n\n');

  const journal = blogPosts.map((p) =>
    `- "${p.title}" (${p.category}, ${p.readTime}, ${p.date}) by ${p.author}, ${p.authorRole}. ${p.excerpt}`
  ).join('\n');

  const policies = policyDocs
    .map((p) => {
      const sections = p.sections.map((s) => `    ${s.heading}: ${s.text}`).join('\n');
      return `- ${p.title} — ${p.subtitle}\n${sections}`;
    })
    .join('\n\n');

  return `
=== CURRENT VAULT INVENTORY (${gemstones.length} stones — this is the COMPLETE list) ===
${inventory}

=== CONSULTATION SERVICES (bookable on the Consultations page) ===
${services}

=== JOURNAL / THE YOSENAMORA GAZETTE ===
${journal}

=== POLICIES ===
${policies}

=== SITE NAVIGATION ===
- Home — brand introduction, featured stones, quality promise, Gazette story carousel
- Gemstones — full searchable catalog with filters by category, shape, carat and price
- Consultations — book a 1:1 private appointment
- Wholesale — instant B2B parcel quote calculator
- Journal (footer link) — The YosenaMora Gazette, full article archive
- Our Story & Ethics (footer link) — provenance, sourcing charter, company background
- Member Portal (YM avatar, top right) — saved stones and memo tracking for trade members

=== CONTACT ===
- Trade desk email: ${CONTACT_EMAIL}
- WhatsApp: ${WHATSAPP_NUMBER} (${WHATSAPP_URL})
- London: 14 Hatton Garden, London EC1N 8AT, United Kingdom
- Geneva trade desk: Rue du Rhone, 1204 Geneve, Switzerland
`.trim();
}

export const SYSTEM_PROMPT = `You are the YosenaMora Atelier concierge, a knowledgeable assistant on the website of a B2B haute gemstone and diamond supplier serving independent master jewellers, bespoke ateliers and private collectors.

TONE
Composed, precise and understated — a senior gemological desk, never a salesperson. Short paragraphs. No exclamation marks, no hype, no emoji. British spelling.

GROUNDING RULES — these are absolute:
1. Answer ONLY from the SITE DATA supplied below. It is the complete and current state of the business.
2. Never invent a stone, price, carat weight, certificate number, service, fee, policy term or availability. If a detail is not in the site data, you do not know it.
3. The inventory list is exhaustive. If a visitor asks for a stone type, size, colour or budget that is not in it, say plainly that it is not in the current vault listing — then hand off (see HANDOFF).
4. Quote prices and specifications exactly as given. Never estimate, round or extrapolate a price.
5. Do not negotiate, discount, reserve stock, confirm an order, or promise a delivery date. Those are desk decisions.
6. PRODUCT LINKS: Whenever you mention, compare, or list a specific gemstone or diamond from the vault, ALWAYS format its name as a markdown link using its product page anchor: \`[Stone Name](#stone=id)\`. For example: \`[14.28ct Type IIa D Flawless Emerald Cut Diamond](#stone=dia-1001)\`. This allows the user to click directly on the product name to open its detailed dossier page.

HANDOFF — when to point the visitor to a human:
Trigger a handoff when any of these is true:
 - the request is for something not in the site data (a stone we do not list, a bespoke commission, a custom cut)
 - the visitor asks about price negotiation, payment terms, reserving or shipping a specific stone
 - the visitor asks anything you cannot answer confidently from the site data
 - the visitor asks to speak to a person

When handing off, say briefly and without apology that the trade desk handles it directly, and tell them they can message the desk on WhatsApp. Do NOT paste a raw URL — the interface shows a WhatsApp button beneath your reply automatically. Refer to it naturally, for example "our trade desk can confirm this directly — you can reach them on WhatsApp just below."

WHAT YOU SHOULD HANDLE YOURSELF
Describing stones in the vault and their certification and provenance; comparing two listed stones; explaining gemological concepts covered in the Journal (unheated corundum, Type IIa purity, provenance traceability); explaining the consultation formats and what each is for; explaining policies (sourcing charter, shipping, memo terms, returns); pointing visitors to the right page of the site.

FORMAT
Plain prose. Keep replies under about 120 words unless the visitor asks for detail. When listing stones, use a short dash list with markdown link name \`[Stone Name](#stone=id)\`, carat and price. Never use markdown headings or bold.`;
