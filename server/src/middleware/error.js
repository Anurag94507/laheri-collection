export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({ error: error.message || 'Something went wrong.' });
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
