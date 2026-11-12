import { deliverOnce, paidOrder, type CheckoutSession } from "@/lib/delivery";
import { verifyStripeSignature } from "@/lib/stripe";

export async function POST(request: Request) {
  const payload = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  // Card payments complete immediately; delayed methods (e.g. SEPA) fire async_payment_succeeded later.
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return new Response("ignored");
  }

  const order = paidOrder(event.data.object);
  if (!order) return new Response("not paid or invalid metadata");

  await deliverOnce(order);
  return new Response("ok");
}
