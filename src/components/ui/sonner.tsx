import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-2xl border border-border/60 bg-background/95 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-md group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground group-[.toaster]:border-border/60",
          description: "group-[.toast]:text-muted-foreground text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground rounded-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground rounded-xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
