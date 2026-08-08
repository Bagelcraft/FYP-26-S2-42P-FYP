const prisma = require('../config/prisma');

// ─────────────────────────────────────────────────────────────────────────────
// Automated testimonial selection.
//
// Nobody hand-picks what appears on the marketing page. Every testimonial is run
// through a fixed set of rules the moment it is submitted or edited, and the
// outcome (APPROVED / REJECTED) decides publication. Re-running the rules over the
// whole table always produces the same result, so the decision is auditable and
// reproducible rather than a matter of taste.
//
// A testimonial is published only if it clears EVERY hard rule below.
// ─────────────────────────────────────────────────────────────────────────────

const RULES = {
  MIN_RATING:        4,    // 4★ and 5★ only — the marketing page shows praise
  MIN_LENGTH:        40,   // characters; anything shorter reads as filler
  MAX_LENGTH:        400,  // characters; longer breaks the card layout
  MIN_WORDS:         8,
  MAX_CAPS_RATIO:    0.4,  // fraction of letters that may be uppercase (no SHOUTING)
  MAX_PUNCT_RUN:     3,    // "!!!!" style emphasis
  MAX_PUBLISHED:     6,    // landing page shows a 3-column grid — cap at two rows
  MIN_SIMILARITY_GAP: 0.8, // reject if >80% token overlap with an approved review
};

// Profanity / abuse. Matched on word boundaries so "class" doesn't trip "ass".
const BANNED_WORDS = [
  'shit', 'fuck', 'fucking', 'bitch', 'bastard', 'asshole', 'crap', 'damn',
  'dick', 'piss', 'slut', 'whore', 'cunt', 'retard', 'nigger', 'faggot',
];

// Spam / promotional markers that have no place in a customer quote.
const SPAM_WORDS = [
  'click here', 'buy now', 'free money', 'casino', 'viagra', 'crypto giveaway',
  'work from home', 'make money fast', 'subscribe to my', 'promo code',
  'discount code', 'visit my site', 'earn cash',
];

const URL_RE   = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|biz|info|ru|xyz)\b)/i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s-]{6,}\d)/;

function wordSet(text) {
  return new Set(
    String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3),
  );
}

// Jaccard overlap — cheap near-duplicate detection between two reviews.
function similarity(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const word of setA) if (setB.has(word)) shared += 1;
  return shared / Math.min(setA.size, setB.size);
}

function capsRatio(text) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length < 12) return 0; // too short to judge
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

/**
 * Run the rule set over one testimonial.
 *
 * @param {{ rating:number, review_text:string, name?:string }} testimonial
 * @param {{ published?: Array<{testimonial_id:number, review_text:string}>,
 *           publishedCount?: number,
 *           testimonialId?: number }} context
 * @returns {{ status:'APPROVED'|'REJECTED', score:number, reasons:string[], is_active:boolean }}
 */
function evaluateTestimonial(testimonial, context = {}) {
  const rating = Number(testimonial.rating) || 0;
  const text   = String(testimonial.review_text ?? '').trim();
  const lower  = text.toLowerCase();
  const words  = text.split(/\s+/).filter(Boolean);
  const reasons = [];

  // ── Rule 1: star rating ────────────────────────────────────────────────────
  if (rating < RULES.MIN_RATING) {
    reasons.push(`Rating ${rating}★ is below the ${RULES.MIN_RATING}★ minimum for the public page.`);
  }
  if (rating > 5 || rating < 1) {
    reasons.push('Rating must be between 1 and 5.');
  }

  // ── Rule 2: substance ──────────────────────────────────────────────────────
  if (text.length < RULES.MIN_LENGTH) {
    reasons.push(`Review is ${text.length} characters — at least ${RULES.MIN_LENGTH} are needed to be useful.`);
  }
  if (text.length > RULES.MAX_LENGTH) {
    reasons.push(`Review is ${text.length} characters — the limit is ${RULES.MAX_LENGTH}.`);
  }
  if (words.length < RULES.MIN_WORDS) {
    reasons.push(`Review has ${words.length} words — at least ${RULES.MIN_WORDS} are needed.`);
  }

  // ── Rule 3: language ───────────────────────────────────────────────────────
  const profanity = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower));
  if (profanity.length) {
    reasons.push('Review contains inappropriate language.');
  }

  // ── Rule 4: spam and contact details ───────────────────────────────────────
  const spam = SPAM_WORDS.filter((w) => lower.includes(w));
  if (spam.length) reasons.push('Review reads as promotional spam.');
  if (URL_RE.test(text))   reasons.push('Review contains a link.');
  if (EMAIL_RE.test(text)) reasons.push('Review contains an email address.');
  if (PHONE_RE.test(text)) reasons.push('Review contains a phone number.');

  // ── Rule 5: presentation ───────────────────────────────────────────────────
  const caps = capsRatio(text);
  if (caps > RULES.MAX_CAPS_RATIO) {
    reasons.push(`Review is ${Math.round(caps * 100)}% uppercase — too shouty for the public page.`);
  }
  if (new RegExp(`[!?]{${RULES.MAX_PUNCT_RUN + 1},}`).test(text)) {
    reasons.push('Review uses excessive punctuation.');
  }

  // ── Rule 6: not a near-duplicate of something already published ────────────
  const published = (context.published ?? []).filter((t) => t.testimonial_id !== context.testimonialId);
  const duplicate = published.find((t) => similarity(text, t.review_text) >= RULES.MIN_SIMILARITY_GAP);
  if (duplicate) {
    reasons.push('Review is nearly identical to one already published.');
  }

  // ── Rule 7: the page only has room for so many ─────────────────────────────
  // Applied last so a testimonial that is otherwise fine is queued rather than
  // failed on quality — it publishes automatically once a slot frees up.
  const passedQuality = reasons.length === 0;
  const slotsUsed = context.publishedCount ?? published.length;
  if (passedQuality && slotsUsed >= RULES.MAX_PUBLISHED) {
    reasons.push(`The landing page already shows the maximum of ${RULES.MAX_PUBLISHED} testimonials.`);
  }

  const status = reasons.length === 0 ? 'APPROVED' : 'REJECTED';

  return {
    status,
    score: scoreOf({ rating, text, words }),
    reasons,
    is_active: status === 'APPROVED',
  };
}

// Quality score (0-100). Not a pass/fail gate — it ranks testimonials so the
// strongest ones take the limited slots on the landing page.
function scoreOf({ rating, text, words }) {
  const ratingPoints = (rating / 5) * 50;                                  // up to 50
  const lengthPoints = Math.min(text.length / RULES.MAX_LENGTH, 1) * 25;   // up to 25
  const detailPoints = Math.min(words.length / 60, 1) * 25;                // up to 25
  return Math.round(ratingPoints + lengthPoints + detailPoints);
}

function toRow(evaluation) {
  return {
    is_active:    evaluation.is_active,
    auto_status:  evaluation.status,
    auto_score:   evaluation.score,
    auto_reasons: evaluation.reasons.length ? evaluation.reasons.join(' ') : null,
    moderated_at: new Date(),
  };
}

/**
 * Evaluate a single testimonial against the current published set.
 * Used on create and on edit.
 */
async function evaluateAgainstLive(testimonial, testimonialId = null) {
  const published = await prisma.landingTestimonial.findMany({
    where:  { is_active: true },
    select: { testimonial_id: true, review_text: true },
  });

  const evaluation = evaluateTestimonial(testimonial, {
    published,
    publishedCount: published.filter((t) => t.testimonial_id !== testimonialId).length,
    testimonialId,
  });

  return { evaluation, row: toRow(evaluation) };
}

/**
 * Re-run the rules over every testimonial from scratch.
 *
 * Candidates are ranked by score (then recency) and filled into the available
 * slots in order, so the best-scoring reviews win the limited space rather than
 * whichever happened to be submitted first.
 *
 * @returns {Promise<{ evaluated:number, approved:number, rejected:number }>}
 */
async function reevaluateAll() {
  const all = await prisma.landingTestimonial.findMany({ orderBy: { created_at: 'desc' } });

  // Pass 1: quality rules only, with no slot limit and no published set to
  // compare against — this establishes which testimonials are eligible at all.
  const evaluated = all.map((t) => ({
    row: t,
    result: evaluateTestimonial(t, { published: [], publishedCount: 0, testimonialId: t.testimonial_id }),
  }));

  const eligible = evaluated
    .filter((e) => e.result.status === 'APPROVED')
    .sort((a, b) => b.result.score - a.result.score || new Date(b.row.created_at) - new Date(a.row.created_at));

  // Pass 2: fill the slots, skipping near-duplicates of anything already chosen.
  const chosen = [];
  const deduped = new Map(); // testimonial_id -> extra rejection reason
  for (const candidate of eligible) {
    if (chosen.length >= RULES.MAX_PUBLISHED) {
      deduped.set(candidate.row.testimonial_id, `The landing page already shows the maximum of ${RULES.MAX_PUBLISHED} testimonials.`);
      continue;
    }
    const clash = chosen.find((c) => similarity(candidate.row.review_text, c.row.review_text) >= RULES.MIN_SIMILARITY_GAP);
    if (clash) {
      deduped.set(candidate.row.testimonial_id, 'Review is nearly identical to one already published.');
      continue;
    }
    chosen.push(candidate);
  }

  const chosenIds = new Set(chosen.map((c) => c.row.testimonial_id));

  let approved = 0;
  let rejected = 0;

  await prisma.$transaction(
    evaluated.map(({ row, result }) => {
      const extraReason = deduped.get(row.testimonial_id);
      const isChosen = chosenIds.has(row.testimonial_id);
      const reasons = extraReason ? [...result.reasons, extraReason] : result.reasons;
      const status = isChosen ? 'APPROVED' : 'REJECTED';

      if (isChosen) approved += 1; else rejected += 1;

      return prisma.landingTestimonial.update({
        where: { testimonial_id: row.testimonial_id },
        data: toRow({ status, score: result.score, reasons, is_active: isChosen }),
      });
    }),
  );

  return { evaluated: evaluated.length, approved, rejected };
}

module.exports = {
  RULES,
  evaluateTestimonial,
  evaluateAgainstLive,
  reevaluateAll,
  similarity,
};
