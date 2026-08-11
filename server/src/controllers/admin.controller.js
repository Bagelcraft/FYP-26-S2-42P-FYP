const settingsService = require('../services/settings.service');
const svc = require('../services/admin.service');

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

const id = (req) => Number(req.params.id);

async function listRegistrations(req, res, next) {
  try { ok(res, await svc.listPendingRegistrations()); } catch (e) { next(e); }
}

async function approveRegistration(req, res, next) {
  try { ok(res, await svc.approveRegistration(id(req)), 201); } catch (e) { next(e); }
}

async function rejectRegistration(req, res, next) {
  try { await svc.rejectRegistration(id(req)); res.status(204).end(); } catch (e) { next(e); }
}

async function listOrganisations(req, res, next) {
  try { ok(res, await svc.listOrganisations()); } catch (e) { next(e); }
}

async function createOrganisation(req, res, next) {
  try { ok(res, await svc.createOrganisation(req.body), 201); } catch (e) { next(e); }
}

async function suspendOrganisation(req, res, next) {
  try { ok(res, await svc.setOrganisationActive(id(req), false)); } catch (e) { next(e); }
}

async function reactivateOrganisation(req, res, next) {
  try { ok(res, await svc.setOrganisationActive(id(req), true)); } catch (e) { next(e); }
}

// PATCH /admin/organisations/:id/type — fix a wrong choice made at registration.
async function getSettings(req, res, next) {
  try { ok(res, await settingsService.getSettings()); } catch (e) { next(e); }
}

async function updateSettings(req, res, next) {
  try { ok(res, await settingsService.updateSettings(req.body)); } catch (e) { next(e); }
}

module.exports = {
  getSettings,
  updateSettings,
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  listOrganisations,
  createOrganisation,
  suspendOrganisation,
  reactivateOrganisation,
};
