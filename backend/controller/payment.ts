import crypto from "crypto";
import { reqUser } from "../types";
import razorpay from "../config/razorpay";
import {
  createPayment,
  getPayment,
  PaymentWithRelations,
  updatePayment,
} from "../services/payment";
import {
  getSentPaymentsByUserId,
  getReceivedPaymentsByStreamerId,
} from "../services/payment";
import { PaymentStatus } from "@prisma/client";
import { RedisService } from "../services/redis";
import sendMail from "./resend";
import { io } from "../index";
import { PaymentSent, PaymentReceived } from "../config/resend/";
import { pushSuperchat } from "../services/firebase";

/*
 *    Creates an order with rate limiting
 *    POST /api/payment/order
 *    Returns: order object or null on error
 */
export const createOrderHandler = async (req: reqUser, res: any) => {
  try {
    // Rate limiting: max 10 orders per minute per user
    const rateLimitAllowed = await RedisService.checkRateLimit(
      req.user.uid,
      "create_order",
      10,
      60
    );

    if (!rateLimitAllowed) {
      return res.status(429).json({
        error: "Too many payment requests. Please wait a moment.",
      });
    }

    // * STEP 1: Get the amount from the request body
    const { amount, message, streamId } = req.body;
    const amountInPaise = amount * 100;

    // * STEP 2: Create the options for the order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `tubepay#${Date.now()}`,
    };

    // * STEP 3: Create the order
    const order = await razorpay.orders.create(options);

    // * STEP 4: Check if the order is created
    if (!order) {
      console.log("Error creating order", order, options);

      return res.status(500).send("Error creating order");
    }

    // * STEP 5: Create the payment
    await createPayment(order.id, amount, message, req.user.uid, streamId);

    // * STEP 6: Send the order to the client
    res.status(200).json(order);
  } catch (err) {
    console.log(err);

    res.status(500).send("Error creating order");
  }
};

/*
 *    Verifies the payments with cache invalidation
 *    POST /api/payment/verify
 *    Returns: success: true or false
 */
export const verifyOrderHandler = async (req: reqUser, res: any) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature === razorpay_signature) {
    // * STEP 1: Get the payment
    const payment = await getPayment(razorpay_order_id);

    console.log(`This is the info ${JSON.stringify(payment)}`)

    if (!payment) {
      console.log(`Payment not found for order id: ${razorpay_order_id}`);
      return res
        .status(404)
        .send({ success: false, message: "Payment not found." });
    }

    // * STEP 2: Update the payment
    await updatePayment(razorpay_order_id, "SUCCESS");

    // * EMIT SUPERCHAT EVENT

    try {
      io.to(`stream_${payment.streamId}`).emit("superchat", {
      username: payment.user.name,
      amount: payment.amount,
      message: payment.message,
      streamId: payment.streamId,
    });
    } catch(error) {
      console.error(`Error sending websocket signal ${error}`)
    }

    // * PUSH SUPERCHAT TO FIREBASE REALTIME DATABASE
    try {
      await pushSuperchat(payment.streamId, {
        username: payment.user.name,
        amount: payment.amount,
        message: payment.message,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("❌ Error pushing superchat to Firebase:", error);
    }

    console.log(
      `Payment verified successfully for payment id: ${razorpay_payment_id}`
    );

    // * STEP 3: Get updated payment with relations for email
    await RedisService.invalidatePaymentCaches(
      razorpay_order_id,
      payment.userId,
      payment.streamId
    );
    const updatedPayment: PaymentWithRelations =
      await getPayment(razorpay_order_id);

    // * STEP 4: Send Status emails to the parties involved.
    try {
      const senderName = updatedPayment.user.name;
      const senderEmail = updatedPayment.user.email;
      const receiverName = updatedPayment.stream.streamer.name;
      const receiverEmail = updatedPayment.stream.streamer.email;
      const amount = updatedPayment.amount;

      // * 1. Sending email to the sender
      try {
        await sendMail({
          to: senderEmail,
          subject: "Successfully Sent Donation" as const,
          html: PaymentSent(senderName, amount, receiverName, "suceess"),
        });
        console.log(`✅ Payment success email sent to sender: ${senderEmail}`);
      } catch (error) {
        console.error("❌ Failed to send email to the sender:", error);
      }

      // * 2. Sending email to reciever

      try {
        await sendMail({
          to: receiverEmail,
          subject: "Successfully Recieved Donation" as const,
          html: PaymentReceived(receiverName, amount, senderName),
        });
        console.log(
          `✅ Payment received email sent to receiver: ${receiverEmail}`
        );
      } catch (error) {
        console.error("❌ Failed to send email to the receiver:", error);
      }
    } catch (err) {
      console.error("Error sending payment emails: ", err);
    }

    return res
      .status(200)
      .send({ success: true, message: "Payment verified successfully!" });
  } else {
    return res
      .status(401)
      .send({ success: false, message: "Payment verification failed." });
  }
};

/*
 *    Gets the sent payments for the user
 *    GET /api/payment/sent
 *    Returns: array of sent payments
 */
export const getSentPaymentsHandler = async (req: reqUser, res: any) => {
  try {
    const { status, page, limit } = req.query;

    const payments = await getSentPaymentsByUserId(
      req.user.uid,
      status as PaymentStatus | undefined,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 10
    );

    return res.status(200).json(payments);
  } catch (err) {
    console.log(err);
 
    return res.status(500).send("Error getting sent payments");
  }
};


/*
 *    Gets the received payments for the streamer
 *    GET /api/payment/received
 *    Returns: array of received payments
 */
export const getReceivedPaymentsHandler = async (req: reqUser, res: any) => {
  try {
    const { status, page, limit } = req.query;

    const payments = await getReceivedPaymentsByStreamerId(
      req.user.uid,
      status as PaymentStatus | undefined,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 10
    );

    return res.status(200).json(payments);
  } catch (err) {
    console.log(err);

    return res.status(500).send("Error getting received payments");
  }
};
