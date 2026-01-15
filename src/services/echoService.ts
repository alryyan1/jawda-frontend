import Echo from "laravel-echo";
import Pusher from "pusher-js";

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: "pusher",
  key: "1cb7dbb1cbb38ad0b078",
  cluster: "ap2",
  forceTLS: true,
  enabledTransports: ["ws", "wss"], // Ensure websocket is used
});

export default echo;
