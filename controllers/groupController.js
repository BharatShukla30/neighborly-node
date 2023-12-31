
const User = require('../models/userModel');
const Group = require('../models/groupModel');

const opencage = require('opencage-api-client');


exports.addUser = async (req, res) => {
  try {
    // Destructure userId and groupId from the request body
    const { userId, groupId } = req.body;
  
    // Update the Group collection to add the user to the group
    const result1 = await Group.updateOne(
      { _id: groupId },
      { $addToSet: { participants: userId } }
    );
  
    // Update the User collection to add the group to the user's groups array
    const result2 = await User.updateOne(
      { _id: userId },
      { $addToSet: { groups: groupId } }
    );
  
    // Check if both updates were successful by inspecting modifiedCount
    if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
      // If both updates were successful, send a success response
      res.status(200).json({ message: 'User added to the group successfully.' });
    } else {
      // If no updates or only one update was successful, send a failure response
      res.status(200).json({ message: 'Group not found or user already in the group.' });
    }
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.makeGroupPermanent = async (req, res) => {
  try {
    // Destructure groupId from the request body
    const { groupId } = req.body;
  
    // Find the group by ID and update the permanentGroup field
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $set: { permanentGroup: true } },
      { new: true }
    );
  
    // Check if the group was not found
    if (!updatedGroup) {
      // If the group is not found, send a 404 response
      return res.status(404).json({ message: 'Group not found.' });
    }
  
    // If the group was successfully updated, send a success response with the updated group
    res.status(200).json({ message: 'Permanent group field updated successfully.', group: updatedGroup });
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Error updating permanent group field:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.removeUser = async (req, res) => {
  try {
    const { userId, groupId } = req.body;
  
    // Update the Group collection to remove the user from the group
    const result1 = await Group.updateOne(
      { _id: groupId },
      { $pull: { participants: userId } }
    );
  
    // Update the User collection to remove the group from the user's groups array
    const result2 = await User.updateOne(
      { _id: userId },
      { $pull: { groups: groupId } }
    );
  
    // Check if both updates were successful by inspecting modifiedCount
    if (result1.modifiedCount > 0 && result2.modifiedCount > 0) {
      // If both updates were successful, send a success response
      res.status(200).json({ message: 'User removed from the group successfully.' });
    } else {
      // If no updates or only one update was successful, send a failure response
      res.status(200).json({ message: 'Group not found or user not in the group.' });
    }
  } catch (error) {
    // Handle unexpected errors, log them, and send an internal server error response
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  
};

exports.createGroup = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate coordinates
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Query the database for nearby users based on current_coordinates
    const nearbyUsers = await User.find({
      current_coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 30000, // Adjust this distance as needed (in meters)
        },
      }
    });

    var nearUsersList = nearbyUsers.map(user => ({
      username: user.username, 
      karma: user.karma 
    }));

  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
  res.status(200).json({
    nearUser: nearUsersList
  });
};

// Function to validate coordinates
function isValidCoordinate(coord) {
  return typeof coord === 'number' && !isNaN(coord) && coord >= -180 && coord <= 180;
}
