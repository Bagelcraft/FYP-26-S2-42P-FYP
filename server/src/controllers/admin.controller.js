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

module.exports = {
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  listOrganisations,
};
