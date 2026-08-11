const prisma = require('../config/prisma');

// Platform-wide switches the system admin controls.
//
// Stored as a singleton row (same pattern as LandingContent) and cached in
// process, because they are read on every registration and every staff creation.
// updateSettings() drops the cache so a change takes effect immediately.

const FIELDS = [
  'require_registration_verification',
  'require_staff_verification',
  'require_registration_domain_check',
  'require_staff_domain_check',
];

let cached = null;

async function getSettings() {
  if (cached) return cached;

  let row = await prisma.systemSettings.findFirst();
  if (!row) {
    // Defaults live in the schema, so an empty create reproduces the behaviour
    // that existed before these switches were introduced.
    row = await prisma.systemSettings.create({ data: {} });
  }

  cached = row;
  return row;
}

async function updateSettings(patch) {
  const current = await getSettings();

  const data = {};
  for (const f of FIELDS) {
    if (patch[f] !== undefined) data[f] = Boolean(patch[f]);
  }

  if (Object.keys(data).length === 0) return current;

  cached = await prisma.systemSettings.update({ where: { id: current.id }, data });
  return cached;
}

function clearSettingsCache() {
  cached = null;
}

module.exports = { getSettings, updateSettings, clearSettingsCache, FIELDS };
