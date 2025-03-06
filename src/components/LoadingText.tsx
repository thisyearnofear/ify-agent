export const LoadingText = () => {
  const colors = [
    "text-violet-500",
    "text-emerald-500",
    "text-pink-500",
    "text-blue-500",
    "text-yellow-500",
  ];

  return (
    <div className="flex items-center justify-center">
      {Array.from("wowow").map((letter, i) => (
        <span
          key={i}
          className={`inline-block transition-transform ${
            colors[i % colors.length]
          }`}
          style={{
            animationDelay: `${i * 0.1}s`,
            animation: "bounce 0.5s infinite",
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
};
