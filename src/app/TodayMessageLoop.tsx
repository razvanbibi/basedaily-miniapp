import { useEffect, useState } from "react";
type Props = {
  isDarkMode: boolean;
  account: string | null;
};

export default function TodayMessageLoop({ isDarkMode, account }: Props) {
  const slides = [
    {
      duration: 4000,
      first: (
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
      second: "Check in every day to grow your streak and earn 0xtxn.",
      hero: true,
    },
    {
      duration: 5000,
      first: "Do you know, Your rewards grow faster every day?",
      second: "Missing one day resets streak — don’t blink 👀",
      hero: false,
    },
    {
      duration: 5000,
      first: "Today is a good day to stay loyal",
      second: "You’re doing better than yesterday 👊",
      hero: false,
    },
  ];

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
  const current = slides[index];

  const timer = setTimeout(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setVisible(true);
    }, 300); // fade duration এর সমান
  }, current.duration);

  return () => clearTimeout(timer);
}, [index, slides]);


  const slide = slides[index];

  return (
    <div className="relative h-[38px] overflow-hidden">
      <div
        className={`transition-all duration-300 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}
      >
        {slide.hero ? (
          <>
            {/* FIRST SLIDE — ORIGINAL DESIGN */}
            <p
              className={`text-sm leading-tight ${
                isDarkMode ? "text-slate-200" : "text-slate-900"
              }`}
            >
              {slide.first}
            </p>
            <p
              className={`text-[11px] truncate ${
                isDarkMode ? "text-slate-400" : "text-slate-900"
              }`}
            >
              {slide.second}
            </p>
          </>
        ) : (
          <>
            {/* OTHER SLIDES — NO TITLE, BOTH SMALL */}
            <p
              className={`text-[11px] leading-tight ${
                isDarkMode ? "text-slate-400" : "text-slate-900"
              }`}
            >
              {slide.first}
            </p>
            <p
              className={`text-[11px] truncate ${
                isDarkMode ? "text-slate-400" : "text-slate-900"
              }`}
            >
              {slide.second}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
