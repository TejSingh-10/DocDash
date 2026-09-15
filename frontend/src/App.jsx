function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <span className="text-6xl">🏥</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">
          Healthcare Management Dashboard
        </h1>

        {/* Subheading */}
        <p className="text-gray-500 text-sm mb-8">
          React + Vite + Tailwind CSS · Frontend is running ✅
        </p>

        {/* Status badges */}
        <div className="flex justify-center gap-3 flex-wrap">
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            React 18
          </span>
          <span className="bg-sky-100 text-sky-700 text-xs font-semibold px-3 py-1 rounded-full">
            Vite 5
          </span>
          <span className="bg-teal-100 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
            Tailwind CSS 3
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
