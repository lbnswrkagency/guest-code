import React from "react";
import { motion } from "framer-motion";
import {
  FaInstagram,
  FaTiktok,
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaSpotify,
  FaSoundcloud,
  FaLinkedinIn,
  FaGlobe,
  FaWhatsapp,
  FaTelegram,
} from "react-icons/fa";
import { MdEmail, MdPhone, MdLocationOn } from "react-icons/md";
import {
  RiUserAddLine,
  RiUserFollowLine,
  RiShareLine,
  RiStarLine,
  RiStarFill,
} from "react-icons/ri";
import { useAuth } from "../../contexts/AuthContext";
import SocialLinks from "./SocialLinks";
import "./BrandProfile.scss";

const SocialIcon = ({ platform, url }) => {
  if (!url) return null;

  const icons = {
    instagram: FaInstagram,
    tiktok: FaTiktok,
    facebook: FaFacebookF,
    twitter: FaTwitter,
    youtube: FaYoutube,
    spotify: FaSpotify,
    soundcloud: FaSoundcloud,
    linkedin: FaLinkedinIn,
    website: FaGlobe,
    whatsapp: FaWhatsapp,
    telegram: FaTelegram,
  };

  const Icon = icons[platform];
  if (!Icon) return null;

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`social-icon ${platform}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Icon />
    </motion.a>
  );
};

const BrandProfileHeader = ({
  brand,
  isFollowing,
  isMember,
  isFavorited,
  onFollow,
  onJoin,
  onFavorite,
  onShare,
}) => {
  const { user } = useAuth();

  // Component rendering with current state

  return (
    <div className="brand-header">
      <div className="brand-cover">
        {brand?.coverImage?.full ? (
          <img
            src={brand.coverImage.full}
            alt={`${brand.name} cover`}
            className="cover-image"
          />
        ) : (
          <div className="cover-placeholder" />
        )}
      </div>

      <div className="brand-info">
        <div className="brand-logo">
          {brand?.logo?.medium ? (
            <img src={brand.logo.medium} alt={`${brand.name} logo`} />
          ) : (
            <div className="logo-placeholder" />
          )}
        </div>

        <div className="brand-details">
          <h1 className="brand-name">{brand?.name}</h1>
          <p className="brand-username">@{brand?.username}</p>
          {brand?.description && (
            <p className="brand-description">{brand.description}</p>
          )}

          <div className="brand-actions">
            {
              user ? (
                <>
                  <motion.button
                    className={`action-button ${isFollowing ? "active" : ""}`}
                    onClick={onFollow}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isFollowing ? <RiUserFollowLine /> : <RiUserAddLine />}
                    {isFollowing ? "Following" : "Follow"}
                  </motion.button>
                  <motion.button
                    className={`action-button ${isMember ? "active" : ""}`}
                    onClick={onJoin}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RiUserAddLine />
                    {isMember ? "Member" : "Join"}
                  </motion.button>
                  <motion.button
                    className={`action-button ${isFavorited ? "active" : ""}`}
                    onClick={onFavorite}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isFavorited ? <RiStarFill /> : <RiStarLine />}
                  </motion.button>
                </>
              ) : null /* Don't show any interactive buttons for non-authenticated users except share */
            }
            {/* Always show the share button */}
            <motion.button
              className="action-button"
              onClick={onShare}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RiShareLine />
            </motion.button>
          </div>
        </div>
      </div>

      {brand?.social &&
        Object.keys(brand.social).some((key) => brand.social[key]) && (
          <SocialLinks social={brand.social} />
        )}
    </div>
  );
};

export default BrandProfileHeader;
