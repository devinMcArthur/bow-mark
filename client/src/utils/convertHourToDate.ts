import dayjs from "dayjs";

/**
 * @param {string} time If `hh:mm` convert to full date time based of of `date`
 */
const convertHourToDate = (time: string, date: Date) => {
  // check if time is already a Date
  if (dayjs(time).isValid()) {
    // Take year, month, date from date argument
    let year = dayjs(date).get("year");
    let month = dayjs(date).get("month");
    let dateOfMonth = dayjs(date).date();

    // Take hour and minute from time argument
    let hour = dayjs(time).get("hour");
    let minute = dayjs(time).get("minute");

    return dayjs(date)
      .set("year", year)
      .set("month", month)
      .set("date", dateOfMonth)
      .set("hour", hour)
      .set("minute", minute)
      .toISOString();
  } else {
    // Regular expression for HH:mm format
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    // Check if the time matches the HH:mm format
    if (!regex.test(time)) {
      throw new Error(`Invalid time format: ${time}. Expected HH:mm format.`);
    }

    // split and convert time string to numbers
    let [hour, minute] = time.split(":").map(Number);

    return dayjs(date).set("hour", hour).set("minute", minute).toISOString();
  }
};

export default convertHourToDate;




