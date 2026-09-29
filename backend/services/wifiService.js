async function activateWifi(subscription) {
  if ((process.env.WIFI_MODE || "demo") === "demo") {
    console.log(`[DEMO WIFI] Activated ${subscription.username}`);
    return { mode: "demo", activated: true };
  }

  // Replace this section with an authorized MikroTik/RADIUS/Hotspot API integration.
  // Never claim a user is online until the network controller confirms activation.
  throw new Error("WIFI_MODE is not implemented for production yet. Configure your authorized network integration.");
}

module.exports = { activateWifi };
