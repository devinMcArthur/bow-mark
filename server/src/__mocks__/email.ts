/**
 * Test mock for @utils/email.
 * In tests, email sending is a no-op — no SMTP credentials are available.
 */
export const sendEmail = async (
  _to: string,
  _subject: string,
  _htmlContent: string
): Promise<void> => {
  // no-op: skip actual email delivery in tests
};

export default { sendEmail };
