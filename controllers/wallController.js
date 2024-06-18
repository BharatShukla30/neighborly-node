const Post = require("../models/ContentModel");
const User = require("../models/userModel");
const Comment = require("../models/CommentModel");
const Award = require("../models/AwardModel");
const Report = require("../models/ReportModel");
const PollVote = require("../models/PollVoteModel");
const ContentVote = require("../models/ContentVoteModel");
const CommentVote = require("../models/CommentVoteModel");
const { Op, where } = require("sequelize");
const { activityLogger, errorLogger } = require("../utils/logger");
const { sequelize } = require("../config/database");
const { raw } = require("express");

// Fetch posts and polls
exports.findPosts = async (req, res) => {
  const isHome = req.query?.home;
  const user = req.user;
  const postId = req.params.postId; // Added to check if a specific post ID is provided
  let posts;

  try {
    let location = null;
    if (isHome === true) {
      location = user.home_coordinates.coordinates;
    } else {
      location = user.current_coordinates.coordinates;
    }

    if (postId) {
      // Fetch a specific post by ID
      posts = await sequelize.query(`
        SELECT contentid, userid, username, title, body, multimedia, createdat, cheers, boos, postlocation, city, type, poll_options
        FROM content
        WHERE contentid = ${postId}
      `);
    } else {
      // Fetch all posts within a certain distance
      posts = await sequelize.query(`
        SELECT contentid, userid, username, title, body, multimedia, createdat, cheers, boos, postlocation, city, type, poll_options
        FROM content
        WHERE ST_DWithin(postlocation, ST_SetSRID(ST_Point(${location[0]}, ${location[1]}), 4326), 300000)
        ORDER BY createdat DESC
      `);
    }

    posts = posts[0];

    // Fetch user details for posts
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await User.findById(post.userid).lean();
        const commentCount = await Comment.count({
          where: { contentid: post.contentid },
        });

        // Fetch detailed awards information
        const awards = await Award.findAll({
          where: { contentid: post.contentid },
          attributes: ["award_type"],
        });
        const awardNames = awards.map((award) => award.award_type);

        if (post.type === "poll") {
          const options = post.poll_options;
          let pollVotes = await Promise.all(
            options.map(async (data) => {
              const vote = await PollVote.findOne({
                raw: true,
                attributes: ["votes"],
                where: {
                  [Op.and]: [
                    { contentid: post.contentid },
                    { optionid: data.optionId },
                  ],
                },
              });
              const result = {
                option: data.option,
                votes: vote ? vote.votes : 0,
              };
              return result;
            })
          );
          return {
            ...post,
            userProfilePicture: user.picture,
            commentCount: commentCount,
            awards: awardNames,
            pollVotes: pollVotes,
          };
        } else {
          return {
            ...post,
            userProfilePicture: user.picture,
            commentCount: commentCount,
            awards: awardNames,
          };
        }
      })
    );

    activityLogger.info("Posts and polls are fetched");
    res.status(200).json(postsWithUserDetails);
  } catch (err) {
    errorLogger.error(err);
    res.status(500).json({
      msg: "Internal server error in fetch-posts",
    });
  }
};

//TODO stop feedback if user has already provided
exports.feedback = async (req, res) => {
  try {
    const { id, type, feedback } = req.body;
    const userId = req.user._id;

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }

      let voteType = feedback === "cheer" ? "cheer" : "boo";
      await ContentVote.create({
        contentid: id,
        userid: userId.toString(),
        votetype: voteType,
        createdat: new Date(),
        processed: true,
      });

      if (feedback === "cheer") {
        await Post.increment({ cheers: 1 }, { where: { contentid: id } });
      } else {
        await Post.increment({ boos: 1 }, { where: { contentid: id } });
      }
      activityLogger.info(
        `Feedback (${feedback}) added to post ID ${id} by user ${userId}`
      );
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }

      let voteType = feedback === "cheer" ? "cheer" : "boo";
      await CommentVote.create({
        commentid: id,
        userid: userId.toString(),
        votetype: voteType,
        createdat: new Date(),
        processed: true,
      });

      if (feedback === "cheer") {
        await Comment.increment({ cheers: 1 }, { where: { commentid: id } });
      } else {
        await Comment.increment({ boos: 1 }, { where: { commentid: id } });
      }
      activityLogger.info(
        `Feedback (${feedback}) added to comment ID ${id} by user ${userId}`
      );
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }

    return res.status(200).json({ msg: "Feedback recorded" });
  } catch (err) {
    errorLogger.error("Something wrong with feedback: ", err);
    return res.status(500).json({ msg: "Internal server error in feedback" });
  }
};

exports.createPost = async (req, res) => {
  const {
    title,
    content,
    multimedia,
    location,
    type,
    city,
    allowMultipleVotes,
    pollOptions,
  } = req.body;
  const user = req.user;
  try {
    const userId = user._id.toString();
    const username = user.username;
    let post;
    if (type === "poll") {
      post = await Post.create({
        userid: userId,
        username: username,
        title: title,
        body: content,
        multimedia: multimedia,
        createdat: Date.now(),
        cheers: 0,
        boos: 0,
        postlocation: { type: "POINT", coordinates: location },
        type: type,
        city: city,
        allow_multiple_votes: allowMultipleVotes,
        poll_options: pollOptions,
      });
    } else {
      post = await Post.create({
        userid: userId,
        username: username,
        title: title,
        body: content,
        multimedia: multimedia,
        createdat: Date.now(),
        cheers: 0,
        boos: 0,
        postlocation: { type: "POINT", coordinates: location },
        type: type,
        city: city,
      });
    }
    activityLogger.info("new Post created");
    res.status(200).json(post);
  } catch (err) {
    errorLogger.error("Create post is not working: ", err);
    res.status(500).json({
      msg: "Internal server error in create-post",
    });
  }
};

exports.deleteData = async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user._id;

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId.toString() !== post.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      await Post.destroy({ where: { contentid: id } });
      activityLogger.info(`Post with ID ${id} deleted by user ${userId}`);
      return res.status(200).json({ msg: "Post deleted" });
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (userId.toString() !== comment.userid) {
        return res.status(403).json({ msg: "Unauthorized user" });
      }

      await Comment.destroy({ where: { commentid: id } });
      activityLogger.info(`Comment with ID ${id} deleted by user ${userId}`);
      return res.status(200).json({ msg: "Comment deleted" });
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }
  } catch (err) {
    errorLogger.error("Something wrong with delete: ", err);
    return res.status(500).json({ msg: "Internal server error in delete" });
  }
};

exports.report = async (req, res) => {
  try {
    const { id, type, reason } = req.body;
    const userId = req.user._id;

    if (type === "post") {
      const post = await Post.findOne({ where: { contentid: id } });
      if (!post) {
        return res.status(404).json({ msg: "Post not found" });
      }
      if (userId.toString() === post.userid) {
        return res
          .status(400)
          .json({ msg: "User cannot report their own post" });
      }

      const report = await Report.create({
        userid: userId.toString(),
        contentid: id,
        report_reason: reason,
        createdat: Date.now(),
      });
      activityLogger.info(`Post with ID ${id} reported by user ${userId}`);
      return res.status(200).json(report);
    } else if (type === "comment") {
      const comment = await Comment.findOne({ where: { commentid: id } });
      if (!comment) {
        return res.status(404).json({ msg: "Comment not found" });
      }
      if (userId.toString() === comment.userid) {
        return res
          .status(400)
          .json({ msg: "User cannot report their own comment" });
      }

      const report = await Report.create({
        userid: userId.toString(),
        commentid: id,
        report_reason: reason,
        createdat: Date.now(),
      });
      activityLogger.info(`Comment with ID ${id} reported by user ${userId}`);
      return res.status(200).json(report);
    } else {
      return res.status(400).json({ msg: "Invalid type specified" });
    }
  } catch (err) {
    errorLogger.error("Something wrong with report: ", err);
    return res.status(500).json({ msg: "Internal server error in report" });
  }
};
