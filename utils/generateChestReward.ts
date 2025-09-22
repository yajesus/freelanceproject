export function generateChestReward() {
  const rand = Math.floor(Math.random() * 100);

  if (rand < 55) {
    const multiplier = [1, 2, 3][Math.floor(Math.random() * 3)];
    return { type: "points", result: { multiplier } };
  }

  if (rand < 83) {
    const stars = Math.floor(Math.random() * 9) + 2;
    return { type: "stars", result: { stars } };
  }

  if (rand < 88) {
    return { type: "boost", result: { reward: "12h offline boost" } };
  }

  if (rand < 91) {
    return { type: "boost", result: { reward: "2-day offline boost" } };
  }

  if (rand < 93) {
    return { type: "boost", result: { reward: "12h reward boost" } };
  }

  if (rand < 95) {
    return { type: "boost", result: { reward: "3 mini-friends" } };
  }

  if (rand < 97) {
    return { type: "boost", result: { reward: "5 mini-friends" } };
  }

  if (rand < 98) {
    return { type: "boost", result: { reward: "Premium Avatar" } };
  }

  if (rand < 99) {
    return { type: "boost", result: { reward: "Premium Background" } };
  }

  return { type: "boost", result: { reward: "7-day boost" } };
}
