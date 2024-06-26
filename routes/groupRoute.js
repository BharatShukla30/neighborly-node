const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");

const {
  createGroup,
  addUser,
  makeGroupPermanent,
  removeUser,
  nearestGroup,
  fetchLastMessages,
  fetchGroupDetails,
  nearbyUsers,
  updateGroupDetails,
  deleteGroup,
  addAdmin
} = require("../controllers/groupController");

router.route("/remove-user").post(isAuthenticated, removeUser);
router.route("/make-group-permanent").put(isAuthenticated, makeGroupPermanent);
router.route("/fetch-nearby-users").get(isAuthenticated, nearbyUsers);
router.route("/add-user").post(isAuthenticated, addUser);
router.route("/nearest-group").get(isAuthenticated, nearestGroup);
router.route("/delete-group/:groupId").delete(isAuthenticated, deleteGroup);
router.route("/create").post(isAuthenticated, createGroup);
router
  .route("/fetch-group-messages/:groupId")
  .get(isAuthenticated, fetchLastMessages);
router
  .route("/fetch-group-details/:groupId")
  .get(isAuthenticated, fetchGroupDetails);
router.route("/update-group-details").put(isAuthenticated, updateGroupDetails);
router.route("/add-admin").post(isAuthenticated, addAdmin);

module.exports = router;
