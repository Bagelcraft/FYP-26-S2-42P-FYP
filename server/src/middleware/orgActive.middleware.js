const prisma = require('../config/prisma');

// Suspension has to bite on every request, not just at login.
//
// Tokens live for 8 hours, so a user who was signed in when their organisation
// was suspended would otherwise keep working for the rest of the day. This
// middleware sits in front of every tenant-scoped router and turns an existing
// session into a dead one the moment the organisation is suspended.
//
// The 403 carries code: 'ORG_SUSPENDED' so the client can tell it apart from an
// ordinary permission failure and redirect to the suspension page.

// Cached per process; invalidated by clearOrgActiveCache() when a system admin
// suspends or reactivates.
const cache = new Map();

async function isOrganisationActive(organisationId) {
  if (cache.has(organisationId)) return cache.get(organisationId);
  const org = await prisma.organisation.findUnique({
    where:  { organisation_id: organisationId },
    select: { isActive: true },
  });
  if (!org) return null;
  cache.set(organisationId, org.isActive);
  return org.isActive;
}

function clearOrgActiveCache(organisationId) {
  if (organisationId === undefined) cache.clear();
  else cache.delete(organisationId);
}

const SUSPENDED_MESSAGE =
  'Your organisation\'s account has been suspended. Please contact your system administrator.';

const requireActiveOrganisation = async (req, res, next) => {
  try {
    // System admins have no organisation and must stay able to reactivate one.
    if (!req.user?.organisationId) return next();

    const active = await isOrganisationActive(req.user.organisationId);
    if (active === null) return res.status(404).json({ message: 'Organisation not found.' });
    if (!active) {
      return res.status(403).json({ message: SUSPENDED_MESSAGE, code: 'ORG_SUSPENDED' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requireActiveOrganisation,
  isOrganisationActive,
  clearOrgActiveCache,
  SUSPENDED_MESSAGE,
};
