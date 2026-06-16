interface DemoIframeProps {
  demoUrl: string | null;
}

export function DemoIframe({ demoUrl }: DemoIframeProps) {
  if (!demoUrl) {
    return (
      <div className="h-full flex items-center justify-center text-[#AFB2C1]">
        No demo URL provided.
      </div>
    );
  }

  return (
    <div className="h-full p-1">
      <iframe
        src={demoUrl}
        className="w-full h-full rounded-lg bg-[#08061E] border border-[rgba(131,130,141,0.25)]"
        sandbox="allow-scripts allow-same-origin allow-popups"
        title="Demo preview"
      />
    </div>
  );
}
