const uploadToCloudinary = async (fileName) => {
  return {
    provider: 'cloudinary',
    url: `https://res.cloudinary.com/demo/image/upload/${encodeURIComponent(fileName)}`,
  }
}

export { uploadToCloudinary }
