const uploadToS3 = async (fileName) => {
  return {
    provider: 's3',
    url: `https://example-bucket.s3.amazonaws.com/${encodeURIComponent(fileName)}`,
  }
}

export { uploadToS3 }
