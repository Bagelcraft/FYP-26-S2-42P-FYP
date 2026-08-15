const attendanceService = require('../services/attendance.service');

const clockIn = async (req, res, next) => {
  try {
    const record = await attendanceService.clockIn(req.user.userId);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const record = await attendanceService.clockOut(req.user.userId);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const records = await attendanceService.listAttendance(req.user.userId);
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// GET /worker|temp-worker/timesheet?month=YYYY-MM
//
// One endpoint for both roles and both organisation types — the service decides
// whether the sheet is clock-based or task-based and says so in `mode`, so the
// client renders from the response instead of guessing from the user's role.
const getTimesheet = async (req, res, next) => {
  try {
    const data = await attendanceService.getTimesheet(
      req.user.userId,
      req.user.organisationId,
      req.user.role,
      req.query.month,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { clockIn, clockOut, getAttendance, getTimesheet };
