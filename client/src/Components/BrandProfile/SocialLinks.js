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
      prefix: "https://instagram.com/",
    },
    tiktok: {
      icon: RiTiktokFill,
      color: "#69c9d0",
      prefix: "https://tiktok.com/@",
    },
    facebook: {
      icon: RiFacebookCircleFill,
      color: "#1877f2",
      prefix: "https://facebook.com/",
    },
    twitter: {
      icon: RiTwitterXFill,
      color: "#1da1f2",
      prefix: "https://twitter.com/",
    },
    youtube: {
      icon: RiYoutubeFill,
      color: "#ff0000",
      prefix: "https://youtube.com/",
    },
    spotify: {
      icon: RiSpotifyFill,
      color: "#1db954",
      prefix: "https://open.spotify.com/",
    },
    soundcloud: {
      icon: RiSoundcloudFill,
      color: "#ff3300",
      prefix: "https://soundcloud.com/",
    },
    linkedin: {
      icon: RiLinkedinBoxFill,
      color: "#0077b5",
      prefix: "https://linkedin.com/in/",
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

    // For other platforms, if URL already includes the prefix, return as is
    if (config.prefix && url.includes(config.prefix.replace("https://", ""))) {
      return `https://${url}`;
    }

    // Otherwise, add the prefix
    return `${config.prefix}${url}`;
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
                scale: 1.1,
                color: "#fff",
                backgroundColor: config.color,
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
