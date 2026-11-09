const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({});

module.exports.getS3PreSignedUrl = async function getS3PreSignedUrl(s3ObjectKey) {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3ObjectKey
    });
    const s3PreSignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 60
    });
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
    return s3PreSignedUrl;

};
