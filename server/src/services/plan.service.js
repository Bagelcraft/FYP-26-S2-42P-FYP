const prisma = require('../config/prisma');

function makeError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const planInclude = {
  features: { select: { feature_id: true, feature_name: true } },
};

async function listPlans(includeInactive = false) {
  return prisma.subscriptionPlan.findMany({
    where: includeInactive ? {} : { is_active: true },
    include: planInclude,
    orderBy: { price_monthly: 'asc' },
  });
}

async function getPlan(planId) {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { plan_id: planId },
    include: planInclude,
  });
  if (!plan) throw makeError('Subscription plan not found', 404);
  return plan;
}

// The product sells one plan. Feature gating resolves an organisation's plan by
// matching its subscription amount to a plan price, so a second active plan at a
// different price would silently split the customer base into haves and have-nots.
// Editing the existing plan is the supported way to change what is on offer.
async function createPlan(data) {
  const active = await prisma.subscriptionPlan.count({ where: { is_active: true } });
  if (active > 0) {
    const err = new Error('SmartTask offers a single subscription tier. Edit the existing plan instead of creating another.');
    err.statusCode = 409;
    throw err;
  }
  return prisma.subscriptionPlan.create({
    data: {
      name:          data.name,
      description:   data.description ?? null,
      price_monthly: data.price_monthly,
      price_annual:  data.price_annual,
      max_users:     data.max_users ?? null,
      features: data.features?.length
        ? { create: data.features.map((f) => ({ feature_name: f })) }
        : undefined,
    },
    include: planInclude,
  });
}

async function updatePlan(planId, data) {
  await getPlan(planId); // throws 404 if not found
  return prisma.subscriptionPlan.update({
    where: { plan_id: planId },
    data: {
      name:          data.name          !== undefined ? data.name          : undefined,
      description:   data.description   !== undefined ? data.description   : undefined,
      price_monthly: data.price_monthly !== undefined ? data.price_monthly : undefined,
      price_annual:  data.price_annual  !== undefined ? data.price_annual  : undefined,
      max_users:     data.max_users     !== undefined ? data.max_users     : undefined,
    },
    include: planInclude,
  });
}

async function deactivatePlan(planId) {
  await getPlan(planId);
  return prisma.subscriptionPlan.update({
    where: { plan_id: planId },
    data:  { is_active: false },
    include: planInclude,
  });
}

async function reactivatePlan(planId) {
  await getPlan(planId);
  return prisma.subscriptionPlan.update({
    where: { plan_id: planId },
    data:  { is_active: true },
    include: planInclude,
  });
}

async function addFeature(planId, featureName) {
  await getPlan(planId);
  return prisma.planFeature.create({
    data: { plan_id: planId, feature_name: featureName },
  });
}

async function removeFeature(planId, featureId) {
  const feature = await prisma.planFeature.findFirst({
    where: { feature_id: featureId, plan_id: planId },
  });
  if (!feature) throw makeError('Feature not found on this plan', 404);
  await prisma.planFeature.delete({ where: { feature_id: featureId } });
}

async function deletePlan(planId) {
  await getPlan(planId); // throws 404 if not found
  await prisma.planFeature.deleteMany({ where: { plan_id: planId } });
  await prisma.subscriptionPlan.delete({ where: { plan_id: planId } });
}

module.exports = { listPlans, getPlan, createPlan, updatePlan, deactivatePlan, reactivatePlan, addFeature, removeFeature, deletePlan };