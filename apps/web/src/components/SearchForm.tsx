import { useState } from "react";

interface SearchFormProps {
  onSearch: (query: string, searchType: string) => void;
  isSearching: boolean;
}

const SearchForm = ({ onSearch, isSearching }: SearchFormProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("filename");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim(), searchType);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    onSearch("", searchType);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label
              htmlFor="search-query"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search Transcripts
            </label>
            <input
              id="search-query"
              type="text"
              placeholder="Enter search terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-40">
            <label
              htmlFor="search-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search In
            </label>
            <select
              id="search-type"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Fields</option>
              <option value="filename">Filename</option>
              <option value="content">Content</option>
              <option value="summary">Summary</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!searchQuery.trim() || isSearching}
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    ></circle>
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      className="opacity-75"
                    ></path>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-1 inline"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search
                </>
              )}
            </button>

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-800 mb-2">
          💡 Search Tips
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            • <strong>All Fields:</strong> Search across filename, content, and
            summary
          </li>
          <li>
            • <strong>Filename:</strong> Search by original file name
          </li>
          <li>
            • <strong>Content:</strong> Search within transcript text
          </li>
          <li>
            • <strong>Summary:</strong> Search within AI-generated summaries
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SearchForm;
