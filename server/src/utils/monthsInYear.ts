import dayjs from "dayjs";

const monthsInYear = (date: Date) => {
  const isCurrentYear = dayjs(date).isSame(dayjs(), "year");

  let months: number[] = [];

  if (isCurrentYear) {
    months = [...Array(dayjs().month() + 1).keys()];
  } else {
    months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  return months;
};

export default monthsInYear;
