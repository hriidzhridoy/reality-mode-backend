import { Router } from "express";
import * as userController from "../controllers/userController";
import * as circleController from "../controllers/circleController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/me", authenticate, userController.getMe);
router.patch("/me", authenticate, userController.updateProfile);
router.get("/search", authenticate, userController.searchUsers);
router.get("/:userId", authenticate, userController.getProfile);

// Close Circle
router.get("/me/circle", authenticate, circleController.getMyCircle);
router.post("/:userId/circle", authenticate, circleController.addToCircle);
router.delete(
  "/:userId/circle",
  authenticate,
  circleController.removeFromCircle,
);

export default router;
