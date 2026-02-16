import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Public URL for serving files (r2.dev subdomain or custom domain)
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

/**
 * Create S3 client configured for Cloudflare R2
 */
function getR2Client(): S3Client {
	if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
		throw new Error("R2 credentials not configured");
	}

	return new S3Client({
		region: "auto",
		endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: R2_ACCESS_KEY_ID,
			secretAccessKey: R2_SECRET_ACCESS_KEY,
		},
	});
}

/**
 * Upload a file to R2
 */
export async function putObject(
	key: string,
	body: Buffer | string,
	contentType: string,
): Promise<{ url: string }> {
	if (!R2_BUCKET_NAME) {
		throw new Error("R2_BUCKET_NAME not configured");
	}

	const client = getR2Client();

	await client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: typeof body === "string" ? Buffer.from(body) : body,
			ContentType: contentType,
		}),
	);

	// Return the public URL
	const publicUrl = R2_PUBLIC_URL
		? `${R2_PUBLIC_URL}/${key}`
		: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

	return { url: publicUrl };
}

/**
 * Get an object from R2
 */
export async function getObject(key: string): Promise<Buffer> {
	if (!R2_BUCKET_NAME) {
		throw new Error("R2_BUCKET_NAME not configured");
	}

	const client = getR2Client();

	const response = await client.send(
		new GetObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
		}),
	);

	if (!response.Body) {
		throw new Error(`No body in response for key: ${key}`);
	}

	// Convert stream to buffer
	const chunks: Uint8Array[] = [];
	for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

/**
 * Check if an object exists in R2
 */
export async function objectExists(key: string): Promise<boolean> {
	if (!R2_BUCKET_NAME) {
		return false;
	}

	try {
		const client = getR2Client();
		await client.send(
			new HeadObjectCommand({
				Bucket: R2_BUCKET_NAME,
				Key: key,
			}),
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * Delete an object from R2
 */
export async function deleteObject(key: string): Promise<void> {
	if (!R2_BUCKET_NAME) {
		throw new Error("R2_BUCKET_NAME not configured");
	}

	const client = getR2Client();

	await client.send(
		new DeleteObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
		}),
	);
}
