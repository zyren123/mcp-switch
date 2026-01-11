function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">MCP Switch</h1>
        <p className="text-muted-foreground">
          MCP Server Configuration Manager - Phase 1 Complete
        </p>
        <div className="mt-8 p-4 rounded-lg border bg-card">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Electron + Vite configured
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              React 18 + TypeScript ready
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Tailwind CSS configured
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Project structure created
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
