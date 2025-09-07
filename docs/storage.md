# Object Storage

Shoot uses the AWS S3 API for object storage i.e. message attachments.
In the future, it will also be used for storing user profile avatars, banners, and other user uploaded files.

Shoot uses the following S3 APIs. If you wish to use a S3-compatible service instead, it must support the following.

- Signature v4
- PutObject
- GetObject
- HeadObject
- DeleteObject

Shoot is known to work with [MinIO](https://github.com/minio/minio)