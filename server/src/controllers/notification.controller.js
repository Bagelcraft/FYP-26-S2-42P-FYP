const svc = require('../services/notification.service');

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

const uid = (req) => req.user.userId;
const id  = (req) => Number(req.params.id);

async function list(req, res, next) {
  try { ok(res, await svc.listForUser(uid(req))); } catch (e) { next(e); }
}

async function unreadCount(req, res, next) {
  try { ok(res, { count: await svc.unreadCount(uid(req)) }); } catch (e) { next(e); }
}

async function create(req, res, next) {
  try { ok(res, await svc.create(req.body), 201); } catch (e) { next(e); }
}

async function markRead(req, res, next) {
  try { ok(res, await svc.markRead(uid(req), id(req))); } catch (e) { next(e); }
}

async function markAllRead(req, res, next) {
  try { await svc.markAllRead(uid(req)); ok(res, { success: true }); } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { await svc.remove(uid(req), id(req)); res.status(204).end(); } catch (e) { next(e); }
}

module.exports = { list, unreadCount, create, markRead, markAllRead, remove };
