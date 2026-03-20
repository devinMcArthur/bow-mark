/**
 * Test mock for @utils/fileStorage.
 * In tests, file uploads are no-ops — we don't have DigitalOcean Spaces credentials.
 * The MongoDB File document is still created with its _id, so associations work correctly.
 */
export const uploadFile = async (
  _name: string,
  _buffer: Buffer,
  _mimetype: string
): Promise<void> => {
  // no-op: skip actual S3 upload in tests
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getFile = async (_name: string): Promise<any> => ({
  Body: Buffer.from("mock-file-content"),
});

export const removeFile = async (_name: string): Promise<void> => {
  // no-op
};

export const getFileSignedUrl = async (name: string): Promise<string> => {
  return `https://test-spaces.example.com/${name}`;
};
