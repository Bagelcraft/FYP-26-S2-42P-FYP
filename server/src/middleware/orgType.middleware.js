const prisma = require('../config/prisma');

// Cache org_type per request-handling process. It only changes when a system
// admin corrects an organisation, which invalidates via clearOrgTypeCache().
const cache = new Map();

async function getOrgType(organisationId) {
  if (cache.has(organisationId)) return cache.get(organisationId);
  const org = await prisma.organisation.findUnique({
    where:  { organisation_id: organisationId },
    select: { org_type: true },
  });
  if (!org) return null;
  cache.set(organisationId, org.org_type);
  return org.org_type;
}

function clearOrgTypeCache(organisationId) {
  if (organisationId === undefined) cache.clear();
  else cache.delete(organisationId);
}

// Gate a route behind the organisation's scheduling model.
//   requireOrgType('PROJECT')      — projects, project resources
//   requireOrgType('NON_PROJECT')  — shift roster
const requireOrgType = (...allowed) => async (req, res, next) => {
  try {
    if (!req.user?.organisationId) {
      return res.status(403).json({ message: 'No organisation context for this feature.' });
    }
    const orgType = await getOrgType(req.user.organisationId);
    if (!orgType) return res.status(404).json({ message: 'Organisation not found.' });
    if (!allowed.includes(orgType)) {
      return res.status(403).json({
        message: allowed.includes('PROJECT')
          ? 'Projects are only available to project-based organisations.'
          : 'Shift rostering is only available to shift-based organisations.',
        orgType,
        requiredOrgType: allowed,
      });
    }
    req.orgType = orgType;
    next();
  } catch (err) {
    next(err);
  }
};

// Attaches req.orgType without blocking — for handlers that serve both types
// but shape their response differently.
const attachOrgType = async (req, res, next) => {
  try {
    if (req.user?.organisationId) req.orgType = await getOrgType(req.user.organisationId);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireOrgType, attachOrgType, getOrgType, clearOrgTypeCache };
