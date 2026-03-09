import dayjs from "dayjs";

const formatDate = (
  x: string | Date,
  format: string = "MMMM DD, YYYY",
  addOffset = false
) => {
  let offset = 0;
  if (addOffset) offset = -dayjs(x).utcOffset();

  return dayjs(x).add(offset, "minutes").format(format);
};

export default formatDate;
