import SearchIndices from "@constants/SearchIndices";
import { getUserCrews } from "@graphql/helpers/general";
import { SearchClass } from "@graphql/types/search";
import { searchMulti } from "@search";
import { IContext } from "@typescript/graphql";

const search = async (
  searchString: string,
  context: IContext
): Promise<SearchClass[]> => {
  const searchObjects = await searchMulti(
    [
      SearchIndices.Crew,
      SearchIndices.Company,
      SearchIndices.Jobsite,
      SearchIndices.Vehicle,
      SearchIndices.Employee,
      SearchIndices.DailyReport,
    ],
    searchString,
    {
      whitelistedCrews: await getUserCrews(context),
    }
  );

  searchObjects.sort((a, b) => b.score - a.score);

  return searchObjects;
};

export default {
  search,
};
