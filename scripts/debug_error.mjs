import Stripe from 'stripe';
try {
    const s = new Stripe('sk_test_placeholder');
    console.log("Stripe with sk_test_placeholder OK");
} catch (e) {
    console.log("Stripe with sk_test_placeholder ERROR:", e.message);
}

try {
    const s = new Stripe('');
    console.log("Stripe with empty string OK");
} catch (e) {
    console.log("Stripe with empty string ERROR:", e.message);
}

try {
    const s = new Stripe(undefined);
    console.log("Stripe with undefined OK");
} catch (e) {
    console.log("Stripe with undefined ERROR:", e.message);
}
