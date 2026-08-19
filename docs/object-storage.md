# Object Storage Foundation

The repository exposes a provider-neutral storage service for uploads, generated files, documents, and attachments.

The current architecture is:

```text
features/documents
       ↓
platform/storage
       ↓
infrastructure/storage
```

The document feature must not select or import an infrastructure storage provider directly. Provider registration is performed by the application composition root, so the feature only depends on the platform storage contract.

```js
const storage = createStorageService(adapter)

await storage.put({
  key: "documents/example.pdf",
  body,
  contentType: "application/pdf",
})
```

The service intentionally does not depend on an object-storage vendor. Development can use the local filesystem adapter; production applications can provide an S3-compatible adapter through the same contract.

## Storage registration

The application composition root registers the configured storage implementation through the platform storage registry. This keeps provider selection out of `features/documents`.

Conceptually:

```text
app.js
  ↓
storage registry
  ↓
platform storage service
  ↓
configured infrastructure adapter
```

Supported operations:

- `put`
- `get`
- `delete`
- `head`
- `copy`
- `getSignedUrl`

Storage keys must be application-controlled and should not contain path traversal segments.

## Current OBO relevance

The OBO workflow currently emphasizes physical hardcopy supporting documents, so object storage is a reusable capability rather than a requirement that clients upload supporting documents. If a future domain requirement introduces digital documents, the OBO module should consume the document feature and platform storage boundary rather than importing S3, Cloudinary, or local storage directly.
