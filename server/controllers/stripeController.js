const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});
const Challenge = require("../models/challengeModel");
const { fulfillOrder } = require("../fulfillOrder");

const checkOutSession = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.body.challengeId);
    if (!challenge) {
      console.error("Challenge not found", req.body.challengeId);
      return res.status(404).json({ message: "Challenge not found" });
    }

    let promotionCodeApplied;

    if (req.body.coupon) {
      try {
        const { data: promoCodes } = await stripe.promotionCodes.list({
          code: req.body.coupon,
          active: true,
        });

        if (promoCodes.length > 0) {
          const promoCode = promoCodes[0];
          promotionCodeApplied = promoCode.id;
        } else {
          console.log(
            "Promotion code not found or not active:",
            req.body.coupon
          );
          return res
            .status(404)
            .json({ message: "Promotion code not found or not active" });
        }
      } catch (err) {
        console.error("Error retrieving promotion code:", err.message);
        return res.status(400).json({ message: "Invalid promotion code" });
      }
    }

    // Proceed to create a checkout session
    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "HiLife Challenge" },
            unit_amount: challenge.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}paid`,
      cancel_url: `${process.env.CLIENT_URL}`,
      metadata: req.body,
      billing_address_collection: "required",
    };

    if (promotionCodeApplied) {
      sessionConfig.discounts = [{ promotion_code: promotionCodeApplied }];
    }

    // If the promotion code gives a 100% discount, switch to setup mode
    if (promotionCodeApplied && challenge.price === 0) {
      sessionConfig.mode = "setup";
      sessionConfig.setup_intent_data = {
        metadata: req.body,
      };
      // Remove line items for setup mode
      delete sessionConfig.line_items;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("Stripe session created", session.id);
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

module.exports = { checkOutSession };
