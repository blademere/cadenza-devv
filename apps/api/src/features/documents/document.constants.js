const DOCUMENT_MODULE = 'documents'

const DOCUMENT_ACTIONS = Object.freeze({
  READ: 'read',
  UPLOAD: 'upload',
  DELETE: 'delete',
})

const DEFAULT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export { DOCUMENT_MODULE, DOCUMENT_ACTIONS, DEFAULT_MAX_FILE_SIZE_BYTES }
