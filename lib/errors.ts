/**
 * The single sentence the user sees when the system is missing configuration
 * or cannot reach its infrastructure. It never names an environment variable,
 * a service, or a fix — the user cannot act on any of that, and exposing it
 * only helps someone probing the app.
 */
const GENERIC_MESSAGE = 'Hệ thống đang trục trặc. Vui lòng thử lại sau ít phút.';

/**
 * A server-side configuration error.
 *
 * The details go to the server log for whoever operates the app; the user only
 * ever gets the generic sentence above. Use this for missing environment
 * variables or unreachable external services — NOT for input validation, since
 * the user can fix that kind of problem and needs to know exactly what is
 * wrong.
 */
export class ConfigError extends Error {
  constructor(detail: string) {
    super(GENERIC_MESSAGE);
    this.name = 'ConfigError';
    console.error(`[cấu hình] ${detail}`);
  }
}
