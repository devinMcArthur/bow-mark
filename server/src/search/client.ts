import MeiliSearch from "meilisearch";

const SearchClient = new MeiliSearch({
  host: process.env.SEARCH_HOST as string || "127.0.0.1",
  apiKey: process.env.SEARCH_API_KEY,
});

export default SearchClient;
