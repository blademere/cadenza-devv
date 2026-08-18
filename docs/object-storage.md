# Object Storage Foundation

The template exposes a provider-neutral storage service for uploads, generated files, documents, and attachments.

```js
const storage = createStorageService(adapter)

await storage.put({
  key: "documents/example.pdf",
  body,
  contentType: "application/pdf",
})
```

The service intentionally does not depend on an object-storage vendor. Development can use the local filesystem adapter; production applications can provide an S3-compatible adapter through the same contract.

Supported operations:

- `put`
- `get`
- `delete`
- `head`
- `copy`
- `getSignedUrl`

Storage keys must be application-controlled and should not contain path traversal segments.
