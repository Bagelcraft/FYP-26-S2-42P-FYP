/**
 * Put every organisation on the one subscription tier.
 *
 *   node scripts/normalise-subscriptions.js          # dry run — shows what would change
 *   node scripts/normalise-subscriptions.js --yes    # apply
 *
 * Options:
 *   PLAN_NAME=Standard  PLAN_PRICE=9  node scripts/normalise-subscriptions.js --yes
 *
 * SmartTask sells a single plan. This script makes the database agree with that,
 * in three steps that have to happen together:
 *
 *   1. One plan. Keep (or create) a single active plan at PLAN_PRICE carrying the
 *      union of every feature any plan offered, and deactivate the rest.
 *
 *   2. One price. Repoint existing subscriptions to that price. This matters more
 *      than it looks: feature gating (src/middleware/feature.middleware.js) finds
 *      an organisation's plan by matching its subscription `amount` against a
 *      plan's `price_monthly`. Deactivate Pro without moving the $29 subscribers
 *      and they match no plan at all — every gated feature starts 403ing.
 *
 *   3. Nobody without a subscription. Organisations approved before the approval
 *      flow provisioned one have none, which is why their Subscription page reads
 *      "No active subscription". Give each of them an active subscription.
 *
 * Safe to re-run: it converges on the same state and reports "nothing to do".
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CONFIRM = process.argv.includes('--yes');
const PLAN_NAME = process.env.PLAN_NAME || 'Standard';
const PLAN_PRICE = Number(process.env.PLAN_PRICE || 9);
const PLAN_PRICE_ANNUAL = Number(process.env.PLAN_PRICE_ANNUAL || PLAN_PRICE * 10);

// What the single tier includes. Any feature name used by requireFeature() must
// appear here, or that route 403s for everyone.
const BASE_FEATURES = [
  'Task Management',
  'Workforce Scheduling',
  'Auto Allocation',
  'Basic Reports',
  'Advanced Reports',
  'Priority Support',
];

const yearFromNow = (from) => {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

async function main() {
  const plans = await prisma.subscriptionPlan.findMany({
    include: { features: true },
    orderBy: { price_monthly: 'asc' },
  });
  const orgs = await prisma.organisation.findMany({
    select: {
      organisation_id: true,
      name: true,
      active_subscription_id: true,
      subscriptions: { select: { subscription_id: true, amount: true, status: true } },
    },
    orderBy: { organisation_id: 'asc' },
  });

  // ── 1. The surviving plan ──
  const survivor = plans.find((p) => p.is_active) ?? plans[0] ?? null;
  // Only plans that are STILL active need deactivating — counting ones already
  // switched off would make the script report work to do on every run.
  const others = plans.filter((p) => survivor && p.plan_id !== survivor.plan_id && p.is_active);
  const featureNames = [...new Set([...BASE_FEATURES, ...plans.flatMap((p) => p.features.map((f) => f.feature_name))])].sort();
  const missingFeatures = survivor
    ? featureNames.filter((f) => !survivor.features.some((sf) => sf.feature_name === f))
    : featureNames;

  console.log(`Target tier: ${PLAN_NAME} — $${PLAN_PRICE}/mo ($${PLAN_PRICE_ANNUAL}/yr)\n`);

  if (!survivor) {
    console.log('Plan          : none exist — one will be created');
  } else {
    const priceChange = Number(survivor.price_monthly) !== PLAN_PRICE ? ` (was $${survivor.price_monthly})` : '';
    console.log(`Plan          : keep #${survivor.plan_id} "${survivor.name}" -> "${PLAN_NAME}" at $${PLAN_PRICE}${priceChange}`);
    console.log(`Features      : ${survivor.features.length} now${missingFeatures.length ? ` -> adding ${missingFeatures.join(', ')}` : ' (complete)'}`);
  }
  console.log(`Deactivating  : ${others.length ? others.map((p) => `"${p.name}" $${p.price_monthly}`).join(', ') : 'none'}`);

  // ── 2 & 3. Subscriptions ──
  const repoint = [];
  const provision = [];
  for (const org of orgs) {
    const active = org.subscriptions.find((s) => s.status === 'ACTIVE') ?? org.subscriptions[0];
    if (!active) {
      provision.push(org);
    } else if (Number(active.amount) !== PLAN_PRICE || org.active_subscription_id !== active.subscription_id) {
      repoint.push({ org, sub: active });
    }
  }

  console.log(`\nSubscriptions to reprice (${repoint.length}):`);
  repoint.forEach(({ org, sub }) => console.log(`  - ${org.name}: $${sub.amount} -> $${PLAN_PRICE}`));
  console.log(`Organisations with no subscription (${provision.length}):`);
  provision.forEach((o) => console.log(`  - ${o.name} -> new ACTIVE subscription at $${PLAN_PRICE}`));

  const nothingToDo =
    survivor && !others.length && !missingFeatures.length && !repoint.length && !provision.length &&
    Number(survivor.price_monthly) === PLAN_PRICE && survivor.name === PLAN_NAME;
  if (nothingToDo) {
    console.log('\n✅ Already normalised — nothing to do.');
    return;
  }

  if (!CONFIRM) {
    console.log('\n🔎 DRY RUN — nothing changed. Re-run with --yes to apply.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 1. One plan, at the right price, with the full feature set.
    let planId;
    if (survivor) {
      await tx.subscriptionPlan.update({
        where: { plan_id: survivor.plan_id },
        data: {
          name: PLAN_NAME,
          price_monthly: PLAN_PRICE,
          price_annual: PLAN_PRICE_ANNUAL,
          is_active: true,
        },
      });
      planId = survivor.plan_id;
    } else {
      const created = await tx.subscriptionPlan.create({
        data: {
          name: PLAN_NAME,
          description: `${PLAN_NAME} plan`,
          price_monthly: PLAN_PRICE,
          price_annual: PLAN_PRICE_ANNUAL,
          max_users: null,
          is_active: true,
        },
      });
      planId = created.plan_id;
    }

    if (missingFeatures.length) {
      await tx.planFeature.createMany({
        data: missingFeatures.map((feature_name) => ({ plan_id: planId, feature_name })),
      });
    }

    if (others.length) {
      await tx.subscriptionPlan.updateMany({
        where: { plan_id: { in: others.map((p) => p.plan_id) } },
        data: { is_active: false },
      });
    }

    // 2. Existing subscriptions move to the single price.
    for (const { org, sub } of repoint) {
      await tx.subscription.update({
        where: { subscription_id: sub.subscription_id },
        data: { amount: PLAN_PRICE, status: 'ACTIVE' },
      });
      if (org.active_subscription_id !== sub.subscription_id) {
        await tx.organisation.update({
          where: { organisation_id: org.organisation_id },
          data: { active_subscription_id: sub.subscription_id },
        });
      }
    }

    // 3. Organisations with none get one.
    for (const org of provision) {
      const start = new Date();
      const sub = await tx.subscription.create({
        data: {
          organisation_id: org.organisation_id,
          amount: PLAN_PRICE,
          start_date: start,
          end_date: yearFromNow(start),
          status: 'ACTIVE',
        },
      });
      await tx.organisation.update({
        where: { organisation_id: org.organisation_id },
        data: { active_subscription_id: sub.subscription_id },
      });
    }
  });

  console.log('\n✅ Done. Every organisation is on the same tier with an active subscription.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
