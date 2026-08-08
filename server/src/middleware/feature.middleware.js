const prisma = require('../config/prisma');

// Gate a route behind a subscription-plan feature.
// Resolves the caller's org -> active subscription -> matching plan -> plan features,
// and blocks with 403 unless the plan includes `featureName`.
// Usage:  router.get('/reports', requireFeature('Advanced Reports'), handler)
const requireFeature = (featureName) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.organisationId) {
      return res.status(403).json({ message: 'No organisation context for feature check.' });
    }
    const org = await prisma.organisation.findUnique({
      where: { organisation_id: req.user.organisationId },
      include: { activeSubscription: true },
    });
    const sub = org && org.activeSubscription;
    if (!sub || sub.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'An active subscription is required for this feature.' });
    }
    // Plans are matched to a subscription by monthly price (same convention used elsewhere).
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { price_monthly: sub.amount },
      include: { features: true },
    });
    const hasFeature = !!plan && plan.features.some((f) => f.feature_name === featureName);
    if (!hasFeature) {
      return res.status(403).json({
        message: `Your plan does not include "${featureName}". Upgrade your subscription to access it.`,
        feature: featureName,
        upgradeRequired: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireFeature };
