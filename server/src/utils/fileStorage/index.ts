import AWS from "aws-sdk";

const client = () => {
  return new AWS.S3({
    endpoint: new AWS.Endpoint(
      `${process.env.SPACES_REGION}.digitaloceanspaces.com`
    ),
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });
};

const uploadFile = async (name: string, buffer: Buffer, mimetype: string) => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) throw new Error("Must provide SPACES_NAME");

    client().putObject(
      {
        Bucket: process.env.SPACES_NAME,
        Key: name,
        Body: buffer,
        ACL: "private",
        ContentType: mimetype,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

const getFile = async (
  name: string
): Promise<AWS.S3.GetObjectOutput | null> => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) reject(new Error("Must provide SPACES_NAME"));

    client().getObject(
      {
        Bucket: process.env.SPACES_NAME || "",
        Key: name,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

const removeFile = (name: string) => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) reject(new Error("Must provide SPACES_NAME"));

    client().deleteObject(
      {
        Bucket: process.env.SPACES_NAME || "",
        Key: name,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

interface SignedUrlOptions {
  /** Filename to present to the browser's Save-As dialog. */
  downloadFilename?: string;
  /** "inline" (render in browser) or "attachment" (force download). Defaults to inline. */
  disposition?: "inline" | "attachment";
}

const getFileSignedUrl = async (name: string, opts: SignedUrlOptions = {}) => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) reject(new Error("Must provide SPACES_NAME"));

    const params: AWS.S3.GetObjectRequest & {
      Expires: number;
      ResponseContentDisposition?: string;
    } = {
      Bucket: process.env.SPACES_NAME || "",
      Key: name,
      Expires: 6000,
    };

    if (opts.downloadFilename) {
      // RFC 5987 escaping for non-ASCII chars. Also duplicate quotes.
      const safe = opts.downloadFilename.replace(/"/g, "");
      const encoded = encodeURIComponent(opts.downloadFilename);
      const disposition = opts.disposition ?? "inline";
      params.ResponseContentDisposition =
        `${disposition}; filename="${safe}"; filename*=UTF-8''${encoded}`;
    }

    client().getSignedUrl("getObject", params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

export { uploadFile, getFile, removeFile, getFileSignedUrl };
