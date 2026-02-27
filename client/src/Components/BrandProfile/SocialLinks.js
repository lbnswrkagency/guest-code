import React from "react";
import {
  RiInstagramFill,
  RiTiktokFill,
  RiFacebookCircleFill,
  RiTwitterXFill,
  RiYoutubeFill,
  RiSpotifyFill,
  RiSoundcloudFill,
  RiLinkedinBoxFill,
  RiGlobalFill,
  RiWhatsappFill,
  RiTelegramFill,
} from "react-icons/ri";
import { motion } from "framer-motion";

const SocialLinks = ({ social }) => {
  // Filter out platforms with no URL
  const activePlatforms = Object.entries(social || {}).filter(
    ([_, url]) => url
  );

  if (activePlatforms.length === 0) return null;

  const platformConfig = {
    instagram: {
      icon: RiInstagramFill,
      color: "#e1306c",
      prefix: "https://www.instagram.com/",
    },
    tiktok: {
      icon: RiTiktokFill,
      color: "#69c9d0",
      prefix: "https://www.tiktok.com/@",
    },
    facebook: {
      icon: RiFacebookCircleFill,
      color: "#1877f2",
      prefix: "https://www.facebook.com/",
    },
    twitter: {
      icon: RiTwitterXFill,
      color: "#1da1f2",
      prefix: "https://twitter.com/",
    },
    youtube: {
      icon: RiYoutubeFill,
      color: "#ff0000",
      prefix: "https://www.youtube.com/@",
    },
    spotify: {
      icon: RiSpotifyFill,
      color: "#1db954",
      prefix: "https://open.spotify.com/user/",
    },
    soundcloud: {
      icon: RiSoundcloudFill,
      color: "#ff3300",
      prefix: "https://soundcloud.com/",
    },
    linkedin: {
      icon: RiLinkedinBoxFill,
      color: "#0077b5",
      prefix: "https://www.linkedin.com/in/",
    },
    website: {
      icon: RiGlobalFill,
      color: "#ffc807",
      prefix: "",
    },
    whatsapp: {
      icon: RiWhatsappFill,
      color: "#25d366",
      prefix: "https://wa.me/",
    },
    telegram: {
      icon: RiTelegramFill,
      color: "#0088cc",
      prefix: "https://t.me/",
    },
  };

  // Function to ensure URL has proper format
  const formatUrl = (platform, url) => {
    if (!url) return "";

    const config = platformConfig[platform];
    if (!config) return url;

    // If URL already has http/https, return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // For website, ensure it has https://
    if (platform === "website") {
      return url.startsWith("www.") ? `https://${url}` : `https://${url}`;
    }

    // Handle special cases for each platform
    switch (platform) {
      case "youtube":
        // For YouTube, check if username starts with @ or not
        return url.startsWith("@")
          ? `${config.prefix}${url.substring(1)}`
          : `${config.prefix}${url}`;

      case "spotify":
        // For Spotify, check if it's an artist, playlist, or user
        if (url.startsWith("artist/") || url.startsWith("playlist/")) {
          return `https://open.spotify.com/${url}`;
        }
        return `${config.prefix}${url}`;

      case "whatsapp":
        // For WhatsApp, ensure the number is properly formatted
        // Remove any spaces, dashes, or parentheses
        const cleanNumber = url.replace(/[\s\-\(\)]/g, "");
        return `${config.prefix}${cleanNumber}`;

      case "twitter":
        // For Twitter/X, we keep the twitter.com domain for now
        return `https://twitter.com/${url.replace("@", "")}`;

      case "linkedin":
        // Check if it's a company or personal page
        if (url.startsWith("company/")) {
          return `https://www.linkedin.com/${url}`;
        }
        return `https://www.linkedin.com/in/${url.replace(/^in\//, "")}`;

      default:
        // For other platforms, use the standard prefix
        return `${config.prefix}${url}`;
    }
  };

  return (
    <div className="social-links-container">
      <div className="social-links">
        {activePlatforms.map(([platform, url]) => {
          const config = platformConfig[platform];
          if (!config) return null;

          const Icon = config.icon;
          const formattedUrl = formatUrl(platform, url);

          return (
            <motion.a
              key={platform}
              href={formattedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              style={{
                color: config.color,
              }}
              initial={{ scale: 1 }}
              whileHover={{
                scale: 1.12,
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Icon size={18} />
            </motion.a>
          );
        })}
      </div>
    </div>
  );
};

export default SocialLinks;
