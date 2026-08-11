/**
 * Collapse the subscription catalogue to a single tier.
 *
 *   node scripts/consolidate-plan.js            # dry run — shows what would change
 *   node scripts/consolidate-plan.js --yes      # apply
 *
 * Why this is not just "delete the other plans":
 *
 * Feature gating (server/src/middleware/feature.middleware.js) resolves an
 * organisation's plan by matching its subscription `amount` against a plan's
 * `price_monthly`. Deactivating a plan without realigning the subscriptions that
 * were priced against it leaves those organisations matching no plan at all —
 * every gated feature starts returning 403 with "your plan does not include…".
 *
 * So this does three things together:
 *   1. keeps (or creates) one active plan carrying the union of all features,
 *   2. deactivates every other plan,
 *   3. repoints existing subscriptions at the surviving plan's price.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes('--yes');
const KEEP_NAME = process.env.PLAN_NAME || 'Standard';

async function main() {
  const plans = await prisma.subscriptionPlan.findMany({
    include: { features: true },
    orderBy: { price_monthly: 'asc' },
  });

  if (plans.length === 0) {
    console.log('No subscription plans exist — nothing to consolidate.');
    return;
  }

  // Keep the cheapest active plan: it is the one the public pricing section
  // advertises, and lowering nobody's entitlement is the safer direction.
  const survivor = plans.find((p) => p.is_active) ?? plans[0];
  const others = plans.filter((p) => p.plan_id !== survivor.plan_id);

  // Everyone ends up on the full feature set — with one tier there is nothing to
  // withhold, and a missing feature name here means a silent 403 later.
  const allFeatures = [...new Set(plans.flatMap((p) => p.features.map((f) => f.feature_name)))].sort();
  const missing = allFeatures.filter((f) => !survivor.features.some((sf) => sf.feature_name === f));

  const subs = await prisma.subscription.findMany({
    select: { subscription_id: true, organisation_id: true, amount: true, status: true },
  });
  const toRepoint = subs.filter((s) => Number(s.amount) !== Number(survivor.price_monthly));

  console.log(`Surviving plan : ${survivor.name} (#${survivor.plan_id}) — $${survivor.price_monthly}/mo`);
  console.log(`  rename to    : ${KEEP_NAME}`);
  console.log(`  features     : ${survivor.features.length} now, ${allFeatures.length} after merge`);
  if (missing.length) console.log(`  adding       : ${missing.join(', ')}`);
  console.log(`\nPlans to deactivate (${others.length}):`);
  others.forEach((p) => console.log(`  - ${p.name} (#${p.plan_id}) $${p.price_monthly}/mo`));
  console.log(`\nSubscriptions to repoint (${toRepoint.length}):`);
  toRepoint.forEach((s) => console.log(`  - org ${s.organisation_id}: $${s.amount} -> $${survivor.price_monthly}`));

  if (!CONFIRM) {
    console.log('\n🔎 DRY RUN — nothing changed. Re-run with --yes to apply.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (missing.length) {
      await tx.planFeature.createMany({
        data: missing.map((feature_name) => ({ plan_id: survivor.plan_id, feature_name })),
      });
    }
    await tx.subscriptionPlan.update({
      where: { plan_id: survivor.plan_id },
      data:  { name: KEEP_NAME, is_active: true },
    });
    if (others.length) {
      await tx.subscriptionPlan.updateMany({
        where: { plan_id: { in: others.map((p) => p.plan_id) } },
        data:  { is_active: false },
      });
    }
    for (const s of toRepoint) {
      await tx.subscription.update({
        where: { subscription_id: s.subscription_id },
        data:  { amount: survivor.price_monthly },
      });
    }
  });

  console.log('\n✅ Consolidated to a single tier. Every organisation now resolves to the same plan.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
