const svc = require('../services/enquiry.service');

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

const id = (req) => Number(req.params.id);

async function create(req, res, next) {
  try { ok(res, await svc.createEnquiry(req.body), 201); } catch (e) { next(e); }
}

async function list(req, res, next) {
  try { ok(res, await svc.listEnquiries()); } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try { ok(res, await svc.getEnquiry(id(req))); } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { await svc.deleteEnquiry(id(req)); res.status(204).end(); } catch (e) { next(e); }
}

module.exports = { create, list, getOne, remove };
