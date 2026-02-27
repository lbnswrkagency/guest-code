import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./LineUpView.scss";

/**
 * Get the best available avatar URL from an artist object.
 */
const getAvatarUrl = (artist) => {
  const av = artist?.avatar;
  if (!av) return null;
  if (typeof av === "string") return av;
  return av.medium || av.small || av.thumbnail || av.full || av.large || null;
};

const LineUpView = ({ lineups }) => {
  if (!lineups || lineups.length === 0) return null;

  // Group lineups by category
  const groupedLineups = lineups
    .filter((lineup) => lineup && lineup.name)
    .reduce((acc, lineup) => {
      const category = lineup.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(lineup);
      return acc;
    }, {});

  // DJs first, then by count, then alphabetically
  const sortedCategories = Object.keys(groupedLineups).sort((a, b) => {
    if (a.toLowerCase() === "dj" || a.toLowerCase() === "djs") return -1;
    if (b.toLowerCase() === "dj" || b.toLowerCase() === "djs") return 1;
    const countDiff = groupedLineups[b].length - groupedLineups[a].length;
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const formatCategoryName = (category, count) => {
    if (count <= 1) return category.toUpperCase();
    if (category.toUpperCase().endsWith("S")) return category.toUpperCase();
    if (category.toUpperCase() === "DJ") return "DJS";
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
                {groupedLineups[category].map((artist, artistIndex) => {
                  const avatarUrl = getAvatarUrl(artist);
                  return (
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
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={artist.name} />
                        ) : (
                          <div className="avatar-initial">
                            {artist.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="artist-info">
                        <h4 className="artist-name">{artist.name}</h4>
                        {artist.subtitle && (
                          <p className="artist-subtitle">{artist.subtitle}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default React.memo(LineUpView);
