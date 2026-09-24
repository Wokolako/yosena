import { query, queryOne, transaction } from './pool';

/**
 * Data access layer, backed by PostgreSQL (schema in backend/schema.sql).
 *
 * Every method is async. Rows come out of the database in snake_case and are
 * mapped here to the camelCase shapes the API responses and the front end
 * already use, so the JSON on the wire is unchanged from the file-backed
 * version this replaces.
 *
 * Writes are targeted (`createBooking`, `updateGemstoneStatus`) rather than
 * "save the whole collection": the previous JSON store had to rewrite an entire
 * file per change, which against SQL would mean deleting and reinserting every
 * row.
 */

/* ------------------------------------------------------------------ types */

export interface GemstoneData {
  id: string;
  name: string;
  category: 'Diamond' | 'Sapphire' | 'Emerald' | 'Ruby' | 'Spinel' | 'Tourmaline';
  shape: 'Emerald Cut' | 'Cushion' | 'Round Brilliant' | 'Oval' | 'Pear' | 'Asscher';
  carat: number;
  color: string;
  clarity: string;
  origin: string;
  treatment: string;
  certification: string;
  certNumber: string;
  priceUSD: number;
  pricePerCarat: number;
  dimensions: string;
  image: string;
  featured?: boolean;
  status: 'In Vault' | 'On Memo' | 'Reserved';
  description: string;
}

export interface UserData {
  id: string;
  /** The Clerk account this trade record belongs to; null until first sign-in. */
  clerkUserId: string | null;
  email: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: 'trade_partner' | 'admin' | 'jeweller';
  tier: string;
  creditLineUSD: number;
  phone: string;
  address: string;
  isVerifiedTrade: boolean;
  createdAt: string;
  savedStoneIds: string[];
  preferences: {
    notifyDrops: boolean;
    notifyMemos: boolean;
  };
}

export interface MemoData {
  id: string;
  userId: string;
  memberId: string;
  companyName: string;
  stoneId: string;
  stoneName: string;
  dateDispatched: string;
  daysRemaining: number;
  courier: string;
  tracking: string;
  declaredValueUSD: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface BookingData {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  time: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  specificInquiry: string;
  status: 'Confirmed' | 'Pending Review' | 'Cancelled';
  referenceNumber: string;
  createdAt: string;
}

export interface QuoteData {
  id: string;
  gemType: string;
  shape: string;
  caratMin: number;
  caratMax: number;
  targetBudget: number;
  quantity: number;
  certificationPreference: string;
  jewellerBusiness: string;
  contactEmail: string;
  notes: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  status: string;
  createdAt: string;
}

export interface OrderItemData {
  gemstoneId: string;
  name: string;
  carat: number;
  priceUSD: number;
  quantity: number;
}

export interface OrderData {
  id: string;
  userId?: string;
  memberId?: string;
  clientName: string;
  companyName: string;
  email: string;
  items: OrderItemData[];
  totalUSD: number;
  paymentMethod: string;
  shippingService: string;
  status: string;
  createdAt: string;
}

export interface ServiceData {
  id: string;
  title: string;
  duration: string;
  type: 'Virtual' | 'In-Person Vault' | 'Atelier Visit';
  fee: string;
  description: string;
  suitableFor: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BlogPostData {
  id: string;
  title: string;
  category: 'Gemology' | 'Market Intelligence' | 'Ethical Sourcing' | 'Atelier Craft';
  readTime: string;
  date: string;
  excerpt: string;
  author: string;
  authorRole: string;
  image: string;
  content: string[];
  sortOrder: number;
  isPublished: boolean;
}

export interface PolicySectionData {
  heading: string;
  text: string;
  sortOrder: number;
}

export interface PolicyData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  sections: PolicySectionData[];
}

/* ---------------------------------------------------------------- mapping */

/**
 * NUMERIC comes back from pg as a string, because values beyond IEEE-754 range
 * would silently lose precision as JS numbers. Prices here are well inside it,
 * and the API has always emitted numbers, so they are converted on the way out.
 */
const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

/** DATE columns arrive as a JS Date; the API has always sent 'YYYY-MM-DD'. */
const dateOnly = (value: unknown): string => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
};

const timestamp = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

const toGemstone = (r: any): GemstoneData => ({
  id: r.id,
  name: r.name,
  category: r.category,
  shape: r.shape,
  carat: num(r.carat),
  color: r.color,
  clarity: r.clarity,
  origin: r.origin,
  treatment: r.treatment,
  certification: r.certification,
  certNumber: r.cert_number,
  priceUSD: num(r.price_usd),
  pricePerCarat: num(r.price_per_carat),
  dimensions: r.dimensions,
  image: r.image,
  featured: r.featured,
  status: r.status,
  description: r.description,
});

const toUser = (r: any): UserData => ({
  id: r.id,
  clerkUserId: r.clerk_user_id ?? null,
  email: r.email,
  clientName: r.client_name,
  companyName: r.company_name,
  memberId: r.member_id,
  accountRole: r.account_role,
  tier: r.tier,
  creditLineUSD: num(r.credit_line_usd),
  phone: r.phone,
  address: r.address,
  isVerifiedTrade: r.is_verified_trade,
  createdAt: timestamp(r.created_at),
  // Aggregated from saved_stones by the read queries below.
  savedStoneIds: r.saved_stone_ids ?? [],
  preferences: {
    notifyDrops: r.notify_drops,
    notifyMemos: r.notify_memos,
  },
});

const toMemo = (r: any): MemoData => ({
  id: r.id,
  userId: r.user_id,
  memberId: r.member_id,
  companyName: r.company_name,
  stoneId: r.gemstone_id,
  stoneName: r.stone_name,
  dateDispatched: dateOnly(r.date_dispatched),
  // Computed by the active_memos view, never stored.
  daysRemaining: num(r.days_remaining),
  courier: r.courier,
  tracking: r.tracking,
  declaredValueUSD: num(r.declared_value_usd),
  status: r.status,
  notes: r.notes ?? undefined,
  createdAt: timestamp(r.created_at),
});

const toBooking = (r: any): BookingData => ({
  id: r.id,
  serviceId: r.service_id ?? '',
  serviceTitle: r.service_title,
  date: dateOnly(r.appointment_date),
  time: r.appointment_time,
  clientName: r.client_name,
  companyName: r.company_name,
  email: r.email,
  phone: r.phone,
  specificInquiry: r.specific_inquiry,
  status: r.status,
  referenceNumber: r.reference_number,
  createdAt: timestamp(r.created_at),
});

const toQuote = (r: any): QuoteData => ({
  id: r.id,
  gemType: r.gem_type,
  shape: r.shape,
  caratMin: num(r.carat_min),
  caratMax: num(r.carat_max),
  targetBudget: num(r.target_budget),
  quantity: num(r.quantity),
  certificationPreference: r.certification_preference,
  jewellerBusiness: r.jeweller_business,
  contactEmail: r.contact_email,
  notes: r.notes,
  estimatedUnitPrice: r.estimated_unit_price === null ? undefined : num(r.estimated_unit_price),
  estimatedTotal: r.estimated_total === null ? undefined : num(r.estimated_total),
  status: r.status,
  createdAt: timestamp(r.created_at),
});

const toOrder = (r: any): OrderData => ({
  id: r.id,
  userId: r.user_id ?? undefined,
  memberId: r.member_id ?? undefined,
  clientName: r.client_name,
  companyName: r.company_name,
  email: r.email,
  // Aggregated as JSON by the read queries so one round trip returns the lines.
  items: (r.items ?? []).map((i: any) => ({
    gemstoneId: i.gemstone_id,
    name: i.name,
    carat: num(i.carat),
    priceUSD: num(i.price_usd),
    quantity: num(i.quantity),
  })),
  totalUSD: num(r.total_usd),
  paymentMethod: r.payment_method,
  shippingService: r.shipping_service,
  status: r.status,
  createdAt: timestamp(r.created_at),
});

const toService = (r: any): ServiceData => ({
  id: r.id,
  title: r.title,
  duration: r.duration,
  type: r.type,
  fee: r.fee,
  description: r.description,
  suitableFor: r.suitable_for,
  sortOrder: num(r.sort_order),
  isActive: r.is_active,
});

const toBlogPost = (r: any): BlogPostData => ({
  id: r.id,
  title: r.title,
  category: r.category,
  readTime: r.read_time,
  date: r.display_date,
  excerpt: r.excerpt,
  author: r.author,
  authorRole: r.author_role,
  image: r.image,
  content: r.body_paragraphs ?? [],
  sortOrder: num(r.sort_order),
  isPublished: r.is_published,
});

const toPolicy = (r: any): PolicyData => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  sortOrder: num(r.sort_order),
  sections: (r.sections ?? []).map((s: any) => ({
    heading: s.heading,
    text: s.body,
    sortOrder: num(s.sort_order),
  })),
});

/* --------------------------------------------------------------- queries */

const USER_SELECT = `
  SELECT u.*,
         COALESCE(
           (SELECT array_agg(s.gemstone_id ORDER BY s.saved_at)
            FROM saved_stones s WHERE s.user_id = u.id),
           '{}'
         ) AS saved_stone_ids
  FROM users u
`;

const ORDER_SELECT = `
  SELECT o.*,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'gemstone_id', i.gemstone_id,
              'name',        i.name,
              'carat',       i.carat,
              'price_usd',   i.price_usd,
              'quantity',    i.quantity
            ) ORDER BY i.id)
            FROM order_items i WHERE i.order_id = o.id),
           '[]'::json
         ) AS items
  FROM orders o
`;

const POLICY_SELECT = `
  SELECT p.*,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'heading',    ps.heading,
              'body',       ps.body,
              'sort_order', ps.sort_order
            ) ORDER BY ps.sort_order)
            FROM policy_sections ps WHERE ps.policy_id = p.id),
           '[]'::json
         ) AS sections
  FROM policies p
`;

export const db = {
  /* -------------------------------------------------------- gemstones */

  async getGemstones(): Promise<GemstoneData[]> {
    const rows = await query('SELECT * FROM gemstones ORDER BY featured DESC, price_usd DESC');
    return rows.map(toGemstone);
  },

  async getGemstoneById(id: string): Promise<GemstoneData | null> {
    const row = await queryOne('SELECT * FROM gemstones WHERE id = $1', [id]);
    return row ? toGemstone(row) : null;
  },

  async updateGemstoneStatus(
    id: string,
    status: GemstoneData['status']
  ): Promise<GemstoneData | null> {
    const row = await queryOne(
      'UPDATE gemstones SET status = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, status]
    );
    return row ? toGemstone(row) : null;
  },

  async createGemstone(stone: GemstoneData): Promise<GemstoneData> {
    const row = await queryOne(
      `INSERT INTO gemstones
         (id, name, category, shape, carat, color, clarity, origin, treatment,
          certification, cert_number, price_usd, price_per_carat, dimensions,
          image, featured, status, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        stone.id, stone.name, stone.category, stone.shape, stone.carat,
        stone.color, stone.clarity, stone.origin, stone.treatment,
        stone.certification, stone.certNumber, stone.priceUSD, stone.pricePerCarat,
        stone.dimensions, stone.image, stone.featured ?? false, stone.status,
        stone.description,
      ]
    );
    return toGemstone(row);
  },

  /* ------------------------------------------------------------ users */

  async getUsers(): Promise<UserData[]> {
    const rows = await query(`${USER_SELECT} ORDER BY u.created_at`);
    return rows.map(toUser);
  },

  /** Case-insensitive, matching the unique index on lower(email). */
  async getUserByEmail(email: string): Promise<UserData | null> {
    const row = await queryOne(`${USER_SELECT} WHERE lower(u.email) = lower($1)`, [email]);
    return row ? toUser(row) : null;
  },

  async getUserById(id: string): Promise<UserData | null> {
    const row = await queryOne(`${USER_SELECT} WHERE u.id = $1`, [id]);
    return row ? toUser(row) : null;
  },

  async getUserByClerkId(clerkUserId: string): Promise<UserData | null> {
    const row = await queryOne(`${USER_SELECT} WHERE u.clerk_user_id = $1`, [clerkUserId]);
    return row ? toUser(row) : null;
  },

  /**
   * Resolves a Clerk account to its trade record, creating one on first sign-in.
   *
   * Three cases, in order:
   *   1. already linked            -> return it
   *   2. a record exists for that email (a desk-created trade account, or a
   *      member carried over from the previous auth system) -> adopt it
   *   3. nothing yet               -> create an unverified trade record
   *
   * Runs in a transaction so two concurrent requests from the same new account
   * cannot both reach step 3 and race to insert.
   */
  async resolveClerkUser(input: {
    clerkUserId: string;
    email: string;
    clientName: string;
  }): Promise<UserData> {
    const { clerkUserId, email, clientName } = input;

    const linked = await db.getUserByClerkId(clerkUserId);

    if (linked) {
      // Clerk owns the identity, so it is the authority on the address and the
      // name. Someone who changes either one in Clerk would otherwise keep the
      // values captured at their first sign-in forever, and the desk would be
      // writing to a stale address. Only touched when it actually differs.
      const emailChanged = email && email.toLowerCase() !== String(linked.email ?? '').toLowerCase();
      const nameChanged = clientName && clientName !== linked.clientName;

      if (!emailChanged && !nameChanged) return linked;

      await query(
        `UPDATE users
            SET email = COALESCE($2, email),
                client_name = COALESCE($3, client_name)
          WHERE id = $1`,
        [linked.id, email ? email.toLowerCase() : null, clientName || null]
      );

      return (await db.getUserById(linked.id))!;
    }

    return transaction(async (client) => {
      const existing = await client.query(
        'SELECT id FROM users WHERE lower(email) = lower($1) FOR UPDATE',
        [email]
      );

      if (existing.rows.length > 0) {
        await client.query('UPDATE users SET clerk_user_id = $2 WHERE id = $1', [
          existing.rows[0].id,
          clerkUserId,
        ]);
        const { rows } = await client.query(`${USER_SELECT} WHERE u.id = $1`, [
          existing.rows[0].id,
        ]);
        return toUser(rows[0]);
      }

      // New to the business. Trade verification and credit are desk decisions,
      // so a self-serve signup starts with neither.
      const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const memberId = `YM-TRADE-${Math.floor(1000 + Math.random() * 9000)}`;

      await client.query(
        `INSERT INTO users
           (id, clerk_user_id, email, client_name, company_name, member_id,
            account_role, tier, credit_line_usd, is_verified_trade)
         VALUES ($1,$2,$3,$4,'',$5,'trade_partner','Registered Trade Partner',0,FALSE)`,
        [id, clerkUserId, email.toLowerCase(), clientName, memberId]
      );

      const { rows } = await client.query(`${USER_SELECT} WHERE u.id = $1`, [id]);
      return toUser(rows[0]);
    });
  },

  /**
   * Detaches a Clerk identity from its trade record.
   *
   * Used when Clerk reports the account deleted. The row itself is kept: memos
   * reference users with ON DELETE RESTRICT and orders with SET NULL, so the
   * consignment and settlement history is deliberately not something a sign-up
   * screen can erase. Clearing clerk_user_id means nobody can sign in as them
   * again, while the desk keeps its books. Should that person ever return under
   * the same address, resolveClerkUser adopts the record back.
   */
  async unlinkClerkUser(clerkUserId: string): Promise<boolean> {
    const rows = await query<{ id: string }>(
      'UPDATE users SET clerk_user_id = NULL WHERE clerk_user_id = $1 RETURNING id',
      [clerkUserId]
    );
    return rows.length > 0;
  },

  /** Used by the trade desk to pre-create an account before its first sign-in. */
  async createUser(user: UserData): Promise<UserData> {
    await query(
      `INSERT INTO users
         (id, clerk_user_id, email, client_name, company_name, member_id,
          account_role, tier, credit_line_usd, phone, address,
          is_verified_trade, notify_drops, notify_memos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        user.id, user.clerkUserId, user.email, user.clientName, user.companyName,
        user.memberId, user.accountRole, user.tier, user.creditLineUSD,
        user.phone, user.address, user.isVerifiedTrade,
        user.preferences.notifyDrops, user.preferences.notifyMemos,
      ]
    );
    return (await db.getUserById(user.id))!;
  },

  async setSavedStone(userId: string, gemstoneId: string, saved: boolean): Promise<void> {
    if (saved) {
      await query(
        `INSERT INTO saved_stones (user_id, gemstone_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, gemstoneId]
      );
    } else {
      await query('DELETE FROM saved_stones WHERE user_id = $1 AND gemstone_id = $2', [
        userId,
        gemstoneId,
      ]);
    }
  },

  async updateUserProfile(
    userId: string,
    fields: {
      phone: string;
      address: string;
      preferences: { notifyDrops: boolean; notifyMemos: boolean };
    }
  ): Promise<void> {
    await query(
      `UPDATE users
         SET phone = $2, address = $3, notify_drops = $4, notify_memos = $5
       WHERE id = $1`,
      [
        userId,
        fields.phone,
        fields.address,
        fields.preferences.notifyDrops,
        fields.preferences.notifyMemos,
      ]
    );
  },

  /**
   * Replaces a member's shortlist wholesale. Done in one transaction so a
   * failure part way cannot leave the vault holding a partial set.
   */
  async replaceSavedStones(userId: string, gemstoneIds: string[]): Promise<void> {
    await transaction(async (client) => {
      await client.query('DELETE FROM saved_stones WHERE user_id = $1', [userId]);
      for (const gemstoneId of gemstoneIds) {
        await client.query(
          `INSERT INTO saved_stones (user_id, gemstone_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userId, gemstoneId]
        );
      }
    });
  },

  /* ------------------------------------------------------------ memos */

  // Reads go through active_memos, which derives days_remaining from the
  // inspection deadline rather than storing a countdown that goes stale.
  async getMemos(): Promise<MemoData[]> {
    const rows = await query('SELECT * FROM active_memos ORDER BY created_at DESC');
    return rows.map(toMemo);
  },

  async getMemosForUser(userId: string, memberId: string): Promise<MemoData[]> {
    const rows = await query(
      'SELECT * FROM active_memos WHERE user_id = $1 OR member_id = $2 ORDER BY created_at DESC',
      [userId, memberId]
    );
    return rows.map(toMemo);
  },

  /**
   * Issuing a memo also moves the stone to 'On Memo'. Both happen in one
   * transaction so a stone can never be marked out on a consignment that
   * failed to record.
   */
  async createMemo(memo: MemoData, inspectionDays = 14): Promise<MemoData> {
    return transaction(async (client) => {
      await client.query(
        `INSERT INTO memos
           (id, user_id, member_id, company_name, gemstone_id, stone_name,
            date_dispatched, inspection_due, courier, tracking,
            declared_value_usd, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7::date + $8::int,$9,$10,$11,$12,$13)`,
        [
          memo.id, memo.userId, memo.memberId, memo.companyName, memo.stoneId,
          memo.stoneName, memo.dateDispatched, inspectionDays, memo.courier,
          memo.tracking, memo.declaredValueUSD, memo.status, memo.notes ?? null,
        ]
      );

      await client.query(`UPDATE gemstones SET status = 'On Memo', updated_at = now() WHERE id = $1`, [
        memo.stoneId,
      ]);

      const { rows } = await client.query('SELECT * FROM active_memos WHERE id = $1', [memo.id]);
      return toMemo(rows[0]);
    });
  },

  async getMemoById(id: string): Promise<MemoData | null> {
    const row = await queryOne('SELECT * FROM active_memos WHERE id = $1', [id]);
    return row ? toMemo(row) : null;
  },

  /**
   * `releaseStone` puts the consigned stone back to 'In Vault' in the same
   * transaction as the status change, so a returned memo can never leave a
   * stone stuck showing as out.
   */
  async updateMemoStatus(
    id: string,
    status: string,
    notes?: string,
    releaseStone = false
  ): Promise<MemoData | null> {
    return transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE memos
            SET status = $2,
                notes = COALESCE($3, notes)
          WHERE id = $1
        RETURNING gemstone_id`,
        [id, status, notes ?? null]
      );

      if (rows.length === 0) return null;

      if (releaseStone && rows[0].gemstone_id) {
        await client.query(
          `UPDATE gemstones SET status = 'In Vault', updated_at = now() WHERE id = $1`,
          [rows[0].gemstone_id]
        );
      }

      const result = await client.query('SELECT * FROM active_memos WHERE id = $1', [id]);
      return toMemo(result.rows[0]);
    });
  },

  /* --------------------------------------------------------- bookings */

  async getBookings(): Promise<BookingData[]> {
    const rows = await query('SELECT * FROM bookings ORDER BY created_at DESC');
    return rows.map(toBooking);
  },

  async getBookingsByEmail(email: string): Promise<BookingData[]> {
    const rows = await query(
      'SELECT * FROM bookings WHERE lower(email) = lower($1) ORDER BY created_at DESC',
      [email]
    );
    return rows.map(toBooking);
  },

  /** Accepts either the internal id or the client-facing reference number. */
  async getBookingByIdOrReference(id: string): Promise<BookingData | null> {
    const row = await queryOne(
      'SELECT * FROM bookings WHERE id = $1 OR reference_number = $1',
      [id]
    );
    return row ? toBooking(row) : null;
  },

  async getBookingsOnDate(date: string): Promise<BookingData[]> {
    const rows = await query(
      `SELECT * FROM bookings WHERE appointment_date = $1 AND status <> 'Cancelled'`,
      [date]
    );
    return rows.map(toBooking);
  },

  async createBooking(booking: BookingData): Promise<BookingData> {
    const row = await queryOne(
      `INSERT INTO bookings
         (id, service_id, service_title, appointment_date, appointment_time,
          client_name, company_name, email, phone, specific_inquiry,
          status, reference_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        booking.id, booking.serviceId || null, booking.serviceTitle, booking.date,
        booking.time, booking.clientName, booking.companyName, booking.email,
        booking.phone, booking.specificInquiry, booking.status, booking.referenceNumber,
      ]
    );
    return toBooking(row);
  },

  async updateBookingStatus(id: string, status: BookingData['status']): Promise<BookingData | null> {
    const row = await queryOne(
      'UPDATE bookings SET status = $2 WHERE id = $1 OR reference_number = $1 RETURNING *',
      [id, status]
    );
    return row ? toBooking(row) : null;
  },

  /* ----------------------------------------------------------- quotes */

  async getQuotes(): Promise<QuoteData[]> {
    const rows = await query('SELECT * FROM quote_requests ORDER BY created_at DESC');
    return rows.map(toQuote);
  },

  async getQuotesByEmail(email: string): Promise<QuoteData[]> {
    const rows = await query(
      'SELECT * FROM quote_requests WHERE lower(contact_email) = lower($1) ORDER BY created_at DESC',
      [email]
    );
    return rows.map(toQuote);
  },

  async createQuote(quote: QuoteData): Promise<QuoteData> {
    const row = await queryOne(
      `INSERT INTO quote_requests
         (id, gem_type, shape, carat_min, carat_max, target_budget, quantity,
          certification_preference, jeweller_business, contact_email, notes,
          estimated_unit_price, estimated_total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        quote.id, quote.gemType, quote.shape, quote.caratMin, quote.caratMax,
        quote.targetBudget, quote.quantity, quote.certificationPreference,
        quote.jewellerBusiness, quote.contactEmail, quote.notes,
        quote.estimatedUnitPrice ?? null, quote.estimatedTotal ?? null, quote.status,
      ]
    );
    return toQuote(row);
  },

  /* ----------------------------------------------------------- orders */

  async getOrders(): Promise<OrderData[]> {
    const rows = await query(`${ORDER_SELECT} ORDER BY o.created_at DESC`);
    return rows.map(toOrder);
  },

  async getOrdersForUser(userId: string | undefined, email: string): Promise<OrderData[]> {
    const rows = await query(
      `${ORDER_SELECT} WHERE o.user_id = $1 OR lower(o.email) = lower($2)
       ORDER BY o.created_at DESC`,
      [userId ?? null, email]
    );
    return rows.map(toOrder);
  },

  async getOrderById(id: string): Promise<OrderData | null> {
    const row = await queryOne(`${ORDER_SELECT} WHERE o.id = $1`, [id]);
    return row ? toOrder(row) : null;
  },

  /** Header and line items are one write, so an order can never be half-recorded. */
  async createOrder(order: OrderData): Promise<OrderData> {
    return transaction(async (client) => {
      await client.query(
        `INSERT INTO orders
           (id, user_id, member_id, client_name, company_name, email,
            total_usd, payment_method, shipping_service, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          order.id, order.userId ?? null, order.memberId ?? null, order.clientName,
          order.companyName, order.email, order.totalUSD, order.paymentMethod,
          order.shippingService, order.status,
        ]
      );

      for (const item of order.items) {
        await client.query(
          `INSERT INTO order_items (order_id, gemstone_id, name, carat, price_usd, quantity)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [order.id, item.gemstoneId || null, item.name, item.carat, item.priceUSD, item.quantity]
        );
      }

      const { rows } = await client.query(`${ORDER_SELECT} WHERE o.id = $1`, [order.id]);
      return toOrder(rows[0]);
    });
  },

  /* ---------------------------------------------------------- content */

  async getServices(): Promise<ServiceData[]> {
    const rows = await query('SELECT * FROM consultation_services ORDER BY sort_order');
    return rows.map(toService);
  },

  async getBlogPosts(): Promise<BlogPostData[]> {
    const rows = await query('SELECT * FROM blog_posts ORDER BY sort_order');
    return rows.map(toBlogPost);
  },

  async getPolicies(): Promise<PolicyData[]> {
    const rows = await query(`${POLICY_SELECT} ORDER BY p.sort_order`);
    return rows.map(toPolicy);
  },

  async getPolicyBySlug(slug: string): Promise<PolicyData | null> {
    const row = await queryOne(`${POLICY_SELECT} WHERE p.slug = $1`, [slug]);
    return row ? toPolicy(row) : null;
  },

  /* ------------------------------------------------- admin: gemstones */

  /**
   * Full-record update. Every column is written, so callers pass the merged
   * record rather than a patch — the route handler reads the current row first.
   */
  async updateGemstone(id: string, stone: GemstoneData): Promise<GemstoneData | null> {
    const row = await queryOne(
      `UPDATE gemstones SET
         name = $2, category = $3, shape = $4, carat = $5, color = $6,
         clarity = $7, origin = $8, treatment = $9, certification = $10,
         cert_number = $11, price_usd = $12, price_per_carat = $13,
         dimensions = $14, image = $15, featured = $16, status = $17,
         description = $18, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        id, stone.name, stone.category, stone.shape, stone.carat, stone.color,
        stone.clarity, stone.origin, stone.treatment, stone.certification,
        stone.certNumber, stone.priceUSD, stone.pricePerCarat, stone.dimensions,
        stone.image, stone.featured ?? false, stone.status, stone.description,
      ]
    );
    return row ? toGemstone(row) : null;
  },

  /**
   * Refused while the stone is referenced by a memo or an order: those are
   * custody and financial records, and removing the stone would rewrite them.
   * Delist by setting status instead.
   */
  async deleteGemstone(id: string): Promise<{ deleted: boolean; blockedBy?: string }> {
    const [counts] = await query<any>(
      `SELECT
         (SELECT count(*) FROM memos       WHERE gemstone_id = $1) AS memo_count,
         (SELECT count(*) FROM order_items WHERE gemstone_id = $1) AS order_count`,
      [id]
    );

    const memoCount = Number(counts.memo_count);
    const orderCount = Number(counts.order_count);

    if (memoCount > 0 || orderCount > 0) {
      const refs: string[] = [];
      if (memoCount > 0) refs.push(`${memoCount} memo(s)`);
      if (orderCount > 0) refs.push(`${orderCount} order line(s)`);
      return { deleted: false, blockedBy: refs.join(' and ') };
    }

    const rows = await query('DELETE FROM gemstones WHERE id = $1 RETURNING id', [id]);
    return { deleted: rows.length > 0 };
  },

  /* ------------------------------------------------ admin: blog posts */

  async getBlogPostById(id: string): Promise<BlogPostData | null> {
    const row = await queryOne('SELECT * FROM blog_posts WHERE id = $1', [id]);
    return row ? toBlogPost(row) : null;
  },

  async upsertBlogPost(post: BlogPostData): Promise<BlogPostData> {
    const row = await queryOne(
      `INSERT INTO blog_posts
         (id, title, category, read_time, published_on, display_date, excerpt,
          author, author_role, image, body_paragraphs, sort_order, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, category = EXCLUDED.category,
         read_time = EXCLUDED.read_time, published_on = EXCLUDED.published_on,
         display_date = EXCLUDED.display_date, excerpt = EXCLUDED.excerpt,
         author = EXCLUDED.author, author_role = EXCLUDED.author_role,
         image = EXCLUDED.image, body_paragraphs = EXCLUDED.body_paragraphs,
         sort_order = EXCLUDED.sort_order, is_published = EXCLUDED.is_published
       RETURNING *`,
      [
        post.id, post.title, post.category, post.readTime,
        Number.isNaN(Date.parse(post.date)) ? null : new Date(post.date).toISOString().split('T')[0],
        post.date, post.excerpt, post.author, post.authorRole, post.image,
        post.content, post.sortOrder, post.isPublished,
      ]
    );
    return toBlogPost(row);
  },

  async deleteBlogPost(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM blog_posts WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  /* -------------------------------------------------- admin: services */

  async getServiceById(id: string): Promise<ServiceData | null> {
    const row = await queryOne('SELECT * FROM consultation_services WHERE id = $1', [id]);
    return row ? toService(row) : null;
  },

  async upsertService(service: ServiceData): Promise<ServiceData> {
    const row = await queryOne(
      `INSERT INTO consultation_services
         (id, title, duration, type, fee, description, suitable_for, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, duration = EXCLUDED.duration, type = EXCLUDED.type,
         fee = EXCLUDED.fee, description = EXCLUDED.description,
         suitable_for = EXCLUDED.suitable_for, sort_order = EXCLUDED.sort_order,
         is_active = EXCLUDED.is_active
       RETURNING *`,
      [
        service.id, service.title, service.duration, service.type, service.fee,
        service.description, service.suitableFor, service.sortOrder, service.isActive,
      ]
    );
    return toService(row);
  },

  /**
   * Past bookings keep their own service_title and their FK is ON DELETE SET
   * NULL, so removing a tier does not rewrite what someone actually booked.
   */
  async deleteService(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM consultation_services WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  /* -------------------------------------------------- admin: policies */

  async getPolicyById(id: string): Promise<PolicyData | null> {
    const row = await queryOne(`${POLICY_SELECT} WHERE p.id = $1`, [id]);
    return row ? toPolicy(row) : null;
  },

  /** Sections are replaced wholesale, in one transaction with the parent row. */
  async upsertPolicy(policy: PolicyData): Promise<PolicyData> {
    return transaction(async (client) => {
      await client.query(
        `INSERT INTO policies (id, slug, title, subtitle, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug, title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle, sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
        [policy.id, policy.slug, policy.title, policy.subtitle, policy.sortOrder]
      );

      await client.query('DELETE FROM policy_sections WHERE policy_id = $1', [policy.id]);

      for (const [index, section] of policy.sections.entries()) {
        await client.query(
          `INSERT INTO policy_sections (policy_id, heading, body, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [policy.id, section.heading, section.text, index + 1]
        );
      }

      const { rows } = await client.query(`${POLICY_SELECT} WHERE p.id = $1`, [policy.id]);
      return toPolicy(rows[0]);
    });
  },

  /* ----------------------------------------------------- admin: roles */

  async setUserRole(
    userId: string,
    role: 'trade_partner' | 'admin' | 'jeweller'
  ): Promise<UserData | null> {
    await query('UPDATE users SET account_role = $2 WHERE id = $1', [userId, role]);
    return db.getUserById(userId);
  },

  /** Used by the grant-admin script, which works from an email address. */
  async setUserRoleByEmail(
    email: string,
    role: 'trade_partner' | 'admin' | 'jeweller'
  ): Promise<UserData | null> {
    const rows = await query<{ id: string }>(
      'UPDATE users SET account_role = $2 WHERE lower(email) = lower($1) RETURNING id',
      [email, role]
    );
    if (rows.length === 0) return null;
    return db.getUserById(rows[0].id);
  },

  /* -------------------------------------------------------- chat logs */


  async getChatLogs(limit = 200): Promise<
    Array<{ id: string; timestamp: string; userMessage: string; botReply: string; handoff: boolean }>
  > {
    const rows = await query(
      'SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: timestamp(r.created_at),
      userMessage: r.user_message,
      botReply: r.bot_reply,
      handoff: r.handoff,
    }));
  },

  async createChatLog(entry: {
    userId?: string;
    sessionId?: string;
    userMessage: string;
    botReply: string;
    handoff: boolean;
  }): Promise<void> {
    await query(
      `INSERT INTO chat_logs (user_id, session_id, user_message, bot_reply, handoff)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        entry.userId ?? null,
        entry.sessionId ?? null,
        entry.userMessage,
        entry.botReply,
        entry.handoff,
      ]
    );
  },
};
