export const Logo = ({ className }: { className?: string }) => {
  // Simple logo component - using img tag for better performance
  return (
    <div className={className || 'h-10 w-auto relative'}>
      <img
        src="/logo.png"
        alt="PropVestor"
        className="h-full w-auto object-contain"
        loading="eager"
      />
    </div>
  );
};

