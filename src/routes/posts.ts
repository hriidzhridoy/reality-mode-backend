import { Router } from "express";
import { body } from "express-validator";
import * as postController from "../controllers/postController";
import * as reactionController from "../controllers/reactionController";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Public/optional auth
router.get("/feed", optionalAuthenticate, postController.getFeed);
router.get("/user/:userId", optionalAuthenticate, postController.getUserPosts);
router.get("/:postId", optionalAuthenticate, postController.getPost);

// Requires auth
router.post(
  "/",
  authenticate,
  validate([
    body("highlight")
      .trim()
      .notEmpty()
      .withMessage("Highlight is required")
      .isLength({ min: 5, max: 2000 }),
    body("reality")
      .trim()
      .notEmpty()
      .withMessage("Reality is required")
      .isLength({ min: 5, max: 2000 }),
    body("privacy").optional().isIn(["PUBLIC", "CLOSE_CIRCLE", "PRIVATE"]),
  ]),
  postController.createPost,
);

router.patch("/:postId", authenticate, postController.updatePost);
router.delete("/:postId", authenticate, postController.deletePost);

// Reactions
router.post(
  "/:postId/reactions",
  authenticate,
  validate([
    body("reactionType").isIn(["RESPECT", "RELATE", "INSPIRED", "STAY_STRONG"]),
  ]),
  reactionController.reactToPost,
);
router.delete(
  "/:postId/reactions",
  authenticate,
  reactionController.removeReaction,
);

export default router;
