function TitleBar(): JSX.Element {
  return (
    <div
      className="h-10 flex items-center justify-end px-2 flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        className="flex"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.windowControls.minimize()}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          title="Minimize"
        >
          &#x2500;
        </button>
        <button
          onClick={() => window.windowControls.maximize()}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          title="Maximize"
        >
          &#x25A1;
        </button>
        <button
          onClick={() => window.windowControls.close()}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-red-500 hover:text-white transition-colors"
          title="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  )
}

export default TitleBar
