// Error de aplicación con código HTTP y código de negocio.
// Convención de respuesta de error de la API: { error: { code, message, details? } }

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'No autenticado') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'No tiene permisos para esta operación') {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new HttpError(409, 'CONFLICT', message, details);
  }
}
