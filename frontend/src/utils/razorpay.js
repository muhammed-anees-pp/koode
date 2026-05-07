let razorpayScriptPromise = null;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout(options) {
  const loaded = await loadRazorpayCheckout();
  if (!loaded) throw new Error("Unable to load Razorpay checkout.");

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      ...options,
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
    });
    checkout.open();
  });
}
