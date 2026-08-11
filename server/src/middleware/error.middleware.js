const errorMiddleware = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  const statusCode = err.statusCode || 500;

  // Services raise deliberate failures with an explicit statusCode and a message
  // written to be read by the user — "Invalid email or password", "Task must fall
  // within the project duration", "This organisation has 6 rostered shift(s)".
  // Those are safe to return anywhere, and hiding them makes the product look
  // broken rather than secure.
  //
  // Anything arriving without a statusCode is an unexpected failure (a Prisma
  // error, a null dereference) whose message can leak schema or file paths, so
  // that is still masked in production.
  const isOperational = Boolean(err.statusCode) && statusCode < 500;
  const message = isOperational || process.env.NODE_ENV !== 'production'
    ? err.message
    : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    message,
    // Machine-readable discriminator for failures the client must handle
    // specially rather than just display (e.g. ORG_SUSPENDED -> redirect).
    ...(isOperational && err.code ? { code: err.code } : {}),
  });
};

module.exports = errorMiddleware;
