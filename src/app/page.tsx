// app/page.tsx

import Image from "next/image";
import { character1 } from "@/images";
import IceCube from "@/icons/IceCube";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("HomePage");
  return (
    <div className="bg-[#1d2025] flex justify-center items-center h-screen">
      <div className="w-full max-w-xl text-white flex flex-col items-center">
        <div className="w-64 h-64 rounded-full circle-outer p-2 mb-8">
          <div className="w-full h-full rounded-full circle-inner overflow-hidden relative">
            <Image
              priority={false}
              src={character1}
              alt="Character"
              fill
              style={{
                objectFit: "cover",
                objectPosition: "center",
                transform: "scale(1.05) translateY(10%)",
              }}
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl mb-2">
          {t("subTitle")}{" "}
          <Link href="/clicker" className="underline">
            JOK
          </Link>{" "}
          {t("page")}
        </p>
        <p className="text-xl mb-6">
          {t("developedBy")}
          <Link
            href="https://jokinthebox.com/"
            target="_blank"
            className="underline"
          >
            {t("companyName")}
          </Link>
          .
        </p>

        <div className="flex items-center space-x-2">
          <IceCube className="w-8 h-8 animate-pulse" />
          <IceCube className="w-8 h-8 animate-pulse delay-100" />
          <IceCube className="w-8 h-8 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
}
