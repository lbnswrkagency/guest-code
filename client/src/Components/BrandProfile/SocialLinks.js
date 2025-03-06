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
    },
    tiktok: {
      icon: RiTiktokFill,
      color: "#69c9d0",
    },
    facebook: {
      icon: RiFacebookCircleFill,
      color: "#1877f2",
    },
    twitter: {
      icon: RiTwitterXFill,
      color: "#1da1f2",
    },
    youtube: {
      icon: RiYoutubeFill,
      color: "#ff0000",
    },
    spotify: {
      icon: RiSpotifyFill,
      color: "#1db954",
    },
    soundcloud: {
      icon: RiSoundcloudFill,
      color: "#ff3300",
    },
    linkedin: {
      icon: RiLinkedinBoxFill,
      color: "#0077b5",
    },
    website: {
      icon: RiGlobalFill,
      color: "#ffc807",
    },
    whatsapp: {
      icon: RiWhatsappFill,
      color: "#25d366",
    },
    telegram: {
      icon: RiTelegramFill,
      color: "#0088cc",
    },
  };

  return (
    <div className="social-links-container">
      <div className="social-links">
        {activePlatforms.map(([platform, url]) => {
          const config = platformConfig[platform];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <motion.a
              key={platform}
              href={url}
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
