export const loadAnimation = async (type: string) => {
    switch (type) {
      case "idle":
        return (await import("../animations/idle.json")).default;
      case "red-red":
        return (await import("../animations/red-red.json")).default;
      case "red-blue":
        return (await import("../animations/red-shield.json")).default;
      case "red-orange":
        return (await import("../animations/red-special.json")).default;
      case "blue-red":
        return (await import("../animations/shield-red.json")).default;
      case "blue-blue":
        return (await import("../animations/shield-shield.json")).default;
      case "blue-orange":
        return (await import("../animations/shield-special.json")).default;
      case "orange-red":
        return (await import("../animations/special-red.json")).default;
      case "orange-blue":
        return (await import("../animations/special-shield.json")).default;
      case "orange-orange":
        return (await import("../animations/special-special.json")).default;
      default:
        return null;
    }
  };
  