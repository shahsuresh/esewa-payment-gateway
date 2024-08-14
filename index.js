import dotenv from "dotenv";
dotenv.config({ path: `./.env` });
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import connectDB from "./database/dbConnection.js";
import Item from "./product/product.model.js";
import PurchasedItem from "./product/purchasedItemModel.js";
import { getEsewaPaymentHash, verifyEsewaPayment } from "./esewa/esewa.js";
import Payment from "./payment/payment.model.js";

const app = express();
app.use(express.json());

//?==============database Connection======================
connectDB();

//?==============register routes==========================
//============Route to add some product in database=======
app.get("/add-item", async (req, res) => {
  let itemData = await Item.create({
    name: "Table Lamp",
    price: 1200,
    inStock: true,
    category: "Electronics",
  });
  return res.status(200).send({
    message: "Item Added ",
    item: itemData,
  });
});
//======Route to initialize esewa payment=================
app.post("/initialize-esewa", async (req, res) => {
  try {
    const { itemId, totalPrice } = req.body;
    // Validate item exists and the price matches
    const itemData = await Item.findOne({
      _id: itemId,
      price: Number(totalPrice),
    });

    if (!itemData) {
      return res.status(400).send({
        success: false,
        message: "Item not found or price mismatch.",
      });
    }

    // Create a record for the purchase
    const purchasedItemData = await PurchasedItem.create({
      item: itemId,
      paymentMethod: "esewa",
      totalPrice: totalPrice,
    });

    // Initiate payment with eSewa
    const paymentInitiate = await getEsewaPaymentHash({
      amount: totalPrice,
      transaction_uuid: purchasedItemData._id,
    });

    // Respond with payment details
    res.json({
      success: true,
      payment: paymentInitiate,
      purchasedItemData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
//=======Route to verify esewa payment==============
app.get("/complete-payment", async (req, res) => {
  const { data } = req.query; // Data received from eSewa's redirect

  try {
    // Verify payment with eSewa
    const paymentInfo = await verifyEsewaPayment(data);

    // Find the purchased item using the transaction UUID
    const purchasedItemData = await PurchasedItem.findById(
      paymentInfo.response.transaction_uuid
    );

    if (!purchasedItemData) {
      return res.status(500).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // Create a new payment record in the database
    const paymentData = await Payment.create({
      pidx: paymentInfo.decodedData.transaction_code,
      transactionId: paymentInfo.decodedData.transaction_code,
      productId: paymentInfo.response.transaction_uuid,
      amount: purchasedItemData.totalPrice,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: "esewa",
      status: "success",
    });

    // Update the purchased item status to 'completed'
    await PurchasedItem.findByIdAndUpdate(
      paymentInfo.response.transaction_uuid,
      { $set: { status: "completed" } }
    );

    // Respond with success message
    res.json({
      success: true,
      message: "Payment successful",
      paymentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred during payment verification",
      error: error.message,
    });
  }
});

//===========================================
app.get("/", function (req, res) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // Define the file path
  // const filePath = path.join(__dirname, "files", "/test.html");
  // Send the file in response
  res.sendFile(__dirname + "/test.html");
});
//?================port and server========================
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is at port:${PORT}`);
});
