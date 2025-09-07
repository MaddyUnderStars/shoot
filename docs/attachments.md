# Message Attachments

This document describes the Shoot API for uploading message attachments.

## Uploading

Shoot supports attaching files to messages. The basic flow is described below:

1. `POST /channel/:id/attachments` with your attachment description.

```jsonc
[
	{
		"id": "<any unique value>",
		"name": "<the user provided file name>",
		"md5": "<the MD5 hash of the full file content. Base64 encoded>",
		"mime": "<mime type>",
		"size": <size in bytes>,

		// if the file is an image or video, you must also provide:
		"width": <width in pixels>,
		"height": <height in pixels>
	},
	
	// ... additional attachments.
]
```

You do not include any actual file contents to this route.
Shoot will respond with an array of `endpoint`s along with their matching `id` which you provided and a `hash` which is the 'real' ID for the attachment.

2. `PUT ${endpoint}` with the attachment content

Upload your attachment data to the endpoint Shoot generated. You do not need to include an `Authorization` header here, as the URL is presigned.
It expires in 5 minutes, so you must upload the data soon after registering it in the previous step.

If needed, you can `POST /attachments` multiple times if you have multiple large attachments which may take longer than 5 minutes to upload all together.

3. Finally: `POST /channel/:id/messages`

Finally, you may send your message. When doing so, include the file `hash` returned by `/attachments` for each attachment you want to include in this message.

```jsonc
{
	"content": "normal message content",
	"files": [
		{
			"hash": "<the hash from /attachments>",
			"name": "<user provided file name>"
		},
		// ... additional attachments
	]
}
```

Messages must not be 'empty', meaning they must have some content of any file.
You may send a message with only `content` and no `files`, or `files` with no `content`.
To do so, simply exclude the object keys which do not have any value in your request.

## Downloading Attachments

Attachments are downloaded via `GET /channel/:id/attachments/:hash`.

This route is not authenticated.

# Notes for instance owners

### S3?

Shoot needs no additional configuration to support uploads out of the box.
However, it is preferred that you do configure an S3-compatible upload service to use instead.

When you do not have S3 configured, Shoot instead handles and uploads attachments to local disk at `.storage` by default.
It is likely that performance will degrade while Shoot is managing an upload request.

Shoot has been tested and verified to work with [MinIO](https://min.io/).

Other S3-compatible storage services may also work if they support the following:
- Signature v4
- Presigned URLs
- `PutObject`
- `HeadObject`
- `GetObject`
- `DeleteObject`

### Cleanup

There is currently no cleanup script for attachments.

Files are stored (in S3 and on disk) via the key `{channel_id}/{file hash}` where `channel_id` is the target channel of the attachment and `hash` is the `hash` property in your database.