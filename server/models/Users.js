const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Auth0 user id, e.g. "auth0|123456789"
    auth0Id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    name: {
      type: String,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Helper to sync an Auth0 profile into Mongo
userSchema.statics.upsertFromAuth0 = async function (auth0User) {
  const User = this;

  const auth0Id = auth0User.sub; // e.g. "auth0|abc123"
  const email = auth0User.email;
  const name = auth0User.name || auth0User.nickname || "";
  const picture = auth0User.picture;
  const appMetadata = auth0User.app_metadata || {};
  const userMetadata = auth0User.user_metadata || {};
  const lastLogin = auth0User.updated_at ? new Date(auth0User.updated_at) : new Date();

  const update = {
    email,
    name,
    picture,
    appMetadata,
    userMetadata,
    lastLogin,
  };

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  const user = await User.findOneAndUpdate({ auth0Id }, update, options);
  return user;
};

module.exports = mongoose.model("User", userSchema);
