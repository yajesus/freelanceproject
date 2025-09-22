import styles from "./SmokeDissolveEffect.module.css";
import Image, { StaticImageData } from "next/image";

const SmokeDissolveEffect = ({
  image,
  position,
}: {
  image: StaticImageData;
  position: string;
}) => {
  return (
    <div
      className={styles.container}
      style={{ position: "absolute", transform: position }}
    >
      <Image
        priority={false}
        src={image}
        alt="Dissolving Effect"
        className={styles.image}
      />
      <div className={styles.smokeContainer}>
        {[...Array(4)].map((_, index) => (
          <div key={index} className={styles.smoke}></div>
        ))}
      </div>
    </div>
  );
};

export default SmokeDissolveEffect;
