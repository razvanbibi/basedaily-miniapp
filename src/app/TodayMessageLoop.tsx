import { useEffect, useState } from "react";

type Props = {
  isDarkMode: boolean;
  account: string | null;
};

export default function TodayMessageLoop({ isDarkMode, account }: Props) {
  const slides = [
  {
    duration: 4000,
    title: (
      <>
        Hello{account ? "," : ""}{" "}
        <span
          className={`font-medium ${
            isDarkMode ? "text-sky-200" : "text-slate-900"
          }`}
        >
          {account ? "streaker" : "friend"}
        </span>{" "}
        👋
      </>
    ),
    desc: "Check in every day to grow your streak and earn 0xtxn.",
    small: false,
  },
  {
    duration: 6000,
    title: "Did you know, Your rewards grow faster every day?",
    desc: "Missing one day resets streak — don’t blink 👀",
    small: true,
  },
  {
    duration: 6000,
    title: "Today is a good day to stay loyal",
    desc: "You’re doing better than yesterday 👊",
    small: true,
  },
];


  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const current = slides[index];

    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, current.duration - 300);

    const nextTimer = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setVisible(true);
    }, current.duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(nextTimer);
    };
  }, [index]);

  return (
    <div className="relative h-[38px] overflow-hidden">
      <div
        className={`transition-all duration-300 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}
      >
        {/* TITLE — exact same style as before */}
        <p
  className={`leading-tight ${
    slides[index].small
      ? "text-[11px]"
      : "text-sm"
  } ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}
>
  {slides[index].title}
</p>


        {/* DESCRIPTION — exact same style as before */}
        <p
          className={`text-[11px] truncate ${
            isDarkMode ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {slides[index].desc}
        </p>
      </div>
    </div>
  );
}
