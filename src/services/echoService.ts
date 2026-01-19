import Echo from "laravel-echo";
import Pusher from "pusher-js";

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "pusher",
  key: "1cb7dbb1cbb38ad0b078",
  cluster: "ap2",
  forceTLS: true,
  enabledTransports: ["ws", "wss"],
  // Improve connection stability
  activityTimeout: 30000, // Ping every 30 seconds (default 120s)
  pongTimeout: 15000, // Wait 15s for pong
  disableStats: true, // Reduce overhead
});

export default echo;
