const getFacebookAuthUrl = (apiVersion) => {
  return `https://www.facebook.com/${apiVersion}/dialog/oauth`
}

const getFacebookTokenUrl = (apiVersion) => {
  return `https://graph.facebook.com/${apiVersion}/oauth/access_token`
}

const getFacebookUserInfoUrl = (apiVersion) => {
  return `https://graph.facebook.com/${apiVersion}/me`
}

module.exports = {
  getFacebookAuthUrl,
  getFacebookTokenUrl,
  getFacebookUserInfoUrl,
}
