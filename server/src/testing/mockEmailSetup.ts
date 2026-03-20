/**
 * Pre-populates require.cache with a no-op email mock.
 *
 * Loaded via execArgv --require so it runs before any test module,
 * preventing the real nodemailer transport from being used in tests.
 */
import path from "path";

const realPath = path.resolve(__dirname, "../utils/email/index.ts");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(require.cache as Record<string, any>)[realPath] = {
  id: realPath,
  filename: realPath,
  loaded: true,
  exports: {
    default: {
      sendEmail: async (
        _to: string,
        _subject: string,
        _htmlContent: string
      ): Promise<void> => {
        // no-op: skip actual email delivery in tests
      },
    },
    sendEmail: async (
      _to: string,
      _subject: string,
      _htmlContent: string
    ): Promise<void> => {
      // no-op
    },
  },
  children: [],
  parent: null,
};
