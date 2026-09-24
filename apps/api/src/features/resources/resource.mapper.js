const mapResource = (resource) => {
  if (!resource) return null

  return {
    id: resource.id,
    appId: resource.appId,
    key: resource.key,
    name: resource.name,
    type: resource.type,
    status: resource.status,
    description: resource.description ?? null,
    metadata: resource.metadata ?? null,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }
}

export {
  mapResource,
}
