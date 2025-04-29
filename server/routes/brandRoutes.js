const express = require("express");
const router = express.Router();
const brandController = require("../controllers/brandController");
const {
  authenticateToken,
  optionalAuthenticateToken,
} = require("../middleware/auth");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF and WebP are allowed."
        ),
        false
      );
    }
  },
});

// Public routes with optional authentication
router.get(
  "/profile/username/:username",
  optionalAuthenticateToken,
  brandController.getBrandProfileByUsername
);

router.get(
  "/profile/:brandId",
  optionalAuthenticateToken,
  brandController.getBrandProfile
);

// Protected routes - require authentication
router.use(authenticateToken);

// Brand CRUD operations
router.post("/", brandController.createBrand);
router.get("/", brandController.getAllBrands);
router.get("/:brandId", brandController.getBrand);
router.put("/:brandId", brandController.updateBrand);
router.delete("/:brandId", brandController.deleteBrand);

// Brand media routes
router.put(
  "/:brandId/logo",
  upload.single("logo"),
  brandController.updateBrandLogo
);
router.put(
  "/:brandId/cover",
  upload.single("coverImage"),
  brandController.updateBrandCover
);

// Follow/Unfollow
router.post("/:brandId/follow", brandController.followBrand);
router.post("/:brandId/unfollow", brandController.unfollowBrand);

// Favorite/Unfavorite
router.post("/:brandId/favorite", brandController.favoriteBrand);
router.post("/:brandId/unfavorite", brandController.unfavoriteBrand);

// Join/Leave
router.post("/:brandId/join", brandController.requestJoin);
router.post("/:brandId/leave", brandController.leaveBrand);
router.post("/:brandId/cancel-join", brandController.cancelJoinRequest);

// Join request management
router.post(
  "/join-requests/:requestId/process",
  brandController.processJoinRequest
);

// Team management
router.get("/:brandId/members", brandController.getTeamMembers);
router.put(
  "/:brandId/members/:memberId/role",
  brandController.updateMemberRole
);
router.delete("/:brandId/members/:memberId", brandController.removeMember);
router.post("/:brandId/members/:memberId/ban", brandController.banMember);

// Settings management
router.put("/:brandId/settings", brandController.updateBrandSettings);

// Meta Pixel management
router.put("/:brandId/metapixel", brandController.updateBrandMetaPixel);

// Spotify configuration management
router.put("/:brandId/spotify-config", brandController.updateSpotifyConfig);

module.exports = router;
