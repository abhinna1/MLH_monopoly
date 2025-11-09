// auth.js
const { auth } = require("express-oauth2-jwt-bearer");

const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,  // e.g. "https://my-api"
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`, // e.g. "your-tenant.us.auth0.com"
  tokenSigningAlg: "RS256",
});

module.exports = jwtCheck;
