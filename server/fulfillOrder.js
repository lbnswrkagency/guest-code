const Ticket = require("./models/ticketModel");
const User = require("./models/userModel");
const { sendEmail } = require("./sendEmail");
// const { sendInvoice } = require("./sendInvoice");
const UserChallenge = require("./models/userChallengeModel");
const Challenge = require("./models/challengeModel");

const fulfillOrder = (session, billingAddress, isNoCostOrder) => {
  // Fetch the challenge from the database
  Challenge.findById(session.metadata.challengeId, (err, challenge) => {
    if (err) {
      console.error("Error fetching Challenge:", err);
      return;
    }

    // Find the UserChallenge document and update it if it exists
    UserChallenge.findOneAndUpdate(
      {
        user: session.metadata.userId,
        challenge: session.metadata.challengeId,
      },
      {
        user: session.metadata.userId,
        challenge: session.metadata.challengeId,
        payWall: true,
      },
      { upsert: true, new: true },
      (err, createdOrUpdatedUserChallenge) => {
        if (err) {
          console.error("Error creating or updating UserChallenge:", err);
          return;
        }

        // Update the User document with the new or updated UserChallenge document's ID
        User.findOneAndUpdate(
          { email: session.metadata.email },
          { $addToSet: { challenges: createdOrUpdatedUserChallenge._id } },
          (err, user) => {
            if (err) {
              console.error("Error updating User:", err);
              return;
            }

            // Create a new Ticket document
            Ticket.create(
              {
                email: session.metadata.email,
                item: session.metadata.item,
                firstname: session.metadata.firstname,
                lastname: session.metadata.lastname,
                userId: session.metadata.userId,
                challengeId: session.metadata.challengeId,
                price: session.amount_total / 100, // Stripe amounts are in cents
                challengeName: challenge.name, // Add the challenge name
                billingAddress: billingAddress,
              },
              (err, createdTicket) => {
                if (err) {
                  console.error("Error creating Ticket:", err);
                  return;
                }

                sendEmail(createdTicket, isNoCostOrder);
              }
            );
          }
        );
      }
    );
  });
};

module.exports = {
  fulfillOrder,
};
