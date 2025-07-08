import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./LineUpView.scss";

const LineUpView = ({ lineups }) => {
  // If no lineups provided, don't render anything
  if (!lineups || lineups.length === 0) {
    return null;
  }

  // Group lineups by category
  const groupedLineups = lineups.reduce((acc, lineup) => {
    const category = lineup.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(lineup);
    return acc;
  }, {});

  // Custom sorting function that always puts DJs first, then sorts by count, then alphabetically
  const sortedCategories = Object.keys(groupedLineups).sort((a, b) => {
    // Always prioritize DJ/DJs category
    if (a.toLowerCase() === "dj" || a.toLowerCase() === "djs") return -1;
    if (b.toLowerCase() === "dj" || b.toLowerCase() === "djs") return 1;

    // Then sort by number of artists (descending)
    const countDiff = groupedLineups[b].length - groupedLineups[a].length;
    if (countDiff !== 0) return countDiff;

    // If same number of artists, sort alphabetically
    return a.localeCompare(b);
  });

  // Function to render artist avatar
  const renderArtistAvatar = (artist) => {
    if (artist.avatar) {
      // Handle avatar as object with multiple sizes
      let avatarUrl = null;

      if (typeof artist.avatar === "string") {
        // Direct URL
        avatarUrl = artist.avatar;
      } else if (artist.avatar.medium) {
        avatarUrl = artist.avatar.medium;
      } else if (artist.avatar.small) {
        avatarUrl = artist.avatar.small;
      } else if (artist.avatar.thumbnail) {
        avatarUrl = artist.avatar.thumbnail;
      } else if (artist.avatar.full) {
        avatarUrl = artist.avatar.full;
      } else if (artist.avatar.large) {
        avatarUrl = artist.avatar.large;
      }

      if (avatarUrl) {
        return <img src={avatarUrl} alt={artist.name} />;
      }
    }

    // If no avatar or no valid URL found, show the first letter of artist name
    const initial = artist.name.charAt(0).toUpperCase();
    return <div className="avatar-initial">{initial}</div>;
  };

  // Helper function to pluralize category names
  const formatCategoryName = (category, count) => {
    if (count <= 1) return category.toUpperCase();

    // Check if the category already ends with 'S'
    if (category.toUpperCase().endsWith("S")) return category.toUpperCase();

    // Special case for categories that need custom pluralization
    if (category.toUpperCase() === "DJ") return "DJS";

    // Default pluralization: add 'S'
    return `${category.toUpperCase()}S`;
  };

  return (
    <motion.div
      className="lineup-view-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="lineup-title">Line Up</h3>

      <div className="lineup-view-content">
        <AnimatePresence>
          {sortedCategories.map((category, categoryIndex) => (
            <motion.div
              key={category}
              className="lineup-view-category"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
            >
              <div className="category-header">
                <span className="category-name">
                  {formatCategoryName(
                    category,
                    groupedLineups[category].length
                  )}
                </span>
              </div>

              <div className="lineup-view-artists">
                {groupedLineups[category].map((artist, artistIndex) => (
                  <motion.div
                    key={artist._id || artistIndex}
                    className="artist-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: categoryIndex * 0.1 + artistIndex * 0.05,
                    }}
                  >
                    <div className="artist-avatar">
                      {renderArtistAvatar(artist)}
                    </div>

                    <div className="artist-info">
                      <h4 className="artist-name">{artist.name}</h4>
                      {/* Add subtitle from lineup model - can be either subtitle or location */}
                      {artist.subtitle && (
                        <p className="artist-subtitle">{artist.subtitle}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LineUpView;
