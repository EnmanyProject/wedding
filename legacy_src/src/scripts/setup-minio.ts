import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { config } from '../utils/config';

async function setupMinIO() {
  const s3Client = new S3Client({
    endpoint: config.STORAGE_ENDPOINT,
    region: config.STORAGE_REGION,
    credentials: {
      accessKeyId: config.STORAGE_ACCESS_KEY,
      secretAccessKey: config.STORAGE_SECRET_KEY,
    },
    forcePathStyle: true, // MinIO requires path-style
  });

  const bucketName = config.STORAGE_BUCKET;

  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket '${bucketName}' already exists`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        // Create bucket
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`✅ Created bucket '${bucketName}'`);
      } catch (createError) {
        console.error(`❌ Failed to create bucket '${bucketName}':`, createError);
        throw createError;
      }
    } else {
      console.error(`❌ Error checking bucket '${bucketName}':`, error);
      throw error;
    }
  }
}

// Run setup
setupMinIO().catch(console.error);