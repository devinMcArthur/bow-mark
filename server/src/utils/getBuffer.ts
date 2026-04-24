import { Readable } from "stream";

export class PayloadTooLargeError extends Error {
  public readonly code = "PAYLOAD_TOO_LARGE";
  constructor(maxBytes: number, observedBytes: number) {
    super(
      `Upload exceeds ${maxBytes} bytes (observed ≥ ${observedBytes} bytes)`
    );
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Drain a Readable into a Buffer. When `maxBytes` is provided the stream
 * is destroyed and the promise rejects the moment observed bytes cross
 * the cap — no further chunks are buffered. Prevents a single large (or
 * infinite) upload from OOMing the pod.
 */
export default (stream: Readable, maxBytes?: number) => {
  const chunks: Buffer[] = [];
  let observed = 0;
  return new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (chunk) => {
      const buf = Buffer.from(chunk);
      observed += buf.length;
      if (maxBytes != null && observed > maxBytes) {
        const err = new PayloadTooLargeError(maxBytes, observed);
        stream.destroy(err);
        reject(err);
        return;
      }
      chunks.push(buf);
    });
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};
