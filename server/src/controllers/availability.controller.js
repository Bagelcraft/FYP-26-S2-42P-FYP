const { body, validationResult } = require('express-validator');
const availabilityService = require('../services/availability.service');

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
}

const getAvailability = async (req, res, next) => {
  try {
    const slots = await availabilityService.listAvailability(req.user.userId);
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

const setAvailability = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const slot = await availabilityService.createAvailability(req.user.userId, req.body);
    res.status(201).json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
};

const updateAvailability = async (req, res, next) => {
  if (sendValidationError(req, res)) return;
  try {
    const slot = await availabilityService.updateAvailability(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.body,
    );
    res.json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
};

const removeAvailability = async (req, res, next) => {
  try {
    await availabilityService.deleteAvailability(
      parseInt(req.params.id, 10),
      req.user.userId,
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const availabilityRules = [
  body('start_datetime').isISO8601().withMessage('start_datetime must be a valid ISO 8601 datetime'),
  body('end_datetime').isISO8601().withMessage('end_datetime must be a valid ISO 8601 datetime'),
];

module.exports = { getAvailability, setAvailability, updateAvailability, removeAvailability, availabilityRules };
