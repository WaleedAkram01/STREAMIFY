import mongoose, { Schema } from "mongoose";
import { User } from "./user.models.js"; // User model ka reference

const subscriptionSchema = new Schema(
  {
    // 1. Subscriber: Woh banda jo channel ko subscribe kar raha hai
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User", // Aapke User model ka naam yahan aayega
    },
    // 2. Channel: Woh banda jisko subscribe kiya ja raha hai (Wohi User model ka ref)
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User", // Yeh bhi ek User hi hai jiska channel hai
    },
  },
  {
    // Image ke mutabiq createdAt aur updatedAt auto-manage karne ke liye
    timestamps: true,
  },
);

// Performance aur security ke liye composite unique index lagana behtar hai
// Taake ek user kisi ek channel ko galti se bhi 2 baar subscribe na kar sake
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
