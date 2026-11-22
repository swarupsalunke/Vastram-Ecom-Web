import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

export class InventoryUnavailableError extends Error {
  constructor(message = "One or more items are no longer available in the requested quantity.") {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

export async function withInventoryTransaction(callback) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => callback(session));
  } finally {
    await session.endSession();
  }
}

export async function decrementOrderInventory(order, session) {
  for (const item of order.items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, isActive: true, sizes: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } } },
      { $inc: { "sizes.$.stock": -item.quantity } },
      { new: true, session }
    );
    if (!updated) throw new InventoryUnavailableError();
  }
}

export async function restoreOrderInventory(order, session) {
  for (const item of order.items) {
    const result = await Product.updateOne(
      { _id: item.product, sizes: { $elemMatch: { size: item.size } } },
      { $inc: { "sizes.$.stock": item.quantity } },
      { session }
    );
    if (result.matchedCount !== 1) throw new Error(`Could not restore stock for ${item.name}.`);
  }
}

export async function expirePendingInventoryReservations() {
  const now = new Date();
  const expiredOrders = await Order.find({
    paymentMethod: "RAZORPAY",
    paymentStatus: "Pending",
    status: "Pending",
    inventoryStatus: "reserved",
    inventoryReservationExpiresAt: { $lte: now }
  }).select("_id").limit(100).lean();

  for (const { _id } of expiredOrders) {
    await withInventoryTransaction(async session => {
      const order = await Order.findOne({
        _id,
        paymentMethod: "RAZORPAY",
        paymentStatus: "Pending",
        status: "Pending",
        inventoryStatus: "reserved",
        inventoryReservationExpiresAt: { $lte: now }
      }).session(session);
      if (!order) return;

      await restoreOrderInventory(order, session);
      order.inventoryStatus = "released";
      order.inventoryReservationExpiresAt = undefined;
      order.paymentStatus = "Failed";
      order.status = "Cancelled";
      order.cancelledAt = now;
      order.cancellationReason = "Payment window expired before payment was completed.";
      await order.save({ session });
    });
  }
}
