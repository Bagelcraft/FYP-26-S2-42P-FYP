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

module.exports = { clockIn, clockOut, getAttendance };
