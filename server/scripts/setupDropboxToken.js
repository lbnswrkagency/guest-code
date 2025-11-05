#!/usr/bin/env node
/**
 * Quick setup script for Dropbox token
 * Run this to migrate from .env tokens to database tokens
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const DropboxToken = require("../models/dropboxTokenModel");
const { Dropbox } = require("dropbox");

async function setupToken() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if we have tokens in .env
    if (!process.env.DROPBOX_API_ACCESS_TOKEN) {
      console.log("❌ No DROPBOX_API_ACCESS_TOKEN found in .env");
      console.log("Please run the OAuth flow first: http://localhost:8080/api/dropbox/oauth/authorize");
      process.exit(1);
    }

    // Test the token
    console.log("Testing current access token...");
    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_API_ACCESS_TOKEN });
    
    try {
      const account = await dbx.usersGetCurrentAccount();
      console.log("✅ Token is valid for account:", account.result.email);
      
      // If we have a refresh token in .env, save both to database
      if (process.env.DROPBOX_REFRESH_TOKEN) {
        console.log("Found refresh token, saving to database...");
        
        // Deactivate any existing tokens
        await DropboxToken.updateMany(
          { accountId: account.result.account_id },
          { isActive: false }
        );
        
        // Create new token document
        const tokenDoc = new DropboxToken({
          accessToken: process.env.DROPBOX_API_ACCESS_TOKEN,
          refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          accountId: account.result.account_id,
          email: account.result.email,
          isActive: true
        });
        
        await tokenDoc.save();
        console.log("✅ Tokens saved to database successfully!");
        console.log("\n🎉 Your Dropbox integration is now using database tokens with auto-refresh!");
        console.log("You can remove DROPBOX_API_ACCESS_TOKEN and DROPBOX_REFRESH_TOKEN from .env");
      } else {
        console.log("\n⚠️  No refresh token found in .env");
        console.log("The current access token will expire in ~4 hours");
        console.log("Please run the OAuth flow to get a refresh token:");
        console.log("http://localhost:8080/api/dropbox/oauth/authorize");
      }
      
    } catch (error) {
      if (error.status === 401) {
        console.log("❌ Token is expired or invalid");
        console.log("Please run the OAuth flow: http://localhost:8080/api/dropbox/oauth/authorize");
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setupToken();